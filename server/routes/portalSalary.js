// server/routes/portalSalary.js
// Mounted from portalEmployee.js at /salary, so portalAuth + requireRole('employee')
// have already run and req.portalUser is available.
const router = require('express').Router();
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const limiter = require('../utils/attemptLimiter');
const {
  Employee,
  EmployeeAdvance,
  LeaveRequest,
  PaySlip,
  SalaryDeduction,
} = require('../models/associations');
const { grossOf, computeAdvanceDeduction, computeAdjustments } = require('../utils/payroll');
const { buildPaySlipPdf } = require('../utils/payrollPdf');

const UNLOCK_MINUTES = 5;

/* Keep these two in sync with portalEmployee.js */
const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Dhaka';
const WEEKLY_OFF_DAYS = [5]; // 0=Sun … 5=Fri, 6=Sat

const todayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: TIMEZONE });
const parseDay = (s) => new Date(`${s}T00:00:00Z`);

const safeJson = (txt) => {
  try { return txt ? JSON.parse(txt) : []; } catch { return []; }
};

/* ---------- Re-enter password to see amounts ---------- */
router.post('/unlock', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const password = String(req.body.password || '');
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const key = `unlock:${employeeId}`;
    const wait = limiter.check(key);
    if (wait) {
      return res.status(429).json({ message: `Too many wrong attempts. Try again in ${wait} minute${wait === 1 ? '' : 's'}.` });
    }

    const employee = await Employee.unscoped().findByPk(employeeId);
    if (!employee || !employee.portalPassword) return res.status(404).json({ message: 'Account not found' });

    const ok = await bcrypt.compare(password, employee.portalPassword);
    if (!ok) {
      limiter.fail(key);
      return res.status(400).json({ message: 'Incorrect password' });
    }
    limiter.clear(key);

    const unlockToken = jwt.sign(
      { salaryUnlock: true, employeeId },
      process.env.JWT_SECRET,
      { expiresIn: `${UNLOCK_MINUTES}m` },
    );
    res.json({ unlockToken, expiresInSeconds: UNLOCK_MINUTES * 60 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Salary amounts are only served with a valid, recent unlock token.
// Returns 403 (not 401) so the client doesn't treat it as an expired login.
function requireUnlock(req, res, next) {
  const header = req.headers['x-salary-unlock'];
  if (!header) return res.status(403).json({ code: 'LOCKED', message: 'Password required' });
  try {
    const decoded = jwt.verify(header, process.env.JWT_SECRET);
    if (!decoded.salaryUnlock || decoded.employeeId !== req.portalUser.customerId) throw new Error('mismatch');
    next();
  } catch {
    return res.status(403).json({ code: 'LOCKED', message: 'Password required' });
  }
}

/* ---------- Current-month salary summary (amounts) ---------- */
router.get('/summary', requireUnlock, async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const today = todayStr();
    const year = Number(today.slice(0, 4));
    const month = Number(today.slice(5, 7));
    const ym = `${year}-${String(month).padStart(2, '0')}`;
    const monthStart = `${ym}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthEnd = `${ym}-${String(lastDay).padStart(2, '0')}`;

    const employee = await Employee.findByPk(employeeId);
    if (!employee) return res.status(404).json({ message: 'Not found' });

    const slip = await PaySlip.findOne({ where: { employeeId, year, month } });
    const isPaid = slip?.status === 'Paid';

    /* --- Salary figures: actual if paid, otherwise a live estimate --- */
    let advanceDeduction;
    let otherDeduction;
    let otherAddition;
    let breakdown;

    if (isPaid) {
      advanceDeduction = Number(slip.advanceDeduction) || 0;
      otherDeduction = Number(slip.otherDeduction) || 0;
      otherAddition = Number(slip.otherAddition) || 0;
      breakdown = safeJson(slip.advanceBreakdown);
    } else {
      const adv = await computeAdvanceDeduction(employeeId, year, month);
      const adj = await computeAdjustments(employeeId, year, month);
      advanceDeduction = adv.total;
      breakdown = adv.breakdown;
      otherDeduction = adj.deductionTotal;
      otherAddition = adj.additionTotal;
    }

    const src = slip || employee;
    const gross = slip ? Number(slip.grossSalary) || 0 : grossOf(employee);
    const totalDeduction = advanceDeduction + otherDeduction;
    const net = isPaid ? Number(slip.netSalary) || 0 : gross - totalDeduction + otherAddition;

    /* --- Advances / loans relevant to this month --- */
    const dueMap = {};
    breakdown.forEach((b) => { dueMap[b.advanceId] = Number(b.deduct) || 0; });

    const advances = await EmployeeAdvance.findAll({
      where: {
        employeeId,
        [Op.or]: [
          { status: { [Op.in]: ['Pending', 'Approved', 'Disbursed'] } },
          { status: 'Completed', updatedAt: { [Op.gte]: parseDay(monthStart) } },
        ],
      },
      order: [['createdAt', 'DESC']],
    });

    const advanceRows = advances.map((a) => {
      const amount = Number(a.amount) || 0;
      const paidAmount = Number(a.paidAmount) || 0;
      return {
        id: a.id,
        type: a.type,
        status: a.status,
        amount,
        paidAmount,
        remaining: Math.max(0, amount - paidAmount),
        monthlyDeduction: Number(a.monthlyDeduction) || 0,
        repaymentMonths: a.repaymentMonths,
        targetMonth: a.targetMonth,
        targetYear: a.targetYear,
        takenThisMonth: String(a.disbursementDate || a.requestDate || '').slice(0, 7) === ym,
        dueThisMonth: dueMap[a.id] || 0,
      };
    });

    /* --- Day off this month (weekly-off days are not counted) --- */
    const leaves = await LeaveRequest.findAll({
      where: {
        employeeId,
        status: { [Op.in]: ['Approved', 'Pending'] },
        fromDate: { [Op.lte]: monthEnd },
        toDate: { [Op.gte]: monthStart },
      },
      order: [['fromDate', 'ASC']],
    });

    const daysInMonth = (from, to) => {
      const start = from > monthStart ? from : monthStart;
      const end = to < monthEnd ? to : monthEnd;
      let n = 0;
      for (let t = parseDay(start).getTime(); t <= parseDay(end).getTime(); t += 86400000) {
        if (!WEEKLY_OFF_DAYS.includes(new Date(t).getUTCDay())) n += 1;
      }
      return n;
    };

    const leaveRows = leaves.map((l) => ({
      id: l.id,
      fromDate: l.fromDate,
      toDate: l.toDate,
      status: l.status,
      reason: l.reason || '',
      days: daysInMonth(l.fromDate, l.toDate),
    }));
    const approvedLeaveDays = leaveRows
      .filter((l) => l.status === 'Approved')
      .reduce((sum, l) => sum + l.days, 0);

    res.json({
      year,
      month,
      slipStatus: slip ? slip.status : null,
      paidDate: slip?.paidDate || null,
      isEstimate: !isPaid,
      gross,
      basicSalary: Number(src.basicSalary) || 0,
      houseRent: Number(src.houseRent) || 0,
      medicalAllowance: Number(src.medicalAllowance) || 0,
      otherAllowance: Number(src.otherAllowance) || 0,
      advanceDeduction,
      otherDeduction,
      otherAddition,
      totalDeduction,
      net,
      advances: advanceRows,
      leaves: leaveRows,
      approvedLeaveDays,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- 12-month "salary received" tracker (status only, no amounts) ---------- */
router.get('/months', async (req, res) => {
  try {
    const employeeId = req.portalUser.customerId;
    const today = todayStr();
    const currentYear = Number(today.slice(0, 4));
    const currentMonth = Number(today.slice(5, 7));
    const year = parseInt(req.query.year, 10) || currentYear;
    if (year < 2000 || year > 2100) return res.status(400).json({ message: 'Invalid year' });

    const slips = await PaySlip.findAll({
      where: { employeeId, year },
      attributes: ['id', 'month', 'status', 'paidDate'],
    });

    const months = Array.from({ length: 12 }, (_, i) => {
      const s = slips.find((x) => x.month === i + 1);
      return {
        month: i + 1,
        status: s ? s.status : null,
        paidDate: s && s.status === 'Paid' ? s.paidDate : null,
        slipId: s && s.status === 'Paid' ? s.id : null, // drafts are never exposed
      };
    });

    res.json({ year, currentYear, currentMonth, months });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Download own PAID payslip as PDF ---------- */
router.get('/payslips/:id/pdf', async (req, res) => {
  try {
    const slip = await PaySlip.findOne({
      where: { id: req.params.id, employeeId: req.portalUser.customerId },
      include: [{ model: Employee, as: 'employee' }],
    });
    if (!slip) return res.status(404).json({ message: 'Not found' });
    if (slip.status !== 'Paid') {
      return res.status(400).json({ message: 'Payslip is not available until salary is paid' });
    }

    const adjustments = await SalaryDeduction.findAll({
      where: {
        employeeId: slip.employeeId,
        year: slip.year,
        month: slip.month,
        [Op.or]: [{ status: 'Pending' }, { paySlipId: slip.id }],
      },
      order: [['createdAt', 'ASC']],
    });

    const slipData = {
      ...slip.toJSON(),
      standingBreakdown: safeJson(slip.standingBreakdown),
      deductions: adjustments.filter((a) => a.type !== 'Addition'),
      additions: adjustments.filter((a) => a.type === 'Addition'),
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Payslip-${slip.employee?.code || slip.employeeId}-${slip.month}-${slip.year}.pdf"`,
    );
    buildPaySlipPdf(slipData, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;