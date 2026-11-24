// Closes timers left running past the cap, or still running after check-out.
const { Op } = require('sequelize');
const { TaskTimeLog, Attendance } = require('../models/associations');
const { MAX_TIMER_MS, todayStr } = require('./taskTime');

async function sweep() {
  const running = await TaskTimeLog.findAll({ where: { endedAt: null } });
  if (!running.length) return;
  const today = todayStr();
  // One query for today's check-outs of everyone with a running timer
  // (instead of one query per timer). First row per employee, as findOne did.
  const employeeIds = [...new Set(running.map((l) => l.employeeId))];
  const checkOuts = await Attendance.findAll({
    where: { employeeId: employeeIds, date: today, checkOutAt: { [Op.ne]: null } },
    order: [['id', 'ASC']],
  });
  const outByEmployee = new Map();
  for (const a of checkOuts) {
    if (!outByEmployee.has(a.employeeId)) outByEmployee.set(a.employeeId, a);
  }
  for (const log of running) {
    const started = new Date(log.startedAt).getTime();
    const overCap = Date.now() - started > MAX_TIMER_MS;
    let checkedOut = false;
    const out = outByEmployee.get(log.employeeId) || null;
    if (out && new Date(out.checkOutAt).getTime() >= started) checkedOut = true;
    if (overCap || checkedOut) {
      const end = checkedOut ? new Date(out.checkOutAt) : new Date(started + MAX_TIMER_MS);
      log.endedAt = end;
      log.source = 'auto_stopped';
      await log.save();
    }
  }
}

function startTimerSweeper(intervalMs = 5 * 60 * 1000) {
  const run = () => sweep().catch((e) => console.error('Timer sweeper:', e.message));
  run();
  return setInterval(run, intervalMs);
}

module.exports = { startTimerSweeper, sweep };