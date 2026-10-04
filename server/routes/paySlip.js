const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { notifyEmployee } = require('../utils/notify');
const {
  grossOf, computeAdvanceDeduction, computeAdjustments, buildSlipData, syncDraftPaySlip,
} = require('../utils/payroll');
const {
  Employee, EmployeeAdvance, PaySlip, SalaryDeduction,
  Voucher, VoucherEntry, ChartOfAccount,
} = require('../models/associations');

async function generateVoucherNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fullPrefix = `SAL${yy}${mm}${dd}`;
  const count = await Voucher.count({ where: { voucherNo: { [Op.like]: `${fullPrefix}%` } } });
  return `${fullPrefix}-${String(count + 1).padStart(4, '0')}`;
}

async function resolveAccountId(name) {
  if (!name) return null;
  const acc = await ChartOfAccount.findOne({ where: { name } });
  return acc ? acc.id : null;
}

/* ---------------- Preview (no DB writes) ---------------- */

router.get('/preview', auth, async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) return res.status(400).json({ message: 'year and month are required' });

    const employees = await Employee.findAll({ where: { status: 'Active' }, order: [['name', 'ASC']] });

    const rows = [];
    for (const emp of employees) {
      const gross = grossOf(emp);
      const { total: advanceDeduction, breakdown } = await computeAdvanceDeduction(emp.id);
      const { deductionTotal, additionTotal, deductionRows, additionRows } = await computeAdjustments(emp.id, year, month);
      const totalDeduction = advanceDeduction + deductionTotal;

      rows.push({
        employeeId: emp.id,
        code: emp.code,
        name: emp.name,
        department: emp.department,
        grossSalary: gross,
        advanceDeduction,
        otherDeduction: deductionTotal,
        otherAddition: additionTotal,
        totalDeduction,
        netSalary: gross - totalDeduction + additionTotal,
        breakdown,
        deductionRows,
        additionRows,
      });
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- Generate draft payslips ---------------- */

router.post('/generate', auth, async (req, res) => {
  try {
    const { year, month, employeeIds } = req.body;
    if (!year || !month) return res.status(400).json({ message: 'year and month are required' });

    const where = { status: 'Active' };
    if (Array.isArray(employeeIds) && employeeIds.length) where.id = employeeIds;
    const employees = await Employee.findAll({ where });

    const results = [];
    for (const emp of employees) {
      const existing = await PaySlip.findOne({ where: { employeeId: emp.id, year, month } });
      if (existing && existing.status === 'Paid') {
        results.push({ employeeId: emp.id, skipped: true, reason: 'Already paid' });
        continue;
      }

      const data = await buildSlipData(emp, year, month);
      data.generatedBy = req.user?.name || 'Admin';

      let slip;
      if (existing) {
        Object.assign(existing, data);
        await existing.save();
        slip = existing;
      } else {
        slip = await PaySlip.create(data);
      }
      results.push(slip);
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- One-off deductions / bonus ---------------- */

router.post('/deductions', auth, async (req, res) => {
  try {
    const { employeeId, title, amount, month, year, note, type } = req.body;
    if (!employeeId || !title || !amount || !month || !year) {
      return res.status(400).json({ message: 'Employee, title, amount, month and year are required' });
    }
    const kind = type === 'Addition' ? 'Addition' : 'Deduction';

    const paidSlip = await PaySlip.findOne({ where: { employeeId, year, month, status: 'Paid' } });
    if (paidSlip) {
      return res.status(400).json({ message: 'This month is already paid — add it to a future month instead.' });
    }

    const row = await SalaryDeduction.create({
      employeeId, title, amount: Number(amount), month: Number(month), year: Number(year),
      note: note || '', type: kind, addedBy: req.user?.name || 'Admin',
    });

    // Keep an already-generated Draft in sync immediately.
    await syncDraftPaySlip(employeeId, Number(year), Number(month), req.user?.name);

    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/deductions', auth, async (req, res) => {
  try {
    const { employeeId, month, year, status, type } = req.query;
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status;
    if (type) where.type = type;
    const rows = await SalaryDeduction.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/deductions/:id', auth, async (req, res) => {
  try {
    const row = await SalaryDeduction.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (row.status === 'Applied') {
      return res.status(400).json({ message: 'Cannot delete an item already applied to a paid payslip' });
    }
    const { employeeId, year, month } = row;
    await row.destroy();

    await syncDraftPaySlip(employeeId, year, month, req.user?.name);

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------------- Payslip list / detail / pay / delete ---------------- */

router.get('/', auth, async (req, res) => {
  try {
    const { year, month, status, employeeId } = req.query;
    const where = {};
    if (year) where.year = year;
    if (month) where.month = month;
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;

    const rows = await PaySlip.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'name', 'code', 'department', 'designation'] }],
      order: [['year', 'DESC'], ['month', 'DESC'], ['id', 'DESC']],
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const slip = await PaySlip.findByPk(req.params.id, {
      include: [{ model: Employee, as: 'employee' }],
    });
    if (!slip) return res.status(404).json({ message: 'Not found' });

    const adjustments = await SalaryDeduction.findAll({
      where: {
        employeeId: slip.employeeId, year: slip.year, month: slip.month,
        [Op.or]: [{ status: 'Pending' }, { paySlipId: slip.id }],
      },
      order: [['createdAt', 'ASC']],
    });

    res.json({
      ...slip.toJSON(),
      advanceBreakdown: slip.advanceBreakdown ? JSON.parse(slip.advanceBreakdown) : [],
      deductions: adjustments.filter((a) => a.type !== 'Addition'),
      additions: adjustments.filter((a) => a.type === 'Addition'),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { drAccount, crAccount } = req.body;
    if (!drAccount || !crAccount) {
      return res.status(400).json({ message: 'Debit account (Salary Expense) and Credit account (Cash/Bank) are required' });
    }

    const slip = await PaySlip.findByPk(req.params.id, { include: [{ model: Employee, as: 'employee' }] });
    if (!slip) return res.status(404).json({ message: 'Not found' });
    if (slip.status === 'Paid') return res.status(400).json({ message: 'This payslip is already paid' });

    // Recompute fresh right before paying — advances/deductions could have
    // changed since the draft was last generated or synced.
    const { total: advanceDeduction, breakdown } = await computeAdvanceDeduction(slip.employeeId);
    const { deductionTotal, additionTotal, deductionRows, additionRows } =
      await computeAdjustments(slip.employeeId, slip.year, slip.month);
    const totalDeduction = advanceDeduction + deductionTotal;
    const netSalary = Number(slip.grossSalary) - totalDeduction + additionTotal;

    const drAccountId = await resolveAccountId(drAccount);
    const crAccountId = await resolveAccountId(crAccount);
    if (!drAccountId || !crAccountId) {
      return res.status(400).json({ message: 'Debit/Credit account not found in Chart of Accounts' });
    }

    const voucher = await Voucher.create({
      voucherNo: await generateVoucherNo(),
      type: 'Payment',
      date: new Date(),
      narration: `Salary - ${slip.employee?.name} (${slip.employee?.code}) - ${slip.month}/${slip.year}`,
      reference: `SAL-${slip.year}${String(slip.month).padStart(2, '0')}-${slip.employeeId}`,
      amount: netSalary,
      addedBy: req.user?.name || 'Admin',
    });
    await VoucherEntry.create({ accountId: drAccountId, debit: netSalary, credit: 0, voucherId: voucher.id });
    await VoucherEntry.create({ accountId: crAccountId, debit: 0, credit: netSalary, voucherId: voucher.id });

    for (const b of breakdown) {
      const adv = await EmployeeAdvance.findByPk(b.advanceId);
      if (!adv) continue;
      adv.paidAmount = Number(adv.paidAmount || 0) + b.deduct;
      if (adv.paidAmount >= Number(adv.amount)) adv.status = 'Completed';
      await adv.save();
    }

    for (const row of [...deductionRows, ...additionRows]) {
      row.status = 'Applied';
      row.paySlipId = slip.id;
      await row.save();
    }

    slip.advanceDeduction = advanceDeduction;
    slip.otherDeduction = deductionTotal;
    slip.otherAddition = additionTotal;
    slip.totalDeduction = totalDeduction;
    slip.netSalary = netSalary;
    slip.advanceBreakdown = JSON.stringify(breakdown);
    slip.status = 'Paid';
    slip.paidDate = new Date();
    slip.voucherId = voucher.id;
    await slip.save();

    await notifyEmployee(
      slip.employeeId, 'SalaryPaid',
      `Your salary for ${slip.month}/${slip.year} has been paid: ৳${netSalary.toLocaleString()}`,
      'PaySlip', slip.id,
    );

    res.json(slip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const slip = await PaySlip.findByPk(req.params.id);
    if (!slip) return res.status(404).json({ message: 'Not found' });
    if (slip.status === 'Paid') {
      return res.status(400).json({ message: 'A paid payslip cannot be deleted' });
    }
    await slip.destroy();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;