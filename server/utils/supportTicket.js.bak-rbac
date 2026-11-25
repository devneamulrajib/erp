const { Op } = require('sequelize');
const User = require('../models/User');
const SupportSlaRule = require('../models/SupportSlaRule');
const SupportTicketEvent = require('../models/SupportTicketEvent');
const Notification = require('../models/Notification');
const notify = require('./notify');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

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

const PRIORITIES = ['low', 'medium', 'high', 'critical'];

const CATEGORIES = [
  { key: 'bug', label: 'Bug / Issue' },
  { key: 'difficulty', label: 'Difficulty / Question' },
  { key: 'suggestion', label: 'Suggestion / Improvement' },
  { key: 'other', label: 'Other' },
];
const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

const CATEGORY_FROM_TYPE = {
  bug: 'bug',
  difficulty: 'difficulty',
  suggestion: 'suggestion',
  other: 'other',
};

const TYPE_FROM_CATEGORY = {
  bug: 'bug',
  difficulty: 'difficulty',
  suggestion: 'suggestion',
  other: 'other',
};

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'crm', label: 'CRM / Leads' },
  { key: 'projects', label: 'Projects' },
  { key: 'investors', label: 'Investors' },
  { key: 'hrm', label: 'HRM / Payroll' },
  { key: 'billing', label: 'Billing' },
  { key: 'portal', label: 'Client / Vendor Portal' },
  { key: 'other', label: 'Other' },
];
const MODULE_KEYS = MODULES.map((m) => m.key);

const DONE = ['resolved', 'closed'];
const REOPEN_DAYS = 7;
const DUE_SOON_MINUTES = 120;

const DEFAULT_SLA = {
  low: { firstResponseMins: 1440, resolutionMins: 4320 },
  medium: { firstResponseMins: 480, resolutionMins: 2880 },
  high: { firstResponseMins: 120, resolutionMins: 1440 },
  critical: { firstResponseMins: 30, resolutionMins: 240 },
};

const STAFF_ROLES = new Set(
  (process.env.SUPPORT_STAFF_ROLES || 'superadmin,admin,manager')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

const isStaff = (actor) => {
  if (!actor) return false;
  const roles = [actor.role, ...(actor.secondaryRoles || [])].filter(Boolean).map((r) => String(r).toLowerCase());
  return roles.some((r) => STAFF_ROLES.has(r));
};

const isAdmin = (actor) => {
  if (!actor) return false;
  const roles = [actor.role, ...(actor.secondaryRoles || [])].filter(Boolean).map((r) => String(r).toLowerCase());
  return roles.some((r) => r === 'superadmin' || r === 'admin');
};

const canView = (actor, ticket) => {
  if (!actor || !ticket) return false;
  if (isStaff(actor)) return true;
  return String(ticket.reporterId) === String(actor.id);
};

const loadActor = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  req.actor = {
    id: req.user.id,
    name: req.user.name || req.user.email || 'User',
    email: req.user.email,
    role: req.user.role,
    secondaryRoles: req.user.secondaryRoles || [],
  };
  next();
};

const listPeople = async () => {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'role', 'status'],
    order: [['name', 'ASC']],
  });
  return users.map((u) => ({
    id: String(u.id),
    name: u.name || u.email,
    email: u.email,
    role: u.role,
    isStaff: isStaff(u),
  }));
};

const getSlaRules = async (transaction) => {
  const rules = await SupportSlaRule.findAll({ transaction });
  const map = { ...DEFAULT_SLA };
  rules.forEach((r) => {
    if (r.priority) {
      map[r.priority] = {
        firstResponseMins: Number(r.firstResponseMins) || DEFAULT_SLA[r.priority]?.firstResponseMins,
        resolutionMins: Number(r.resolutionMins) || DEFAULT_SLA[r.priority]?.resolutionMins,
      };
    }
  });
  return map;
};

const dueDates = (baseDate, rule, pausedSeconds = 0) => {
  const base = new Date(baseDate).getTime() + (Number(pausedSeconds) || 0) * 1000;
  const r = rule || DEFAULT_SLA.medium;
  return {
    first: new Date(base + (r.firstResponseMins || 480) * 60000),
    res: new Date(base + (r.resolutionMins || 2880) * 60000),
  };
};

const PRIORITY_RANK = `CASE 
  WHEN severity = 'critical' THEN 1 
  WHEN severity = 'high' THEN 2 
  WHEN severity = 'medium' THEN 3 
  ELSE 4 
END`;

const activeCond = {
  status: { [Op.notIn]: DONE },
  archivedAt: null,
};

const overdueCond = (now = new Date()) => ({
  status: { [Op.notIn]: DONE },
  archivedAt: null,
  resolutionDueAt: { [Op.ne]: null, [Op.lt]: now },
});

const slaInfo = (ticket, now = new Date()) => {
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    if (!ticket.resolutionDueAt || !ticket.resolvedAt) return { state: 'completed', label: 'Resolved' };
    const met = new Date(ticket.resolvedAt) <= new Date(ticket.resolutionDueAt);
    return { state: met ? 'met' : 'breached', label: met ? 'Resolved on time' : 'Resolved late' };
  }
  if (!ticket.resolutionDueAt) return { state: 'none', label: 'No SLA' };
  const diffMin = (new Date(ticket.resolutionDueAt).getTime() - now.getTime()) / 60000;
  if (diffMin < 0) return { state: 'overdue', label: 'Overdue' };
  if (diffMin <= DUE_SOON_MINUTES) return { state: 'due_soon', label: 'Due soon' };
  return { state: 'on_track', label: 'On track' };
};

const decorate = (ticket, now = new Date()) => {
  const json = typeof ticket.toJSON === 'function' ? ticket.toJSON() : { ...ticket };
  json.sla = slaInfo(ticket, now);
  return json;
};

const allowedTransitions = (actor, ticket, now = new Date()) => {
  const staff = isStaff(actor);
  const status = ticket.status;
  const isReporter = String(ticket.reporterId) === String(actor.id);

  if (ticket.archivedAt) return [];

  const transitions = [];
  if (staff) {
    STATUSES.filter((s) => s !== status).forEach((s) => {
      transitions.push({ key: s, label: STATUS_LABEL[s] });
    });
    return transitions;
  }

  // Reporter rules
  if (isReporter) {
    if (status === 'resolved') {
      const closedCutoff = new Date(ticket.resolvedAt || ticket.updatedAt).getTime() + REOPEN_DAYS * 86400000;
      if (now.getTime() <= closedCutoff) {
        transitions.push({ key: 'reopened', label: 'Reopen' });
      }
      transitions.push({ key: 'closed', label: 'Close Ticket' });
    } else if (status !== 'closed') {
      transitions.push({ key: 'closed', label: 'Close Ticket' });
    }
  }
  return transitions;
};

const buildWhere = (actor, query = {}, now = new Date()) => {
  const where = {};
  if (!isStaff(actor)) {
    where.reporterId = String(actor.id);
  } else if (query.reporterId) {
    where.reporterId = String(query.reporterId);
  }

  if (query.archived === '1') {
    where.archivedAt = { [Op.ne]: null };
  } else {
    where.archivedAt = null;
  }

  if (query.status && query.status !== 'all') {
    where.status = query.status;
  }
  if (query.severity && query.severity !== 'all') {
    where.severity = query.severity;
  }
  if (query.category && query.category !== 'all') {
    where.category = query.category;
  }
  if (query.module && query.module !== 'all') {
    where.module = query.module;
  }
  if (query.assignedToId) {
    where.assignedToId = query.assignedToId === 'unassigned' ? null : query.assignedToId;
  }

  if (query.search) {
    const q = `%${String(query.search).trim()}%`;
    where[Op.or] = [
      { ticketNo: { [Op.like]: q } },
      { title: { [Op.like]: q } },
      { reporterName: { [Op.like]: q } },
      { description: { [Op.like]: q } },
    ];
  }

  return where;
};

const buildOrder = (sort = 'createdAt', dir = 'DESC') => {
  const direction = String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  if (sort === 'priority') {
    return [[literal(PRIORITY_RANK), direction], ['createdAt', 'DESC']];
  }
  const allowed = ['id', 'ticketNo', 'title', 'status', 'severity', 'createdAt', 'updatedAt', 'resolutionDueAt'];
  return [[allowed.includes(sort) ? sort : 'createdAt', direction]];
};

const logEvent = async (ticketId, actor, action, details = {}, transaction) => {
  return SupportTicketEvent.create({
    ticketId,
    actorId: actor ? String(actor.id) : null,
    actorName: actor ? actor.name : 'System',
    action,
    details: details.note || details.from ? JSON.stringify(details) : null,
    isInternal: Boolean(details.internal),
  }, { transaction });
};

const resolveReporter = async (reporterId) => {
  const user = await User.findByPk(reporterId, { attributes: ['id', 'name', 'email'] });
  if (!user) throw new HttpError(400, 'Selected reporter does not exist');
  return { id: String(user.id), name: user.name || user.email };
};

const resolveAssignee = async (assigneeId) => {
  if (!assigneeId) return null;
  const user = await User.findByPk(assigneeId, { attributes: ['id', 'name', 'email', 'role'] });
  if (!user) throw new HttpError(400, 'Selected assignee does not exist');
  return { id: String(user.id), name: user.name || user.email };
};

const applyAssign = async (ticket, actor, assigneeId, transaction) => {
  const fromName = ticket.assignedToName || 'Unassigned';
  const assignee = await resolveAssignee(assigneeId);
  const toName = assignee ? assignee.name : 'Unassigned';
  
  await ticket.update({
    assignedToId: assignee ? assignee.id : null,
    assignedToName: assignee ? assignee.name : null,
  }, { transaction });

  await logEvent(ticket.id, actor, 'assigned', { from: fromName, to: toName }, transaction);

  const notices = [];
  if (assignee && String(assignee.id) !== String(actor.id)) {
    notices.push({
      ticket,
      type: 'SupportTicketAssigned',
      message: `${ticket.ticketNo} was assigned to you`,
      to: [{ user: assignee.id }],
      actorId: actor.id,
    });
  }
  return notices;
};

const changeStatus = async (ticket, actor, newStatus, options = {}, transaction) => {
  if (!STATUSES.includes(newStatus)) throw new HttpError(400, 'Invalid status');
  const oldStatus = ticket.status;
  if (oldStatus === newStatus) return [];

  const now = new Date();
  const upd = { status: newStatus, statusChangedAt: now };

  if (newStatus === 'resolved') {
    upd.resolvedAt = now;
  } else if (newStatus === 'reopened') {
    upd.reopenCount = (ticket.reopenCount || 0) + 1;
    upd.resolvedAt = null;
  }

  await ticket.update(upd, { transaction });
  await logEvent(ticket.id, actor, 'status_changed', { from: oldStatus, to: newStatus, note: options.note }, transaction);

  const notices = [];
  if (String(ticket.reporterId) !== String(actor.id)) {
    notices.push({
      ticket,
      type: 'SupportTicketStatus',
      message: `${ticket.ticketNo} status changed to ${STATUS_LABEL[newStatus] || newStatus}`,
      to: [{ user: ticket.reporterId }],
      actorId: actor.id,
    });
  }
  return notices;
};

const applyPriority = async (ticket, actor, newPriority, transaction) => {
  if (!PRIORITIES.includes(newPriority)) throw new HttpError(400, 'Invalid priority');
  const fromPriority = ticket.severity;
  if (fromPriority === newPriority) return [];

  const rule = (await getSlaRules(transaction))[newPriority];
  const due = dueDates(ticket.createdAt, rule, ticket.pausedSeconds);

  await ticket.update({
    severity: newPriority,
    firstResponseDueAt: due.first,
    resolutionDueAt: ticket.slaCustom ? ticket.resolutionDueAt : due.res,
  }, { transaction });

  await logEvent(ticket.id, actor, 'priority_changed', { from: fromPriority, to: newPriority }, transaction);
  return [];
};

const applyArchive = async (ticket, actor, isArchive, note, transaction) => {
  const now = isArchive ? new Date() : null;
  await ticket.update({ archivedAt: now }, { transaction });
  await logEvent(ticket.id, actor, isArchive ? 'archived' : 'restored', { note }, transaction);
  return [];
};

const sendNotices = async (notices = []) => {
  for (const n of notices || []) {
    try {
      if (typeof notify?.sendNotification === 'function') {
        await notify.sendNotification(n);
      }
    } catch (e) {
      console.error('[support notices] notification failed:', e.message);
    }
  }
};

const toCsv = (rows) => {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const val = cell === null || cell === undefined ? '' : String(cell);
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    )
    .join('\r\n');
};

module.exports = {
  HttpError,
  STATUSES,
  STATUS_LABEL,
  PRIORITIES,
  CATEGORIES,
  CATEGORY_KEYS,
  CATEGORY_FROM_TYPE,
  TYPE_FROM_CATEGORY,
  MODULES,
  MODULE_KEYS,
  DONE,
  REOPEN_DAYS,
  DUE_SOON_MINUTES,
  PRIORITY_RANK,
  activeCond,
  overdueCond,
  isStaff,
  isAdmin,
  canView,
  loadActor,
  listPeople,
  getSlaRules,
  dueDates,
  slaInfo,
  decorate,
  allowedTransitions,
  buildWhere,
  buildOrder,
  logEvent,
  resolveReporter,
  resolveAssignee,
  applyAssign,
  changeStatus,
  applyPriority,
  applyArchive,
  sendNotices,
  toCsv,
};