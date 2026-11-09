// In-process SLA monitor. It only runs while the Node server is running (no external scheduler).
// Every 5 minutes it raises ONE "due soon" and ONE "breached" notification per SLA clock per ticket
// (tracked in slaFrAlert / slaResAlert, so there are no duplicates). Set SUPPORT_SLA_MONITOR=off to disable.
const { Op } = require('sequelize');
const SupportTicket = require('../models/SupportTicket');
const { DONE, DUE_SOON_MINUTES, notifyTicket } = require('./supportTicket');

const INTERVAL_MS = 5 * 60 * 1000;

async function raise(ticket, kind, level) {
  const what = kind === 'first_response' ? 'first response' : 'resolution';
  const message =
    level === 2
      ? `SLA breached: ${what} overdue on ${ticket.ticketNo}`
      : `SLA due soon: ${what} for ${ticket.ticketNo} is due within ${DUE_SOON_MINUTES / 60}h`;
  const to = ticket.assignedToId ? [{ user: ticket.assignedToId }] : ['admin'];
  if (level === 2 && ticket.assignedToId) to.push('admin');
  await notifyTicket({ ticket, type: 'SupportTicketSla', message, to });
}

async function sweep() {
  const now = new Date();
  const soon = new Date(now.getTime() + DUE_SOON_MINUTES * 60000);
  const rows = await SupportTicket.findAll({
    where: {
      archivedAt: null,
      status: { [Op.notIn]: [...DONE, 'pending_customer'] },
      [Op.or]: [
        { slaResAlert: { [Op.lt]: 2 }, resolutionDueAt: { [Op.lt]: soon } },
        { firstResponseAt: null, slaFrAlert: { [Op.lt]: 2 }, firstResponseDueAt: { [Op.lt]: soon } },
      ],
    },
    attributes: { exclude: ['screenshot'] },
    limit: 200,
  });
  for (const t of rows) {
    const upd = {};
    if (!t.firstResponseAt && t.firstResponseDueAt) {
      const due = new Date(t.firstResponseDueAt);
      const level = due < now ? 2 : due < soon ? 1 : 0;
      if (level > t.slaFrAlert) { await raise(t, 'first_response', level); upd.slaFrAlert = level; }
    }
    if (t.resolutionDueAt) {
      const due = new Date(t.resolutionDueAt);
      const level = due < now ? 2 : due < soon ? 1 : 0;
      if (level > t.slaResAlert) { await raise(t, 'resolution', level); upd.slaResAlert = level; }
    }
    if (Object.keys(upd).length) await t.update(upd, { silent: true });
  }
  return rows.length;
}

function start() {
  if (String(process.env.SUPPORT_SLA_MONITOR || '').toLowerCase() === 'off') {
    console.log('[support] SLA monitor disabled (SUPPORT_SLA_MONITOR=off)');
    return;
  }
  const run = () => sweep().catch((err) => console.error('[support] SLA sweep failed:', err.message));
  setTimeout(run, 30 * 1000).unref();
  setInterval(run, INTERVAL_MS).unref();
  console.log('[support] SLA monitor running every 5 minutes');
}

module.exports = { start, sweep };