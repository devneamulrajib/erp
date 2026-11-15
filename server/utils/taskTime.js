// Shared time helpers for the Task / Work Log feature.
const { Op } = require('sequelize');

const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Dhaka';
const WORK_HOURS_PER_DAY = Number(process.env.WORK_HOURS_PER_DAY) || 8;
const MAX_TIMER_HOURS = Number(process.env.MAX_TIMER_HOURS) || 10;
const MAX_TIMER_MS = MAX_TIMER_HOURS * 3600000;

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
const isValidDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T00:00:00Z`).getTime());
const shiftDay = (s, n) => new Date(new Date(`${s}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

// Offset (ms) of TIMEZONE from UTC at a given instant.
function tzOffsetMs(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).reduce((a, p) => { a[p.type] = p.value; return a; }, {});
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// [start, end) of a local calendar day as UTC Dates.
function dayBounds(dateStr) {
  const midnightUtc = new Date(`${dateStr}T00:00:00Z`).getTime();
  const start = new Date(midnightUtc - tzOffsetMs(new Date(midnightUtc)));
  const next = shiftDay(dateStr, 1);
  const nextUtc = new Date(`${next}T00:00:00Z`).getTime();
  const end = new Date(nextUtc - tzOffsetMs(new Date(nextUtc)));
  return { start, end };
}

const minutesBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
const truncate = (s, n = 200) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

// Stop every running log for an employee (optionally only for one task).
async function stopRunningLogs(TaskTimeLog, employeeId, { source, transaction, taskId } = {}) {
  const where = { employeeId, endedAt: null };
  if (taskId) where.taskId = taskId;
  const running = await TaskTimeLog.findAll({ where, transaction, lock: transaction ? transaction.LOCK.UPDATE : undefined });
  const now = new Date();
  for (const log of running) {
    const cap = new Date(new Date(log.startedAt).getTime() + MAX_TIMER_MS);
    const end = source === 'auto_stopped' && cap < now ? cap : now;
    log.endedAt = end;
    if (source) log.source = source;
    await log.save({ transaction });
  }
  return running.length;
}

// Worked / idle numbers for one employee on one local day.
async function computeDay(models, employeeId, date) {
  const { Attendance, TaskTimeLog } = models;
  const { start, end } = dayBounds(date);
  const [logs, attRows] = await Promise.all([
    TaskTimeLog.findAll({
      where: { employeeId, startedAt: { [Op.gte]: start, [Op.lt]: end } },
      order: [['startedAt', 'ASC']],
    }),
    Attendance.findAll({ where: { employeeId, date }, order: [['id', 'DESC']] }),
  ]);
  const now = new Date();
  const workedMinutes = logs.reduce((s, l) => s + minutesBetween(l.startedAt, l.endedAt || now), 0);

  const status = attRows[0]?.status || null;
  const checkInAt = attRows.map((r) => r.checkInAt).filter(Boolean).sort((a, b) => a - b)[0] || null;
  const checkOutAt = attRows.map((r) => r.checkOutAt).filter(Boolean).sort((a, b) => b - a)[0] || null;

  let spanMinutes = null;
  let basis = 'none';
  if (status === 'Present') {
    if (checkInAt) {
      const stop = checkOutAt || (date === todayStr() ? now : new Date(new Date(checkInAt).getTime() + WORK_HOURS_PER_DAY * 3600000));
      spanMinutes = minutesBetween(checkInAt, stop);
      basis = 'checkin';
    } else {
      spanMinutes = WORK_HOURS_PER_DAY * 60;
      basis = 'default';
    }
  }
  const idleMinutes = spanMinutes === null ? null : Math.max(0, spanMinutes - workedMinutes);
  return { date, status, checkInAt, checkOutAt, workedMinutes, spanMinutes, idleMinutes, basis, logs };
}

module.exports = {
  TIMEZONE, WORK_HOURS_PER_DAY, MAX_TIMER_MS, todayStr, isValidDateStr, shiftDay,
  dayBounds, minutesBetween, truncate, stopRunningLogs, computeDay,
};