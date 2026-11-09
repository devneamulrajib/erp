// Support Center API  (mounted at /api/support-tickets)
// Access rules (enforced here, never only in the UI):
//   staff     = superadmin / admin / manager (primary OR secondary role; override with SUPPORT_STAFF_ROLES)
//   admin     = superadmin / admin
//   reporter  = anyone else: sees and replies to their OWN tickets only, never internal notes.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');

const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const SupportTicket = require('../models/SupportTicket');
const SupportTicketMessage = require('../models/SupportTicketMessage');
const SupportTicketEvent = require('../models/SupportTicketEvent');
const SupportTicketAttachment = require('../models/SupportTicketAttachment');
const SupportTicketLink = require('../models/SupportTicketLink');
const SupportSlaRule = require('../models/SupportSlaRule');
const S = require('../utils/supportTicket');

/* ------------------------------------------------------------------ uploads */

// Deliberately OUTSIDE server/uploads: index.js serves /uploads publicly, these files must not be public.
const UPLOAD_DIR = path.join(__dirname, '..', 'private-uploads', 'support-tickets');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const EXT_MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.pdf': 'application/pdf', '.txt': 'text/plain', '.log': 'text/plain', '.csv': 'text/csv', '.json': 'application/json',
};
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 40 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (EXT_MIME[ext]) return cb(null, true);
    cb(new Error(`"${file.originalname}" is not allowed. Use: ${Object.keys(EXT_MIME).join(', ')}`));
  },
});

const uploadFiles = (req, res, next) =>
  upload.array('files', MAX_FILES)(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `Each file must be ${MAX_FILE_BYTES / 1048576} MB or smaller.`
      : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `You can attach up to ${MAX_FILES} files at a time.`
      : err.message;
    res.status(400).json({ message });
  });

const removeFiles = (files) => (files || []).forEach((f) => fs.unlink(f.path, () => {}));

// Check the real file content, not just the extension.
function sniffOk(file) {
  const ext = path.extname(file.filename).toLowerCase();
  const fd = fs.openSync(file.path, 'r');
  const buf = Buffer.alloc(4096);
  const n = fs.readSync(fd, buf, 0, 4096, 0);
  fs.closeSync(fd);
  if (n === 0) return false;
  const b = buf.subarray(0, n);
  switch (ext) {
    case '.png': return b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    case '.jpg': case '.jpeg': return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case '.gif': return b.subarray(0, 4).toString('latin1') === 'GIF8';
    case '.webp': return b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
    case '.pdf': return b.subarray(0, 5).toString('latin1') === '%PDF-';
    default: return !b.includes(0); // txt / log / csv / json must be text
  }
}

function validateFiles(files) {
  for (const f of files || []) {
    if (!sniffOk(f)) throw new S.HttpError(400, `"${f.originalname}" is not a valid ${path.extname(f.originalname).toLowerCase()} file.`);
  }
}

async function saveAttachments(files, { ticketId, messageId = null, actor, internal = false, t }) {
  if (!files || !files.length) return [];
  return SupportTicketAttachment.bulkCreate(
    files.map((f) => ({
      ticketId, messageId,
      uploadedById: String(actor.id), uploadedByName: actor.name,
      originalName: path.basename(f.originalname).slice(0, 255),
      storedName: f.filename,
      mimeType: EXT_MIME[path.extname(f.filename).toLowerCase()],
      size: f.size,
      isInternal: internal,
    })),
    { transaction: t }
  );
}

/* ------------------------------------------------------------------ helpers */

// Wraps a handler: HttpError -> its message; anything else -> generic 500 (no stack / internals leaked).
const h = (handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    removeFiles(req.files);
    if (err instanceof S.HttpError) return res.status(err.status).json({ message: err.message });
    console.error('[support]', req.method, req.originalUrl, err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};

const TICKET_ATTRS = { exclude: ['screenshot'], include: [[literal('(screenshot IS NOT NULL)'), 'hasScreenshot']] };

// 404 (not 403) for tickets the caller may not see, so ticket ids cannot be probed.
async function loadTicket(req, res, next) {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({ message: 'Ticket not found' });
    const ticket = await SupportTicket.findByPk(req.params.id, { attributes: TICKET_ATTRS });
    if (!ticket || !S.canView(req.actor, ticket)) return res.status(404).json({ message: 'Ticket not found' });
    req.ticket = ticket;
    next();
  } catch (err) {
    console.error('[support] loadTicket failed:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
}

// Re-reads the ticket with a row lock so concurrent updates cannot overwrite each other.
function withTicket(id, actor, fnc) {
  return sequelize.transaction(async (t) => {
    const ticket = await SupportTicket.findByPk(id, { attributes: { exclude: ['screenshot'] }, transaction: t, lock: t.LOCK.UPDATE });
    if (!ticket || !S.canView(actor, ticket)) throw new S.HttpError(404, 'Ticket not found');
    return fnc(ticket, t);
  });
}

async function buildDetail(ticket, actor) {
  const now = new Date();
  const staff = S.isStaff(actor);
  const isReporter = String(ticket.reporterId) === String(actor.id);
  const id = ticket.id;

  const [messages, events, atts, linkRows] = await Promise.all([
    SupportTicketMessage.findAll({ where: staff ? { ticketId: id } : { ticketId: id, kind: 'reply' }, order: [['createdAt', 'ASC'], ['id', 'ASC']] }),
    SupportTicketEvent.findAll({ where: staff ? { ticketId: id } : { ticketId: id, isInternal: false }, order: [['createdAt', 'ASC'], ['id', 'ASC']] }),
    SupportTicketAttachment.findAll({ where: staff ? { ticketId: id } : { ticketId: id, isInternal: false }, order: [['createdAt', 'ASC']] }),
    SupportTicketLink.findAll({ where: { [Op.or]: [{ ticketId: id }, { relatedTicketId: id }] } }),
  ]);

  const otherIds = linkRows.map((l) => (l.ticketId === id ? l.relatedTicketId : l.ticketId));
  const related = otherIds.length
    ? await SupportTicket.findAll({ where: { id: { [Op.in]: otherIds } }, attributes: ['id', 'ticketNo', 'title', 'status', 'severity', 'reporterId', 'archivedAt'] })
    : [];
  const relById = Object.fromEntries(related.map((r) => [r.id, r]));
  const links = linkRows
    .map((l) => ({ linkId: l.id, other: relById[l.ticketId === id ? l.relatedTicketId : l.ticketId] }))
    .filter((x) => x.other && S.canView(actor, x.other))
    .map((x) => ({ linkId: x.linkId, id: x.other.id, ticketNo: x.other.ticketNo, title: x.other.title, status: x.other.status, severity: x.other.severity }));

  const attachments = atts.map((a) => ({
    id: String(a.id), messageId: a.messageId, originalName: a.originalName, size: a.size, mimeType: a.mimeType,
    isImage: IMAGE_EXT.has(path.extname(a.storedName).toLowerCase()), isInternal: a.isInternal,
    uploadedByName: a.uploadedByName, createdAt: a.createdAt,
  }));
  if (ticket.get('hasScreenshot')) {
    attachments.unshift({ id: 'legacy', messageId: null, originalName: 'Screenshot submitted with the report', size: null, mimeType: 'image', isImage: true, isInternal: false, uploadedByName: ticket.reporterName, createdAt: ticket.createdAt });
  }

  const status = ticket.status;
  const archived = Boolean(ticket.archivedAt);
  return {
    ticket: S.decorate(ticket, now),
    messages: messages.map((m) => m.toJSON()),
    events: events.map((e) => e.toJSON()),
    attachments,
    links,
    transitions: archived ? [] : S.allowedTransitions(actor, ticket, now),
    can: {
      edit: !archived && (staff || (isReporter && !S.DONE.includes(status))),
      editPriority: staff && !archived,
      assign: staff && !archived,
      reply: !archived && status !== 'closed' && (staff || isReporter),
      note: staff && !archived,
      attach: !archived && status !== 'closed' && (staff || isReporter),
      link: staff && !archived,
      archive: S.isAdmin(actor) && !archived,
      restore: S.isAdmin(actor) && archived,
    },
  };
}

const dayStamp = () => new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------------ literal routes (before /:id) */

router.get('/meta', auth, S.loadActor, h(async (req, res) => {
  const actor = req.actor;
  const staff = S.isStaff(actor);
  const people = staff ? await S.listPeople() : [];
  res.json({
    actor: { id: actor.id, name: actor.name, role: actor.role, isStaff: staff, isAdmin: S.isAdmin(actor) },
    statuses: S.STATUSES.map((k) => ({ key: k, label: S.STATUS_LABEL[k] })),
    priorities: S.PRIORITIES,
    categories: S.CATEGORIES,
    modules: S.MODULES,
    people, // possible reporters (staff only)
    agents: people.filter((p) => p.isStaff),
    slaRules: staff ? await S.getSlaRules() : null,
    reopenDays: S.REOPEN_DAYS,
    dueSoonMinutes: S.DUE_SOON_MINUTES,
    attachments: { maxFiles: MAX_FILES, maxBytes: MAX_FILE_BYTES, extensions: Object.keys(EXT_MIME) },
  });
}));

// Legacy endpoint used by the Support modal ("My reports").
router.get('/mine', auth, S.loadActor, h(async (req, res) => {
  const rows = await SupportTicket.findAll({
    where: { reporterId: String(req.actor.id), archivedAt: null },
    attributes: { exclude: ['screenshot'] },
    order: [['createdAt', 'DESC']],
  });
  res.json(rows);
}));

router.get('/summary', auth, S.loadActor, h(async (req, res) => {
  const now = new Date();
  const base = S.buildWhere(req.actor, {}, now); // same visibility rules as the list
  const [grp, unassigned, criticalHigh, overdue, avg, attention] = await Promise.all([
    SupportTicket.findAll({ where: base, attributes: ['status', [fn('COUNT', col('id')), 'n']], group: ['status'], raw: true }),
    SupportTicket.count({ where: { [Op.and]: [base, S.activeCond, { assignedToId: null }] } }),
    SupportTicket.count({ where: { [Op.and]: [base, S.activeCond, { severity: { [Op.in]: ['critical', 'high'] } }] } }),
    SupportTicket.count({ where: { [Op.and]: [base, S.overdueCond(now)] } }),
    SupportTicket.findOne({
      where: base,
      attributes: [
        [fn('AVG', fn('TIMESTAMPDIFF', literal('SECOND'), col('createdAt'), col('firstResponseAt'))), 'fr'],
        [fn('AVG', fn('TIMESTAMPDIFF', literal('SECOND'), col('createdAt'), col('resolvedAt'))), 'res'],
      ],
      raw: true,
    }),
    SupportTicket.findAll({
      where: {
        [Op.and]: [
          base, S.activeCond,
          { [Op.or]: [S.overdueCond(now), { [Op.and]: [{ assignedToId: null }, { severity: { [Op.in]: ['critical', 'high'] } }] }] },
        ],
      },
      attributes: { exclude: ['screenshot'] },
      order: [[literal(S.PRIORITY_RANK), 'ASC'], ['createdAt', 'ASC']],
      limit: 6,
    }),
  ]);
  const byStatus = Object.fromEntries(S.STATUSES.map((s) => [s, 0]));
  grp.forEach((r) => { byStatus[r.status] = Number(r.n); });
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const num = (v) => (v === null || v === undefined ? null : Math.round(Number(v)));
  res.json({
    total,
    open: total - byStatus.resolved - byStatus.closed, // everything not Resolved/Closed
    byStatus,
    unassigned,
    inProgress: byStatus.in_progress,
    criticalHigh,
    overdue,
    resolved: byStatus.resolved,
    avgFirstResponseSeconds: num(avg && avg.fr),
    avgResolutionSeconds: num(avg && avg.res),
    attention: attention.map((r) => S.decorate(r, now)),
  });
}));

router.get('/analytics', auth, S.loadActor, h(async (req, res) => {
  if (!S.isStaff(req.actor)) throw new S.HttpError(403, 'Analytics are available to support staff only');
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400000);
  const tzRaw = process.env.SUPPORT_REPORT_TZ || '+06:00';
  const tz = /^[+-]\d{2}:\d{2}$/.test(tzRaw) ? tzRaw : '+00:00';
  const offMin = (tz[0] === '-' ? -1 : 1) * (Number(tz.slice(1, 3)) * 60 + Number(tz.slice(4, 6)));
  const q = (sql, replacements = {}) => sequelize.query(sql, { replacements: { since, tz, ...replacements }, type: QueryTypes.SELECT });

  const [byStatus, byPriority, byCategory, created, resolved, agents, reopened, sla, avgs, backlog, overdue, unassigned] = await Promise.all([
    q('SELECT status AS k, COUNT(*) AS n FROM support_tickets WHERE archivedAt IS NULL GROUP BY status'),
    q('SELECT severity AS k, COUNT(*) AS n FROM support_tickets WHERE archivedAt IS NULL GROUP BY severity'),
    q('SELECT category AS k, COUNT(*) AS n FROM support_tickets WHERE archivedAt IS NULL GROUP BY category'),
    q("SELECT DATE_FORMAT(CONVERT_TZ(createdAt,'+00:00',:tz),'%Y-%m-%d') AS d, COUNT(*) AS n FROM support_tickets WHERE archivedAt IS NULL AND createdAt >= :since GROUP BY d"),
    q("SELECT DATE_FORMAT(CONVERT_TZ(resolvedAt,'+00:00',:tz),'%Y-%m-%d') AS d, COUNT(*) AS n FROM support_tickets WHERE archivedAt IS NULL AND resolvedAt >= :since GROUP BY d"),
    q(`SELECT assignedToId AS id, MAX(assignedToName) AS name,
         SUM(CASE WHEN status NOT IN ('resolved','closed') THEN 1 ELSE 0 END) AS active,
         SUM(CASE WHEN resolvedAt IS NOT NULL AND resolvedAt >= :since THEN 1 ELSE 0 END) AS resolved
       FROM support_tickets WHERE archivedAt IS NULL AND assignedToId IS NOT NULL
       GROUP BY assignedToId ORDER BY active DESC, resolved DESC`),
    q('SELECT COUNT(*) AS tickets, COALESCE(SUM(reopenCount),0) AS total FROM support_tickets WHERE archivedAt IS NULL AND reopenCount > 0'),
    q(`SELECT
         SUM(CASE WHEN resolvedAt IS NOT NULL AND resolutionDueAt IS NOT NULL THEN 1 ELSE 0 END) AS resTotal,
         SUM(CASE WHEN resolvedAt IS NOT NULL AND resolutionDueAt IS NOT NULL AND resolvedAt <= resolutionDueAt THEN 1 ELSE 0 END) AS resMet,
         SUM(CASE WHEN firstResponseAt IS NOT NULL AND firstResponseDueAt IS NOT NULL THEN 1 ELSE 0 END) AS frTotal,
         SUM(CASE WHEN firstResponseAt IS NOT NULL AND firstResponseDueAt IS NOT NULL AND firstResponseAt <= firstResponseDueAt THEN 1 ELSE 0 END) AS frMet
       FROM support_tickets WHERE archivedAt IS NULL AND createdAt >= :since`),
    q(`SELECT AVG(TIMESTAMPDIFF(SECOND, createdAt, firstResponseAt)) AS fr, AVG(TIMESTAMPDIFF(SECOND, createdAt, resolvedAt)) AS res,
         COUNT(firstResponseAt) AS frN, COUNT(resolvedAt) AS resN
       FROM support_tickets WHERE archivedAt IS NULL AND createdAt >= :since`),
    SupportTicket.count({ where: { archivedAt: null, ...S.activeCond } }),
    SupportTicket.count({ where: { [Op.and]: [{ archivedAt: null }, S.overdueCond(now)] } }),
    SupportTicket.count({ where: { archivedAt: null, assignedToId: null, ...S.activeCond } }),
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
  const cMap = Object.fromEntries(created.map((r) => [r.d, Number(r.n)]));
  const rMap = Object.fromEntries(resolved.map((r) => [r.d, Number(r.n)]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() + offMin * 60000 - i * 86400000).toISOString().slice(0, 10);
    series.push({ date: d, created: cMap[d] || 0, resolved: rMap[d] || 0 });
  }
  const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 1000) / 10 : null);
  const num = (v) => (v === null || v === undefined ? null : Math.round(Number(v)));
  const s = sla[0] || {};
  const a = avgs[0] || {};

  res.json({
    days, timezone: tz,
    snapshot: { byStatus: toMap(byStatus), byPriority: toMap(byPriority), byCategory: toMap(byCategory), backlog, overdue, unassigned },
    series,
    agents: agents.map((r) => ({ id: r.id, name: r.name, active: Number(r.active), resolved: Number(r.resolved) })),
    reopened: { tickets: Number(reopened[0].tickets), total: Number(reopened[0].total) },
    averages: { firstResponseSeconds: num(a.fr), resolutionSeconds: num(a.res), firstResponseSamples: Number(a.frN || 0), resolutionSamples: Number(a.resN || 0) },
    slaCompliance: {
      firstResponse: { met: Number(s.frMet || 0), total: Number(s.frTotal || 0), pct: pct(s.frMet, s.frTotal) },
      resolution: { met: Number(s.resMet || 0), total: Number(s.resTotal || 0), pct: pct(s.resMet, s.resTotal) },
    },
  });
}));

router.get('/export', auth, S.loadActor, h(async (req, res) => {
  const now = new Date();
  const rows = await SupportTicket.findAll({
    where: S.buildWhere(req.actor, req.query, now),
    attributes: { exclude: ['screenshot'] },
    order: S.buildOrder(req.query.sort, req.query.dir),
    limit: 5000,
  });
  const cat = Object.fromEntries(S.CATEGORIES.map((c) => [c.key, c.label]));
  const mod = Object.fromEntries(S.MODULES.map((m) => [m.key, m.label]));
  const iso = (d) => (d ? new Date(d).toISOString() : '');
  const header = ['Ticket', 'Title', 'Reporter', 'Assignee', 'Status', 'Priority', 'Category', 'Module', 'Reference', 'Created (UTC)', 'Updated (UTC)', 'First response (UTC)', 'Resolved (UTC)', 'Resolution due (UTC)', 'SLA'];
  const data = rows.map((r) => [
    r.ticketNo, r.title, r.reporterName, r.assignedToName || 'Unassigned', S.STATUS_LABEL[r.status], r.severity,
    cat[r.category] || r.category, mod[r.module] || '', r.referenceNo || '',
    iso(r.createdAt), iso(r.updatedAt), iso(r.firstResponseAt), iso(r.resolvedAt), iso(r.resolutionDueAt), S.slaInfo(r, now).state,
  ]);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="support-tickets-${dayStamp()}.csv"`);
  res.send(S.toCsv([header, ...data]));
}));

router.get('/sla-rules', auth, S.loadActor, h(async (req, res) => {
  if (!S.isStaff(req.actor)) throw new S.HttpError(403, 'Support staff only');
  res.json(await S.getSlaRules());
}));

router.put('/sla-rules', auth, S.loadActor, h(async (req, res) => {
  if (!S.isAdmin(req.actor)) throw new S.HttpError(403, 'Only administrators can change SLA rules');
  const input = Array.isArray(req.body.rules) ? req.body.rules : [];
  const clean = S.PRIORITIES.map((p) => {
    const r = input.find((x) => x && x.priority === p);
    const first = Number(r && r.firstResponseMins);
    const resol = Number(r && r.resolutionMins);
    if (!Number.isInteger(first) || !Number.isInteger(resol) || first < 1 || resol < 1 || first > 525600 || resol > 525600) {
      throw new S.HttpError(400, `Enter whole minutes (1 to 525600) for ${p} priority`);
    }
    if (resol < first) throw new S.HttpError(400, `Resolution target must not be shorter than the first-response target (${p})`);
    return { priority: p, firstResponseMins: first, resolutionMins: resol };
  });
  await sequelize.transaction(async (t) => {
    for (const r of clean) {
      const existing = await SupportSlaRule.findOne({ where: { priority: r.priority }, transaction: t });
      const vals = { ...r, updatedById: String(req.actor.id), updatedByName: req.actor.name };
      if (existing) await existing.update(vals, { transaction: t });
      else await SupportSlaRule.create(vals, { transaction: t });
    }
  });
  res.json(await S.getSlaRules());
}));

router.post('/bulk', auth, S.loadActor, h(async (req, res) => {
  const actor = req.actor;
  if (!S.isStaff(actor)) throw new S.HttpError(403, 'Only support staff can run bulk actions');
  const { action, value, note } = req.body || {};
  if (!['assign', 'status', 'priority', 'archive'].includes(action)) throw new S.HttpError(400, 'Unknown bulk action');
  if (action === 'archive' && !S.isAdmin(actor)) throw new S.HttpError(403, 'Only administrators can archive tickets');
  const ids = Array.from(new Set((Array.isArray(req.body.ids) ? req.body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0)));
  if (!ids.length) throw new S.HttpError(400, 'Select at least one ticket');
  if (ids.length > 100) throw new S.HttpError(400, 'Select 100 tickets or fewer');

  const results = [];
  for (const id of ids) {
    try {
      const out = await withTicket(id, actor, async (ticket, t) => {
        if (ticket.archivedAt) throw new S.HttpError(409, 'Ticket is archived');
        let notices;
        if (action === 'assign') notices = await S.applyAssign(ticket, actor, value, t);
        else if (action === 'status') notices = await S.changeStatus(ticket, actor, String(value || ''), { note }, t);
        else if (action === 'priority') notices = await S.applyPriority(ticket, actor, String(value || ''), t);
        else notices = await S.applyArchive(ticket, actor, true, note, t);
        return { ticketNo: ticket.ticketNo, notices };
      });
      await S.sendNotices(out.notices);
      results.push({ id, ticketNo: out.ticketNo, ok: true });
    } catch (err) {
      if (!(err instanceof S.HttpError)) console.error('[support] bulk item failed:', id, err);
      results.push({ id, ok: false, error: err instanceof S.HttpError ? err.message : 'Unexpected error' });
    }
  }
  res.json({ results, succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length });
}));

/* ------------------------------------------------------------------ list & create */

router.get('/', auth, S.loadActor, h(async (req, res) => {
  const now = new Date();
  const pageSize = [10, 25, 50, 100].includes(Number(req.query.pageSize)) ? Number(req.query.pageSize) : 25;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const { rows, count } = await SupportTicket.findAndCountAll({
    where: S.buildWhere(req.actor, req.query, now),
    attributes: { exclude: ['screenshot'] },
    order: S.buildOrder(req.query.sort, req.query.dir),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  res.json({ items: rows.map((r) => S.decorate(r, now)), total: count, page, pageSize, totalPages: Math.max(1, Math.ceil(count / pageSize)) });
}));

router.post('/', auth, S.loadActor, uploadFiles, h(async (req, res) => {
  const actor = req.actor;
  const staff = S.isStaff(actor);
  const b = req.body || {};
  validateFiles(req.files);

  const title = String(b.title || '').trim();
  const description = String(b.description || '').trim();
  if (!title || !description) throw new S.HttpError(400, 'Title and description are required');
  if (title.length > 200) throw new S.HttpError(400, 'Title must be 200 characters or fewer');
  if (description.length > 10000) throw new S.HttpError(400, 'Description must be 10,000 characters or fewer');

  const category = S.CATEGORY_KEYS.includes(b.category) ? b.category : S.CATEGORY_FROM_TYPE[b.type] || 'bug';
  const type = S.TYPE_FROM_CATEGORY[category];
  const severity = S.PRIORITIES.includes(b.severity) ? b.severity : 'medium';
  const moduleKey = S.MODULE_KEYS.includes(b.module) ? b.module : null;
  const referenceNo = String(b.referenceNo || '').trim().slice(0, 120) || null;

  // Legacy base64 screenshot (sent by the Support modal)
  let screenshot = null;
  if (b.screenshot) {
    if (typeof b.screenshot !== 'string' || !/^data:image\/(png|jpeg|gif|webp);base64,/.test(b.screenshot)) throw new S.HttpError(400, 'Screenshot must be a PNG, JPG, GIF or WEBP image');
    if (b.screenshot.length > 4 * 1024 * 1024) throw new S.HttpError(400, 'Screenshot is too large (max ~3MB)');
    screenshot = b.screenshot;
  }

  // Reporter / assignee / due date are staff-only. Everyone else always reports as themselves.
  let reporter = { id: String(actor.id), name: actor.name };
  if (staff && b.reporterId && String(b.reporterId) !== String(actor.id)) reporter = await S.resolveReporter(b.reporterId);
  const assignee = staff && b.assignedToId ? await S.resolveAssignee(b.assignedToId) : null;
  let dueAt = null;
  if (staff && b.dueAt) {
    dueAt = new Date(b.dueAt);
    if (Number.isNaN(dueAt.getTime())) throw new S.HttpError(400, 'Invalid due date');
  }

  const dup = await SupportTicket.findOne({
    where: { reporterId: reporter.id, title, createdAt: { [Op.gte]: new Date(Date.now() - 15000) } },
    attributes: ['id', 'ticketNo'],
  });
  if (dup) throw new S.HttpError(409, `This ticket was just submitted (${dup.ticketNo}).`);

  const now = new Date();
  const rule = (await S.getSlaRules())[severity];
  const due = S.dueDates(now, rule);

  const ticket = await sequelize.transaction(async (t) => {
    const created = await SupportTicket.create({
      reporterId: reporter.id, reporterName: reporter.name,
      type, category, severity, status: 'open', title, description,
      module: moduleKey, referenceNo,
      pageUrl: String(b.pageUrl || '').slice(0, 500),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
      screenshot,
      assignedToId: assignee ? assignee.id : null, assignedToName: assignee ? assignee.name : null,
      firstResponseDueAt: due.first, resolutionDueAt: dueAt || due.res, slaCustom: Boolean(dueAt),
      statusChangedAt: now,
    }, { transaction: t });
    await created.update({ ticketNo: `SUP-${String(created.id).padStart(4, '0')}` }, { transaction: t });
    await S.logEvent(created.id, actor, 'created', { note: reporter.id !== String(actor.id) ? `Reported on behalf of ${reporter.name}` : null }, t);
    if (assignee) await S.logEvent(created.id, actor, 'assigned', { from: 'Unassigned', to: assignee.name }, t);
    if (req.files && req.files.length) {
      await saveAttachments(req.files, { ticketId: created.id, actor, t });
      await S.logEvent(created.id, actor, 'attachment_added', { note: `${req.files.length} file(s)` }, t);
    }
    return created;
  });

  const notices = [];
  if (!staff) {
    notices.push({ ticket, type: 'SupportTicketNew', message: `New ticket ${ticket.ticketNo}: ${title}`, to: ['admin', 'manager'], actorId: actor.id });
  }
  if (assignee) notices.push({ ticket, type: 'SupportTicketAssigned', message: `${ticket.ticketNo} was assigned to you`, to: [{ user: assignee.id }], actorId: actor.id });
  await S.sendNotices(notices);

  res.status(201).json({ id: ticket.id, ticketNo: ticket.ticketNo });
}));

/* ------------------------------------------------------------------ single ticket */

router.get('/:id', auth, S.loadActor, loadTicket, h(async (req, res) => {
  res.json(await buildDetail(req.ticket, req.actor));
}));

router.patch('/:id', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  const staff = S.isStaff(actor);
  const t0 = req.ticket;
  const b = req.body || {};
  if (t0.archivedAt) throw new S.HttpError(409, 'Archived tickets cannot be edited');

  if (!staff) {
    if (String(t0.reporterId) !== String(actor.id)) throw new S.HttpError(403, 'You cannot edit this ticket');
    if (S.DONE.includes(t0.status)) throw new S.HttpError(409, 'Reopen the ticket before editing it');
    if ((b.severity !== undefined && b.severity !== t0.severity) || b.dueAt !== undefined) {
      throw new S.HttpError(403, 'Only support staff can change priority or due dates');
    }
  }

  const notices = await withTicket(t0.id, actor, async (ticket, t) => {
    const upd = {};
    const changed = [];

    if (b.title !== undefined) {
      const v = String(b.title).trim();
      if (!v || v.length > 200) throw new S.HttpError(400, 'Title is required (200 characters max)');
      if (v !== ticket.title) { upd.title = v; changed.push('title'); }
    }
    if (b.description !== undefined) {
      const v = String(b.description).trim();
      if (!v || v.length > 10000) throw new S.HttpError(400, 'Description is required (10,000 characters max)');
      if (v !== ticket.description) { upd.description = v; changed.push('description'); }
    }
    if (b.category !== undefined) {
      if (!S.CATEGORY_KEYS.includes(b.category)) throw new S.HttpError(400, 'Invalid category');
      if (b.category !== ticket.category) { upd.category = b.category; upd.type = S.TYPE_FROM_CATEGORY[b.category]; changed.push('category'); }
    }
    if (b.module !== undefined) {
      const v = b.module || null;
      if (v && !S.MODULE_KEYS.includes(v)) throw new S.HttpError(400, 'Invalid module');
      if (v !== ticket.module) { upd.module = v; changed.push('module'); }
    }
    if (b.referenceNo !== undefined) {
      const v = String(b.referenceNo || '').trim().slice(0, 120) || null;
      if (v !== ticket.referenceNo) { upd.referenceNo = v; changed.push('reference'); }
    }

    let out = [];
    if (b.severity !== undefined && b.severity !== ticket.severity) out = await S.applyPriority(ticket, actor, b.severity, t);

    if (b.dueAt !== undefined) {
      if (!staff) throw new S.HttpError(403, 'Only support staff can change due dates');
      if (b.dueAt === null || b.dueAt === '') {
        const rule = (await S.getSlaRules(t))[ticket.severity];
        upd.resolutionDueAt = S.dueDates(ticket.createdAt, rule, ticket.pausedSeconds).res;
        upd.slaCustom = false;
      } else {
        const d = new Date(b.dueAt);
        if (Number.isNaN(d.getTime())) throw new S.HttpError(400, 'Invalid due date');
        upd.resolutionDueAt = d;
        upd.slaCustom = true;
      }
      upd.slaResAlert = 0;
      changed.push('due date');
    }

    if (Object.keys(upd).length) {
      await ticket.update(upd, { transaction: t });
      await S.logEvent(ticket.id, actor, 'edited', { note: `Updated ${changed.join(', ')}` }, t);
    }
    return out;
  });
  await S.sendNotices(notices);
  res.json({ ok: true });
}));

router.post('/:id/status', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  const notices = await withTicket(req.ticket.id, actor, (ticket, t) => {
    if (ticket.archivedAt) throw new S.HttpError(409, 'Archived tickets cannot be changed');
    return S.changeStatus(ticket, actor, String((req.body || {}).status || ''), { note: (req.body || {}).note }, t);
  });
  await S.sendNotices(notices);
  res.json({ ok: true });
}));

router.post('/:id/assign', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  const notices = await withTicket(req.ticket.id, actor, (ticket, t) => {
    if (ticket.archivedAt) throw new S.HttpError(409, 'Archived tickets cannot be changed');
    return S.applyAssign(ticket, actor, (req.body || {}).assigneeId, t);
  });
  await S.sendNotices(notices);
  res.json({ ok: true });
}));

router.post('/:id/archive', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  await withTicket(req.ticket.id, actor, (ticket, t) => S.applyArchive(ticket, actor, true, (req.body || {}).note, t));
  res.json({ ok: true });
}));

router.post('/:id/restore', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  await withTicket(req.ticket.id, actor, (ticket, t) => S.applyArchive(ticket, actor, false, null, t));
  res.json({ ok: true });
}));

/* ---- conversation ---- */

router.post('/:id/messages', auth, S.loadActor, loadTicket, uploadFiles, h(async (req, res) => {
  const actor = req.actor;
  const staff = S.isStaff(actor);
  const t0 = req.ticket;
  const isReporter = String(t0.reporterId) === String(actor.id);
  const kind = (req.body || {}).kind === 'note' ? 'note' : 'reply';
  const body = String((req.body || {}).body || '').trim();

  if (!body) throw new S.HttpError(400, 'Write a message first');
  if (body.length > 10000) throw new S.HttpError(400, 'Message must be 10,000 characters or fewer');
  if (kind === 'note' && !staff) throw new S.HttpError(403, 'Only support staff can add internal notes');
  if (!staff && !isReporter) throw new S.HttpError(403, 'You cannot reply to this ticket');
  if (t0.archivedAt) throw new S.HttpError(409, 'Archived tickets cannot be changed');
  if (kind === 'reply' && t0.status === 'closed') throw new S.HttpError(409, 'This ticket is closed. Reopen it to continue the conversation.');
  validateFiles(req.files);

  const recent = await SupportTicketMessage.findOne({
    where: { ticketId: t0.id, authorId: String(actor.id), kind, body, createdAt: { [Op.gte]: new Date(Date.now() - 10000) } },
  });
  if (recent) throw new S.HttpError(409, 'This message was just sent.');

  const notices = await withTicket(t0.id, actor, async (ticket, t) => {
    const now = new Date();
    const out = [];
    const msg = await SupportTicketMessage.create({ ticketId: ticket.id, authorId: String(actor.id), authorName: actor.name, authorIsStaff: staff, kind, body }, { transaction: t });
    const files = req.files || [];
    await saveAttachments(files, { ticketId: ticket.id, messageId: msg.id, actor, internal: kind === 'note', t });
    const fileNote = files.length ? `${files.length} attachment(s)` : null;

    if (kind === 'reply') {
      const upd = { lastResponseAt: now };
      // first QUALIFYING response = first customer-visible reply from staff who is not the reporter
      if (staff && !isReporter && !ticket.firstResponseAt) upd.firstResponseAt = now;
      await ticket.update(upd, { transaction: t });
      await S.logEvent(ticket.id, actor, 'reply_added', { note: fileNote }, t);
      if (isReporter && ticket.status === 'pending_customer') out.push(...(await S.changeStatus(ticket, actor, 'in_progress', { force: true }, t)));
      out.push({
        ticket, type: 'SupportTicketReply', message: `New reply on ${ticket.ticketNo}`, actorId: actor.id,
        to: isReporter ? (ticket.assignedToId ? [{ user: ticket.assignedToId }] : ['admin']) : [{ user: ticket.reporterId }],
      });
    } else {
      await S.logEvent(ticket.id, actor, 'note_added', { note: fileNote, internal: true }, t);
      out.push({ ticket, type: 'SupportTicketNote', message: `Internal note added on ${ticket.ticketNo}`, to: [{ user: ticket.assignedToId }], actorId: actor.id });
    }
    return out;
  });
  await S.sendNotices(notices);
  res.status(201).json({ ok: true });
}));

/* ---- attachments ---- */

router.post('/:id/attachments', auth, S.loadActor, loadTicket, uploadFiles, h(async (req, res) => {
  const actor = req.actor;
  const staff = S.isStaff(actor);
  const t0 = req.ticket;
  const isReporter = String(t0.reporterId) === String(actor.id);
  if (!staff && !isReporter) throw new S.HttpError(403, 'You cannot add files to this ticket');
  if (t0.archivedAt) throw new S.HttpError(409, 'Archived tickets cannot be changed');
  if (t0.status === 'closed') throw new S.HttpError(409, 'This ticket is closed. Reopen it to add files.');
  if (!req.files || !req.files.length) throw new S.HttpError(400, 'Choose at least one file');
  validateFiles(req.files);
  const internal = staff && String((req.body || {}).internal) === '1';

  await withTicket(t0.id, actor, async (ticket, t) => {
    await saveAttachments(req.files, { ticketId: ticket.id, actor, internal, t });
    await S.logEvent(ticket.id, actor, 'attachment_added', { note: `${req.files.length} file(s)`, internal }, t);
  });
  res.status(201).json({ ok: true });
}));

router.get('/:id/attachments/:attId', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const staff = S.isStaff(req.actor);
  const wantInline = req.query.inline === '1';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; sandbox");

  if (req.params.attId === 'legacy') {
    const row = await SupportTicket.findByPk(req.ticket.id, { attributes: ['id', 'screenshot'] });
    const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec((row && row.screenshot) || '');
    if (!m) throw new S.HttpError(404, 'File not found');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Content-Disposition', `${wantInline ? 'inline' : 'attachment'}; filename="screenshot.${m[1].split('/')[1]}"`);
    return res.send(Buffer.from(m[2], 'base64'));
  }

  if (!/^\d+$/.test(req.params.attId)) throw new S.HttpError(404, 'File not found');
  const att = await SupportTicketAttachment.findOne({ where: { id: req.params.attId, ticketId: req.ticket.id } });
  if (!att || (att.isInternal && !staff)) throw new S.HttpError(404, 'File not found');

  const file = path.join(UPLOAD_DIR, path.basename(att.storedName));
  if (!fs.existsSync(file)) throw new S.HttpError(404, 'The file is missing on the server');
  const ext = path.extname(att.storedName).toLowerCase();
  const inline = wantInline && IMAGE_EXT.has(ext);
  res.setHeader('Content-Type', EXT_MIME[ext] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(att.originalName)}`);
  res.sendFile(file, (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: 'File not found' });
  });
}));

/* ---- related tickets ---- */

router.post('/:id/links', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  if (!S.isStaff(actor)) throw new S.HttpError(403, 'Only support staff can link tickets');
  const no = String((req.body || {}).ticketNo || '').trim().toUpperCase();
  if (!/^SUP-\d{1,8}$/.test(no)) throw new S.HttpError(400, 'Enter a ticket number like SUP-0002');
  const other = await SupportTicket.findOne({ where: { ticketNo: no }, attributes: ['id', 'ticketNo', 'reporterId', 'archivedAt'] });
  if (!other || !S.canView(actor, other)) throw new S.HttpError(404, 'Ticket not found');
  if (other.id === req.ticket.id) throw new S.HttpError(400, 'A ticket cannot be linked to itself');
  const exists = await SupportTicketLink.findOne({
    where: { [Op.or]: [{ ticketId: req.ticket.id, relatedTicketId: other.id }, { ticketId: other.id, relatedTicketId: req.ticket.id }] },
  });
  if (exists) throw new S.HttpError(409, 'These tickets are already linked');
  await sequelize.transaction(async (t) => {
    await SupportTicketLink.create({ ticketId: req.ticket.id, relatedTicketId: other.id, createdById: String(actor.id), createdByName: actor.name }, { transaction: t });
    await S.logEvent(req.ticket.id, actor, 'link_added', { to: other.ticketNo }, t);
    await S.logEvent(other.id, actor, 'link_added', { to: req.ticket.ticketNo }, t);
  });
  res.status(201).json({ ok: true });
}));

router.delete('/:id/links/:linkId', auth, S.loadActor, loadTicket, h(async (req, res) => {
  const actor = req.actor;
  if (!S.isStaff(actor)) throw new S.HttpError(403, 'Only support staff can unlink tickets');
  if (!/^\d+$/.test(req.params.linkId)) throw new S.HttpError(404, 'Link not found');
  const id = req.ticket.id;
  const link = await SupportTicketLink.findOne({
    where: { id: req.params.linkId, [Op.or]: [{ ticketId: id }, { relatedTicketId: id }] },
  });
  if (!link) throw new S.HttpError(404, 'Link not found');
  const otherId = link.ticketId === id ? link.relatedTicketId : link.ticketId;
  const other = await SupportTicket.findByPk(otherId, { attributes: ['id', 'ticketNo'] });
  await sequelize.transaction(async (t) => {
    await link.destroy({ transaction: t });
    await S.logEvent(id, actor, 'link_removed', { to: other ? other.ticketNo : null }, t);
    if (other) await S.logEvent(other.id, actor, 'link_removed', { to: req.ticket.ticketNo }, t);
  });
  res.json({ ok: true });
}));

module.exports = router;