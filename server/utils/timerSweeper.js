// Closes timers left running past the cap, or still running after check-out.
const { Op } = require('sequelize');
const { TaskTimeLog, Attendance } = require('../models/associations');
const { MAX_TIMER_MS, todayStr } = require('./taskTime');

async function sweep() {
  const running = await TaskTimeLog.findAll({ where: { endedAt: null } });
  const today = todayStr();
  for (const log of running) {
    const started = new Date(log.startedAt).getTime();
    const overCap = Date.now() - started > MAX_TIMER_MS;
    let checkedOut = false;
    const out = await Attendance.findOne({
      where: { employeeId: log.employeeId, date: today, checkOutAt: { [Op.ne]: null } },
    });
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