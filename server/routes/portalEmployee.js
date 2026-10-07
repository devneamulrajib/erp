const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const { Employee, EmployeeAdvance, LeaveRequest, Attendance } = require('../models/associations');
const { notifyAdmin } = require('../utils/notify');

router.use(portalAuth, requireRole('employee'));
router.use('/salary', require('./portalSalary'));
router.use('/requests', require('./portalEmployeeRequests'));
router.use('/account', require('./portalEmployeeAccount'));

/* ---------- Attendance settings (edit here) ---------- */
const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Dhaka';
const WEEKLY_OFF_DAYS = [5]; // 0=Sun, 1=Mon … 5=Fri, 6=Sat

/* ---------- Date helpers (all YYYY-MM-DD strings) ---------- */
const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
const parseDay = (s) => new Date(`${s}T00:00:00Z`);
const fmtDay = (d) => d.toISOString().slice(0, 10);
const isWeeklyOff = (s) => WEEKLY_OFF_DAYS.includes(parseDay(s).getUTCDay());
const isValidDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDay(s).getTime());

const findApprovedLeave = (employeeId, date) =>
  LeaveRequest.findOne({
    where: {
      employeeId,
      status: 'Approved',
      fromDate: { [Op.lte]: date },
      toDate: { [Op.gte]: date },
    },
  });

const emptyCounts = () => ({ present: 0, absent: 0, leave: 0, holiday: 0, off: 0 });
function bump(counts, status) {
  const key = status.toLowerCase();
  if (key in counts) counts[key] += 1;
}

async function buildDays(employeeId, joiningDate, from, to) {
  const today = todayStr();
  const start = joiningDate && joiningDate > from ? joiningDate : from;
  const end = to > today ? today : to;
  if (start > end) return [];

  const [records, leaves] = await Promise.all([
    Attendance.findAll({
      where: { employeeId, date: { [Op.between]: [start, end] } },
      order: [['id', 'ASC']],
    }),
    LeaveRequest.findAll({
      where: {
        employeeId,
        status: 'Approved',
        fromDate: { [Op.lte]: end },
        toDate: { [Op.gte]: start },
      },
    }),
  ]);

  const byDate = {};
  records.forEach((r) => { byDate[r.date] = r.status; });

  const days = [];
  for (let t = parseDay(start).getTime(); t <= parseDay(end).getTime(); t += 86400000) {
    const date = fmtDay(new Date(t));
    const off = isWeeklyOff(date);
    let status = byDate[date];

    if (status === 'Leave' && off) status = 'Off';
    if (!status) {
      if (off) status = 'Off';
      else if (leaves.some((l) => l.fromDate <= date && date <= l.toDate)) status = 'Leave';
      else if (date < today) status = 'Absent';
      else status = 'Pending';
    }
    days.push({ date, status });
  }
  return days;
}

const joinDay = (e) => (e?.joiningDate ? new Date(e.joiningDate).toISOString().slice(0, 10) : null);

// Next calendar month after "now", as { year, month } — default target
// period for an advance request if the employee leaves it blank.
function nextMonth() {
  const d = new Date();
  const m = d.getMonth() + 2;
  const year = d.getFullYear() + Math.floor((m - 1) / 12);
  const month = ((m - 1) % 12) + 1;
  return { year, month };
}

/* ---------- Profile ---------- */

router.get('/profile', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.portalUser.customerId, {
      attributes: [
        'id', 'name', 'code', 'designation', 'department', 'phone', 'email',
        'joiningDate', 'bankName', 'bankAccountNo', 'status',
      ],
    });
    if (!employee) return res.status(404).json({ message: 'Not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Attendance ---------- */

router.get('/attendance', async (req, res) => {
  try {
    const { month } = req.query;
    const where = { employeeId: req.portalUser.customerId };
    if (month) where.date = { [Op.like]: `${month}%` };
    const records = await Attendance.findAll({ where, order: [['date', 'DESC']] });
    const counts = { Present: 0, Absent: 0, Leave: 0, Holiday: 0 };
    records.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    res.json({ records, counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/attendance/today', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const date = todayStr();
    const weeklyOff = isWeeklyOff(date);
    const record = await Attendance.findOne({ where: { employeeId, date }, order: [['id', 'DESC']] });

    let status = record?.status || null;
    if (!status && !weeklyOff && (await findApprovedLeave(employeeId, date))) status = 'Leave';

    res.json({ date, status, weeklyOff });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/attendance/check-in', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'name'] });
    if (!employee) return res.status(404).json({ message: 'Not found' });

    const date = todayStr();
    if (isWeeklyOff(date)) {
      return res.status(400).json({ message: 'Today is your weekly off day.' });
    }

    const existing = await Attendance.findOne({ where: { employeeId, date }, order: [['id', 'DESC']] });
    if (existing) {
      if (existing.status === 'Present') return res.json({ date, status: 'Present', alreadyMarked: true });
      return res.status(400).json({
        message: `Today is already recorded as ${existing.status}. Contact HR if this is wrong.`,
      });
    }
    if (await findApprovedLeave(employeeId, date)) {
      return res.status(400).json({ message: 'You are on approved leave today.' });
    }

    await Attendance.create({ employeeId, date, status: 'Present', markedBy: `${employee.name} (self)` });
    res.status(201).json({ date, status: 'Present' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/attendance/summary', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const today = todayStr();
    const view = req.query.view === 'year' ? 'year' : 'month';
    const year = parseInt(req.query.year, 10) || Number(today.slice(0, 4));
    if (year < 2000 || year > 2100) return res.status(400).json({ message: 'Invalid year' });

    const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'joiningDate'] });
    if (!employee) return res.status(404).json({ message: 'Not found' });
    const joining = joinDay(employee);

    if (view === 'month') {
      const month = parseInt(req.query.month, 10) || Number(today.slice(5, 7));
      if (month < 1 || month > 12) return res.status(400).json({ message: 'Invalid month' });
      const mm = String(month).padStart(2, '0');
      const lastDay = String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0');

      const days = await buildDays(employeeId, joining, `${year}-${mm}-01`, `${year}-${mm}-${lastDay}`);
      const counts = emptyCounts();
      days.forEach((d) => bump(counts, d.status));
      return res.json({ view, year, month, today, weeklyOffDays: WEEKLY_OFF_DAYS, counts, days });
    }

    const days = await buildDays(employeeId, joining, `${year}-01-01`, `${year}-12-31`);
    const counts = emptyCounts();
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, ...emptyCounts() }));
    days.forEach((d) => {
      bump(counts, d.status);
      bump(months[Number(d.date.slice(5, 7)) - 1], d.status);
    });
    res.json({ view, year, today, weeklyOffDays: WEEKLY_OFF_DAYS, counts, months });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Advance / Loan requests (own) ---------- */

router.get('/advances', async (req, res) => {
  try {
    const advances = await EmployeeAdvance.findAll({
      where: { employeeId: req.portalUser.customerId },
      order: [['createdAt', 'DESC']],
    });
    res.json(advances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/advances', async (req, res) => {
  try {
    const { type, amount, repaymentMonths, reason, targetMonth, targetYear } = req.body;
    if (!amount) return res.status(400).json({ message: 'Amount is required' });

    let tMonth = targetMonth ? Number(targetMonth) : null;
    let tYear = targetYear ? Number(targetYear) : null;
    if (tMonth && (tMonth < 1 || tMonth > 12)) {
      return res.status(400).json({ message: 'Target month must be between 1 and 12' });
    }
    if (!tMonth || !tYear) {
      const def = nextMonth();
      tMonth = def.month;
      tYear = def.year;
    }

    const months = Number(repaymentMonths) || 1;
    const advance = await EmployeeAdvance.create({
      employeeId: req.portalUser.customerId,
      type: type || 'Advance Salary',
      amount: Number(amount),
      requestDate: new Date(),
      repaymentMonths: months,
      monthlyDeduction: Number(amount) / months,
      reason: reason || '',
      targetMonth: tMonth,
      targetYear: tYear,
      status: 'Pending',
    });

    const emp = await Employee.findByPk(req.portalUser.customerId, { attributes: ['name', 'code'] });
    await notifyAdmin(
      'EmployeeAdvanceRequest',
      `${emp?.name} (${emp?.code}) requested ${advance.type}: ৳${Number(advance.amount).toLocaleString()}, starting ${tMonth}/${tYear}`,
      'EmployeeAdvance',
      advance.id,
    );

    res.status(201).json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Leave / day-off requests (own) ---------- */

router.get('/leave-requests', async (req, res) => {
  try {
    const requests = await LeaveRequest.findAll({
      where: { employeeId: req.portalUser.customerId },
      order: [['createdAt', 'DESC']],
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/leave-requests', async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!isValidDateStr(fromDate) || !isValidDateStr(toDate)) {
      return res.status(400).json({ message: 'Valid From date and To date are required' });
    }
    if (toDate < fromDate) {
      return res.status(400).json({ message: 'To date cannot be before From date' });
    }

    const days = Math.round((parseDay(toDate) - parseDay(fromDate)) / 86400000) + 1;

    const request = await LeaveRequest.create({
      employeeId: req.portalUser.customerId,
      fromDate,
      toDate,
      days,
      reason: reason || '',
      status: 'Pending',
    });

    const emp = await Employee.findByPk(req.portalUser.customerId, { attributes: ['name', 'code'] });
    await notifyAdmin(
      'EmployeeLeaveRequest',
      `${emp?.name} (${emp?.code}) requested leave: ${fromDate} to ${toDate} (${days} day${days > 1 ? 's' : ''})`,
      'LeaveRequest',
      request.id,
    );

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;