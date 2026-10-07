// server/routes/portalEmployeeRequests.js
// Mounted from portalEmployee.js at /requests, so portalAuth + requireRole('employee')
// have already run and req.portalUser is available.
const router = require('express').Router();
const { Op } = require('sequelize');
const { Employee, EmployeeAdvance, LeaveRequest, Attendance } = require('../models/associations');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const notify = require('../utils/notify');
const notifyAdmin = (...args) =>
  Promise.resolve()
    .then(() => notify.notifyAdmin(...args))
    .catch((e) => console.error('notifyAdmin failed:', e.message));

/* Keep these in sync with portalEmployee.js */
const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Dhaka';
const WEEKLY_OFF_DAYS = [5]; // 0=Sun … 5=Fri, 6=Sat
const MAX_BACKDATE_DAYS = 30;

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
const parseDay = (s) => new Date(`${s}T00:00:00Z`);
const fmtDay = (d) => d.toISOString().slice(0, 10);
const isWeeklyOff = (s) => WEEKLY_OFF_DAYS.includes(parseDay(s).getUTCDay());
const isValidDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDay(s).getTime());

/* ---------- Attendance corrections (own) ---------- */

router.get('/attendance-corrections', async (req, res) => {
  try {
    const rows = await AttendanceCorrection.findAll({
      where: { employeeId: req.portalUser.customerId },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/attendance-corrections', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const { date } = req.body;
    const reason = String(req.body.reason || '').trim();

    if (!isValidDateStr(date)) return res.status(400).json({ message: 'Please choose a valid date' });
    if (reason.length < 5) return res.status(400).json({ message: 'Please explain what happened (at least 5 characters)' });

    const today = todayStr();
    if (date >= today) {
      return res.status(400).json({ message: 'Corrections are for past days only. Use Mark Present for today.' });
    }
    const earliest = fmtDay(new Date(parseDay(today).getTime() - MAX_BACKDATE_DAYS * 86400000));
    if (date < earliest) {
      return res.status(400).json({ message: `Corrections can only be requested for the last ${MAX_BACKDATE_DAYS} days. Please contact HR.` });
    }

    const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'name', 'code', 'joiningDate'] });
    if (!employee) return res.status(404).json({ message: 'Not found' });

    const joining = employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : null;
    if (joining && date < joining) return res.status(400).json({ message: 'That date is before your joining date' });
    if (isWeeklyOff(date)) return res.status(400).json({ message: 'That day is your weekly off day' });

    const record = await Attendance.findOne({ where: { employeeId, date }, order: [['id', 'DESC']] });
    if (record && record.status !== 'Absent') {
      return res.status(400).json({ message: `That day is already recorded as ${record.status}.` });
    }

    const onLeave = await LeaveRequest.findOne({
      where: { employeeId, status: 'Approved', fromDate: { [Op.lte]: date }, toDate: { [Op.gte]: date } },
    });
    if (onLeave) return res.status(400).json({ message: 'You were on approved leave that day.' });

    const duplicate = await AttendanceCorrection.findOne({ where: { employeeId, date, status: 'Pending' } });
    if (duplicate) return res.status(400).json({ message: 'You already have a pending request for that day.' });

    const row = await AttendanceCorrection.create({ employeeId, date, reason, requestedStatus: 'Present' });

    await notifyAdmin(
      'AttendanceCorrectionRequest',
      `${employee.name} (${employee.code}) asked to correct attendance for ${date}: ${reason.slice(0, 80)}`,
      'AttendanceCorrection',
      row.id,
    );

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Cancel own PENDING requests ---------- */

const cancelHandler = (Model) => async (req, res) => {
  try {
    const deleted = await Model.destroy({
      where: { id: req.params.id, employeeId: req.portalUser.customerId, status: 'Pending' },
    });
    if (!deleted) return res.status(400).json({ message: 'Only pending requests can be cancelled' });
    res.json({ cancelled: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.delete('/attendance-corrections/:id', cancelHandler(AttendanceCorrection));
router.delete('/leave/:id', cancelHandler(LeaveRequest));
router.delete('/advances/:id', cancelHandler(EmployeeAdvance));

module.exports = router;