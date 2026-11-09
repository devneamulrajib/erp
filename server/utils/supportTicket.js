// Shared rules for the Support Center: roles, status workflow, SLA, query building,
// status/assignment/priority services, notifications and CSV.
const { Op, literal } = require('sequelize');
const User = require('../models/User');
const Notification = require('../models/Notification');
const SupportSlaRule = require('../models/SupportSlaRule');
const SupportTicketEvent = require('../models/SupportTicketEvent');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* ------------------------------------------------------------------ constants */

const STATUSES = ['open', 'in_progress', 'pending_customer', 'pending_internal', 'resolved', 'closed', 'reopened'];
const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_customer: 'Pending Customer',
  pending_internal: 'Pending Internal Team',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};
const DONE = ['resolved', 'closed'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const CATEGORIES = [
  { key: 'bug', label: 'Bug' },
  { key: 'technical_issue', label: 'Technical Issue' },
  { key: 'access_problem', label: 'Access Problem' },
  { key: 'data_issue', label: 'Data Issue' },
  { key: 'feature_request', label: 'Feature Request' },
  { key: 'general_inquiry', label: 'General Inquiry' },
];
const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);
// Module keys match client/src/components/navConfig.jsx
const MODULES = [
  { key: 'accounts', label: 'Accounting' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'requisition', label: 'Requisition' },
  { key: 'project', label: 'Projects' },
  { key: 'crm', label: 'CRM' },
  { key: 'hrm', label: 'HRM' },
  { key: 'investors', label: 'Investors' },
  { key: 'dashboards', label: 'Dashboards' },
  { key: 'settings', label: 'Settings & Users' },
  { key: 'portal', label: 'Client / Employee Portal' },
  { key: 'other', label: 'Other / Not sure' },
];
const MODULE_KEYS = MODULES.map((m) => m.key);
const TYPE_FROM_CATEGORY = {
  bug: 'bug',
  data_issue: 'bug',
  technical_issue: 'difficulty',
  access_problem: 'difficulty',
  general_inquiry: 'difficulty',
  feature_request: 'suggestion',
};
const CATEGORY_FROM_TYPE = { bug: 'bug', difficulty: 'technical_issue', suggestion: 'feature_request' };

const STAFF_ROLES = (process.env.SUPPORT_STAFF_ROLES || 'superadmin,admin,manager')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ADMIN_ROLES = ['superadmin', 'admin'];
const REOPEN_DAYS = Number(process.env.SUPPORT_REOPEN_DAYS) || 14;
const DUE_SOON_MINUTES = 120;

const DEFAULT_SLA = {
  critical: { firstResponseMins: 60, resolutionMins: 480 },
  high: { firstResponseMins: 240, resolutionMins: 1440 },
  medium: { firstResponseMins: 480, resolutionMins: 4320 },
  low: { firstResponseMins: 1440, resolutionMins: 10080 },
};

/* ------------------------------------------------------------------ actor & roles */

function rolesOf(u) {
  if (!u) return [];
  let secondary = [];
  if (Array.isArray(u.roles)) secondary = u.roles;
  else if (typeof u.roles === 'string') {
    try { secondary = JSON.parse(u.roles); } catch { secondary = []; }
  }
  return Array.from(new Set([u.role, ...secondary].filter(Boolean)));
}
const isStaff = (actor) => rolesOf(actor).some((r) => STAFF_ROLES.includes(r));
const isAdmin = (actor) => rolesOf(actor).some((r) => ADMIN_ROLES.includes(r));

// Express middleware (use after `auth`): resolves the real, active account behind the JWT.
// The JWT only carries { id, role }, so secondary roles and deactivation are read from the DB.
async function loadActor(req, res, next) {
  try {
    if (!req.user || req.user.portal) return res.status(403).json({ message: 'Staff account required' });
    const id = String(req.user.id);
    if (id === 'temp-superadmin') {
      req.actor = { id, name: process.env.SUPERADMIN_NAME || 'Super Admin', role: 'superadmin', roles: [] };
      return next();
    }
    if (!/^\d+$/.test(id)) return res.status(401).json({ message: 'Invalid token' });
    const u = await User.findByPk(id);
    if (!u) return res.status(401).json({ message: 'Account no longer exists' });
    if (u.role !== 'superadmin' && u.isActive === false) {
      return res.status(403).json({ message: 'This account has been deactivated' });
    }
    req.actor = { id: String(u.id), name: u.name || u.email, role: u.role, roles: u.roles };
    next();
  } catch (err) {
    console.error('[support] loadActor failed:', err);
    res.status(500).json({ message: 'Could not verify your account' });
  }
}

/* ------------------------------------------------------------------ workflow */

const STAFF_TRANSITIONS = {
  open: ['in_progress', 'pending_customer', 'pending_internal', 'resolved', 'closed'],
  in_progress: ['open', 'pending_customer', 'pending_internal', 'resolved', 'closed'],
  pending_customer: ['in_progress', 'pending_internal', 'resolved', 'closed'],
  pending_internal: ['in_progress', 'pending_customer', 'resolved', 'closed'],
  reopened: ['in_progress', 'pending_customer', 'pending_internal', 'resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
};

function canReopen(actor, ticket, now = new Date()) {
  if (ticket.status === 'resolved') return true;
  if (ticket.status !== 'closed') return false;
  if (isAdmin(actor)) return true; // admins can always reopen
  const since = ticket.closedAt || ticket.updatedAt;
  return now.getTime() - new Date(since).getTime() <= REOPEN_DAYS * 86400000; // everyone else: within the window
}

function allowedTransitions(actor, ticket, now = new Date()) {
  let list = [];
  if (isStaff(actor)) list = STAFF_TRANSITIONS[ticket.status] || [];
  else if (String(ticket.reporterId) === String(actor.id)) {
    if (ticket.status === 'resolved') list = ['closed', 'reopened'];
    else if (ticket.status === 'closed') list = ['reopened'];
    else list = ['closed'];
  }
  return list.filter((s) => s !== 'reopened' || canReopen(actor, ticket, now));
}

function canView(actor, ticket) {
  if (ticket.archivedAt && !isAdmin(actor)) return false;
  return isStaff(actor) || String(ticket.reporterId) === String(actor.id);
}

/* ------------------------------------------------------------------ SLA */

async function getSlaRules(t) {
  const out = JSON.parse(JSON.stringify(DEFAULT_SLA));
  try {
    const rows = await SupportSlaRule.findAll({ transaction: t });
    rows.forEach((r) => {
      out[r.priority] = { firstResponseMins: r.firstResponseMins, resolutionMins: r.resolutionMins };
    });
  } catch (err) {
    console.error('[support] could not read SLA rules, using defaults:', err.message);
  }
  return out;
}

function dueDates(createdAt, rule, pausedSeconds = 0) {
  const base = new Date(createdAt).getTime() + pausedSeconds * 1000;
  return {
    first: new Date(base + rule.firstResponseMins * 60000),
    res: new Date(base + rule.resolutionMins * 60000),
  };
}

// Pending Customer pauses the clock (due dates move forward by the waiting time on resume).
// Pending Internal Team does NOT pause it. Everything is computed on the server in UTC.
function slaInfo(t, now = new Date()) {
  const active = !DONE.includes(t.status);
  if (!t.resolutionDueAt && !t.firstResponseDueAt) return { state: 'none' };
  if (!active) {
    if (t.resolvedAt && t.resolutionDueAt) {
      const met = new Date(t.resolvedAt) <= new Date(t.resolutionDueAt);
      return { state: met ? 'met' : 'missed', kind: 'resolution', dueAt: t.resolutionDueAt };
    }
    return { state: 'none' };
  }
  if (t.status === 'pending_customer') return { state: 'paused' };
  const frPending = !t.firstResponseAt && t.firstResponseDueAt;
  if (frPending && new Date(t.firstResponseDueAt) < now) return { state: 'breached', kind: 'first_response', dueAt: t.firstResponseDueAt };
  if (t.resolutionDueAt && new Date(t.resolutionDueAt) < now) return { state: 'breached', kind: 'resolution', dueAt: t.resolutionDueAt };
  const kind = frPending ? 'first_response' : 'resolution';
  const dueAt = frPending ? t.firstResponseDueAt : t.resolutionDueAt;
  if (!dueAt) return { state: 'none' };
  const mins = (new Date(dueAt).getTime() - now.getTime()) / 60000;
  return { state: mins <= DUE_SOON_MINUTES ? 'due_soon' : 'ok', kind, dueAt };
}

function decorate(row, now = new Date()) {
  const j = row && typeof row.toJSON === 'function' ? row.toJSON() : { ...row };
  delete j.screenshot;
  j.hasScreenshot = Boolean(j.hasScreenshot);
  j.sla = slaInfo(j, now);
  j.isOverdue = j.sla.state === 'breached';
  const active = !DONE.includes(j.status);
  j.waitingSeconds = active ? Math.max(0, Math.floor((now - new Date(j.lastResponseAt || j.createdAt)) / 1000)) : null;
  j.assignee = j.assignedToId ? { id: j.assignedToId, name: j.assignedToName || `User ${j.assignedToId}` } : null;
  j.reporter = { id: j.reporterId, name: j.reporterName || `User ${j.reporterId}` };
  return j;
}

/* ------------------------------------------------------------------ query building */

const csvList = (v, allowed) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && (!allowed || allowed.includes(s)));

const parseDate = (v, endOfDay = false) => {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(d.getTime()) ? null : d;
};
const likeEscape = (s) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

const activeCond = { status: { [Op.notIn]: DONE } };

// Overdue = active (not resolved/closed/paused) AND (resolution due passed OR first response still missing past its due).
function overdueCond(now) {
  return {
    status: { [Op.notIn]: [...DONE, 'pending_customer'] },
    [Op.or]: [
      { resolutionDueAt: { [Op.lt]: now } },
      { [Op.and]: [{ firstResponseAt: null }, { firstResponseDueAt: { [Op.lt]: now } }] },
    ],
  };
}

// Visibility + filters. EVERY list/summary/export query goes through this one function.
function buildWhere(actor, q = {}, now = new Date()) {
  const and = [];
  const staff = isStaff(actor);
  const me = String(actor.id);
  if (!staff) and.push({ reporterId: me });

  if (q.view === 'archived') {
    and.push(isAdmin(actor) ? { archivedAt: { [Op.ne]: null } } : { id: -1 });
  } else {
    and.push({ archivedAt: null });
  }

  switch (q.view) {
    case 'mine': and.push({ [Op.or]: [{ assignedToId: me }, { reporterId: me }] }); break;
    case 'unassigned': and.push({ assignedToId: null }, activeCond); break;
    case 'open': and.push(activeCond); break;
    case 'in_progress': and.push({ status: 'in_progress' }); break;
    case 'critical': and.push({ severity: 'critical' }, activeCond); break;
    case 'critical_high': and.push({ severity: { [Op.in]: ['critical', 'high'] } }, activeCond); break;
    case 'overdue': and.push(overdueCond(now)); break;
    case 'pending_customer': and.push({ status: 'pending_customer' }); break;
    case 'resolved': and.push({ status: 'resolved' }); break;
    case 'recently_resolved':
      and.push({ status: { [Op.in]: DONE } }, { resolvedAt: { [Op.gte]: new Date(now.getTime() - 7 * 86400000) } });
      break;
    default: break;
  }

  const status = csvList(q.status, STATUSES);
  if (status.length) and.push({ status: { [Op.in]: status } });
  const sev = csvList(q.severity, PRIORITIES);
  if (sev.length) and.push({ severity: { [Op.in]: sev } });
  const cat = csvList(q.category, CATEGORY_KEYS);
  if (cat.length) and.push({ category: { [Op.in]: cat } });
  const mod = csvList(q.module, MODULE_KEYS);
  if (mod.length) and.push({ module: { [Op.in]: mod } });
  if (staff && q.reporterId) and.push({ reporterId: String(q.reporterId).slice(0, 64) });
  if (q.assignedToId) {
    and.push(q.assignedToId === 'none' ? { assignedToId: null } : { assignedToId: String(q.assignedToId).slice(0, 64) });
  }
  if (q.unassigned === '1') and.push({ assignedToId: null }, activeCond);
  if (q.overdue === '1') and.push(overdueCond(now));

  const cf = parseDate(q.createdFrom);
  const ct = parseDate(q.createdTo, true);
  if (cf) and.push({ createdAt: { [Op.gte]: cf } });
  if (ct) and.push({ createdAt: { [Op.lte]: ct } });
  const uf = parseDate(q.updatedFrom);
  const ut = parseDate(q.updatedTo, true);
  if (uf) and.push({ updatedAt: { [Op.gte]: uf } });
  if (ut) and.push({ updatedAt: { [Op.lte]: ut } });

  const text = String(q.q || '').trim().slice(0, 100);
  if (text) {
    const like = `%${likeEscape(text)}%`;
    and.push({
      [Op.or]: ['ticketNo', 'title', 'description', 'reporterName', 'assignedToName', 'referenceNo'].map((c) => ({
        [c]: { [Op.like]: like },
      })),
    });
  }
  return { [Op.and]: and };
}

const PRIORITY_RANK = "FIELD(severity,'critical','high','medium','low')";

function buildOrder(sort, dir) {
  const d = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  switch (sort) {
    case 'updated': return [['updatedAt', d], ['id', d]];
    case 'priority': return [[literal(PRIORITY_RANK), d === 'DESC' ? 'ASC' : 'DESC'], ['createdAt', 'DESC']]; // desc = most urgent first
    case 'sla': return [[literal('resolutionDueAt IS NULL'), 'ASC'], ['resolutionDueAt', d]]; // asc = soonest due first
    case 'waiting': return [[literal('COALESCE(lastResponseAt, createdAt)'), d === 'DESC' ? 'ASC' : 'DESC']]; // desc = waiting longest first
    default: return [['createdAt', d], ['id', d]];
  }
}

/* ------------------------------------------------------------------ events & notifications */

function logEvent(ticketId, actor, type, { from = null, to = null, note = null, internal = false } = {}, t) {
  return SupportTicketEvent.create(
    {
      ticketId,
      type,
      actorId: actor ? String(actor.id) : null,
      actorName: actor ? actor.name : 'System',
      fromValue: from,
      toValue: to,
      note,
      isInternal: internal,
    },
    { transaction: t }
  );
}

// to: 'admin' | 'manager' | { user: id }. Non-numeric ids (the .env superadmin) can only be reached
// through the 'admin' audience. Never include private note text in `message`.
async function notifyTicket({ ticket, type, message, to = [], actorId }) {
  const seen = new Set();
  const text = String(message).slice(0, 250);
  for (const r of to) {
    let audience;
    let audienceId = null;
    if (r === 'admin' || r === 'manager') audience = r;
    else if (r && r.user != null) {
      const id = String(r.user);
      if (!/^\d+$/.test(id) || id === String(actorId)) continue;
      audience = 'user';
      audienceId = Number(id);
    } else continue;
    const key = `${audience}:${audienceId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const dup = await Notification.findOne({
        where: {
          type, relatedType: 'SupportTicket', relatedId: ticket.id, audience, audienceId,
          read: false, message: text, createdAt: { [Op.gte]: new Date(Date.now() - 120000) },
        },
      });
      if (dup) continue;
      await Notification.create({ type, message: text, relatedType: 'SupportTicket', relatedId: ticket.id, audience, audienceId });
    } catch (err) {
      console.error('[support] notification failed:', err.message);
    }
  }
}

const sendNotices = async (notices = []) => {
  for (const n of notices) await notifyTicket(n);
};

/* ------------------------------------------------------------------ assignee lookup */

function isStaffUser(u) {
  return rolesOf(u).some((r) => STAFF_ROLES.includes(r));
}

// Everyone who can be a reporter / assignee. The .env superadmin logs in as 'temp-superadmin', so the
// matching DB row (same email) is hidden to avoid a duplicate "Super Admin".
async function listPeople() {
  const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role', 'roles', 'isActive'], order: [['name', 'ASC']] });
  const superEmail = String(process.env.SUPERADMIN_EMAIL || '').toLowerCase();
  const people = users
    .filter((u) => u.isActive !== false && !(superEmail && String(u.email).toLowerCase() === superEmail))
    .map((u) => ({ id: String(u.id), name: u.name || u.email, role: u.role, isStaff: isStaffUser(u) }));
  if (superEmail) {
    people.unshift({ id: 'temp-superadmin', name: process.env.SUPERADMIN_NAME || 'Super Admin', role: 'superadmin', isStaff: true });
  }
  return people;
}

async function resolveAssignee(id) {
  if (id === null || id === undefined || id === '' || id === 'none') return null;
  const sid = String(id);
  if (sid === 'temp-superadmin') {
    if (!process.env.SUPERADMIN_EMAIL) throw new HttpError(400, 'Assignee not found');
    return { id: sid, name: process.env.SUPERADMIN_NAME || 'Super Admin' };
  }
  if (!/^\d+$/.test(sid)) throw new HttpError(400, 'Invalid assignee');
  const u = await User.findByPk(sid);
  if (!u) throw new HttpError(400, 'Assignee not found');
  if (u.role !== 'superadmin' && u.isActive === false) throw new HttpError(400, 'Assignee is deactivated');
  if (!isStaffUser(u)) throw new HttpError(400, 'This user is not authorised to handle tickets');
  return { id: String(u.id), name: u.name || u.email };
}

async function resolveReporter(id) {
  const sid = String(id);
  if (sid === 'temp-superadmin') return { id: sid, name: process.env.SUPERADMIN_NAME || 'Super Admin' };
  if (!/^\d+$/.test(sid)) throw new HttpError(400, 'Invalid reporter');
  const u = await User.findByPk(sid);
  if (!u || (u.role !== 'superadmin' && u.isActive === false)) throw new HttpError(400, 'Reporter not found or deactivated');
  return { id: String(u.id), name: u.name || u.email };
}

/* ------------------------------------------------------------------ services (run inside a transaction) */

async function changeStatus(ticket, actor, to, { note, force = false } = {}, t) {
  const now = new Date();
  const from = ticket.status;
  if (!STATUSES.includes(to)) throw new HttpError(400, 'Invalid status');
  if (from === to) throw new HttpError(409, `Ticket is already ${STATUS_LABEL[to]}`);
  if (!force && !allowedTransitions(actor, ticket, now).includes(to)) {
    throw new HttpError(isStaff(actor) ? 409 : 403, `You cannot move this ticket from ${STATUS_LABEL[from]} to ${STATUS_LABEL[to]}`);
  }
  const cleanNote = note ? String(note).trim().slice(0, 2000) : '';
  if (to === 'resolved' && cleanNote.length < 3) throw new HttpError(400, 'A resolution summary is required to resolve a ticket');

  const upd = { status: to, statusChangedAt: now };

  // leaving Pending Customer: resume the SLA clock by moving due dates forward by the time spent waiting
  if (from === 'pending_customer') {
    const elapsed = ticket.pausedSince ? Math.max(0, Math.floor((now - new Date(ticket.pausedSince)) / 1000)) : 0;
    upd.pausedSeconds = (ticket.pausedSeconds || 0) + elapsed;
    upd.pausedSince = null;
    if (elapsed > 0) {
      if (ticket.firstResponseDueAt) upd.firstResponseDueAt = new Date(new Date(ticket.firstResponseDueAt).getTime() + elapsed * 1000);
      if (ticket.resolutionDueAt) upd.resolutionDueAt = new Date(new Date(ticket.resolutionDueAt).getTime() + elapsed * 1000);
      upd.slaFrAlert = 0;
      upd.slaResAlert = 0;
    }
  }
  if (to === 'pending_customer') upd.pausedSince = now;

  if (to === 'resolved') {
    upd.resolvedAt = now;
    upd.resolvedById = String(actor.id);
    upd.resolutionNote = cleanNote;
  }
  if (to === 'closed') upd.closedAt = now;
  if (to === 'reopened') {
    // Reopening starts a fresh resolution window from now, using the current rule for the priority.
    const rule = (await getSlaRules(t))[ticket.severity] || DEFAULT_SLA.medium;
    upd.reopenCount = (ticket.reopenCount || 0) + 1;
    upd.resolvedAt = null;
    upd.resolvedById = null;
    upd.closedAt = null;
    upd.slaCustom = false;
    upd.resolutionDueAt = new Date(now.getTime() + rule.resolutionMins * 60000);
    upd.slaResAlert = 0;
  }

  await ticket.update(upd, { transaction: t });
  await logEvent(ticket.id, actor, 'status_changed', { from: STATUS_LABEL[from], to: STATUS_LABEL[to], note: cleanNote || null }, t);

  const notices = [{
    ticket, type: 'SupportTicketStatus',
    message: `${ticket.ticketNo}: status changed to ${STATUS_LABEL[to]}`,
    to: [{ user: ticket.reporterId }, { user: ticket.assignedToId }],
    actorId: actor.id,
  }];
  if (to === 'reopened' && !ticket.assignedToId) {
    notices.push({ ticket, type: 'SupportTicketStatus', message: `${ticket.ticketNo} was reopened and is unassigned`, to: ['admin'], actorId: actor.id });
  }
  return notices;
}

async function applyPriority(ticket, actor, to, t) {
  if (!isStaff(actor)) throw new HttpError(403, 'Only support staff can change priority');
  if (!PRIORITIES.includes(to)) throw new HttpError(400, 'Invalid priority');
  const from = ticket.severity;
  if (from === to) throw new HttpError(409, `Priority is already ${to}`);
  const rules = await getSlaRules(t);
  const upd = { severity: to };
  if (!ticket.slaCustom) {
    // shift the due dates by the difference between the two rules
    const dRes = (rules[to].resolutionMins - rules[from].resolutionMins) * 60000;
    const dFr = (rules[to].firstResponseMins - rules[from].firstResponseMins) * 60000;
    if (ticket.resolutionDueAt) upd.resolutionDueAt = new Date(new Date(ticket.resolutionDueAt).getTime() + dRes);
    if (ticket.firstResponseDueAt && !ticket.firstResponseAt) upd.firstResponseDueAt = new Date(new Date(ticket.firstResponseDueAt).getTime() + dFr);
    upd.slaFrAlert = 0;
    upd.slaResAlert = 0;
  }
  await ticket.update(upd, { transaction: t });
  await logEvent(ticket.id, actor, 'priority_changed', { from, to }, t);
  return [{
    ticket, type: 'SupportTicketPriority',
    message: `${ticket.ticketNo}: priority changed from ${from} to ${to}`,
    to: [{ user: ticket.reporterId }, { user: ticket.assignedToId }],
    actorId: actor.id,
  }];
}

async function applyAssign(ticket, actor, assigneeId, t) {
  if (!isStaff(actor)) throw new HttpError(403, 'Only support staff can assign tickets');
  const next = await resolveAssignee(assigneeId);
  const prevId = ticket.assignedToId || null;
  if ((next ? next.id : null) === prevId) throw new HttpError(409, next ? 'Ticket is already assigned to this person' : 'Ticket is already unassigned');
  const prevName = ticket.assignedToName || (prevId ? `User ${prevId}` : 'Unassigned');
  await ticket.update({ assignedToId: next ? next.id : null, assignedToName: next ? next.name : null }, { transaction: t });
  await logEvent(ticket.id, actor, 'assigned', { from: prevId ? prevName : 'Unassigned', to: next ? next.name : 'Unassigned' }, t);
  if (!next) return [];
  return [
    { ticket, type: 'SupportTicketAssigned', message: `${ticket.ticketNo} was assigned to you`, to: [{ user: next.id }], actorId: actor.id },
    { ticket, type: 'SupportTicketAssigned', message: `${ticket.ticketNo} is now handled by ${next.name}`, to: [{ user: ticket.reporterId }], actorId: actor.id },
  ];
}

async function applyArchive(ticket, actor, archive, note, t) {
  if (!isAdmin(actor)) throw new HttpError(403, 'Only administrators can archive tickets');
  if (archive && ticket.archivedAt) throw new HttpError(409, 'Ticket is already archived');
  if (!archive && !ticket.archivedAt) throw new HttpError(409, 'Ticket is not archived');
  await ticket.update(
    archive ? { archivedAt: new Date(), archivedById: String(actor.id) } : { archivedAt: null, archivedById: null },
    { transaction: t }
  );
  await logEvent(ticket.id, actor, archive ? 'archived' : 'restored', { note: note ? String(note).slice(0, 500) : null }, t);
  return [];
}

/* ------------------------------------------------------------------ CSV */

function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const toCsv = (rows) => `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;

module.exports = {
  HttpError, STATUSES, STATUS_LABEL, DONE, PRIORITIES, CATEGORIES, CATEGORY_KEYS, MODULES, MODULE_KEYS,
  TYPE_FROM_CATEGORY, CATEGORY_FROM_TYPE, STAFF_ROLES, REOPEN_DAYS, DUE_SOON_MINUTES, DEFAULT_SLA,
  rolesOf, isStaff, isAdmin, isStaffUser, loadActor, allowedTransitions, canReopen, canView,
  getSlaRules, dueDates, slaInfo, decorate, buildWhere, buildOrder, activeCond, overdueCond, PRIORITY_RANK,
  logEvent, notifyTicket, sendNotices, listPeople, resolveAssignee, resolveReporter,
  changeStatus, applyPriority, applyAssign, applyArchive, toCsv,
};