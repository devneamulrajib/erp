const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const { notifyEmployee } = require('../utils/notify');
const { buildPaySlipPdf, buildPayrollReportPdf } = require('../utils/payrollPdf');
const logActivity = require('../utils/activityLog');
const {
  grossOf, computeAdvanceDeduction, computeAdjustments, buildSlipData, syncDraftPaySlip,
} = require('../utils/payroll');
const {
  Employee, EmployeeAdvance, PaySlip, SalaryDeduction,
  Voucher, VoucherEntry, ChartOfAccount, OfficeExpense, BudgetCategory,
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

// Finds the top-level "Salary" budget category (case-insensitive), if one
// exists, so salary payments can auto-deduct from it without the admin
// having to pick it every time. Admin can still override via req.body.budgetCategory.
async function resolveSalaryBudgetCategory() {
  try {
    return await BudgetCategory.findOne({ where: { name: 'Salary', parentId: null } });
  } catch {
    return null;
  }
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
      let isNew;
      if (existing) {
        Object.assign(existing, data);
        await existing.save();
        slip = existing;
        isNew = false;
      } else {
        slip = await PaySlip.create(data);
        isNew = true;
      }
      // isNew tells the frontend which rows can be safely "Undone" (deleted)
      // right after this generate call without losing anything that existed before.
      results.push({ ...slip.toJSON(), isNew });
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

/* ---------------- Payslip list / detail / pdf / pay / unpay / delete ---------------- */

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

// Full payroll report PDF — same filters as the list endpoint. Declared
// before '/:id' routes so 'report' is never mistaken for an :id param.
router.get('/report/pdf', auth, async (req, res) => {
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
      order: [['year', 'DESC'], ['month', 'DESC'], ['employeeId', 'ASC']],
    });

    let employeeName = null;
    if (employeeId) {
      const emp = await Employee.findByPk(employeeId);
      employeeName = emp?.name || null;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payroll-Report-${year || 'all'}-${month || 'all'}.pdf"`);
    buildPayrollReportPdf(rows.map((r) => r.toJSON()), { year, month, status, employeeName }, res);
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

// Individual payslip PDF.
router.get('/:id/pdf', auth, async (req, res) => {
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

    const slipData = {
      ...slip.toJSON(),
      deductions: adjustments.filter((a) => a.type !== 'Addition'),
      additions: adjustments.filter((a) => a.type === 'Addition'),
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip-${slip.employee?.code || slip.employeeId}-${slip.month}-${slip.year}.pdf"`);
    buildPaySlipPdf(slipData, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/pay', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { drAccount, crAccount, budgetCategory } = req.body;
    if (!drAccount || !crAccount) {
      await t.rollback();
      return res.status(400).json({ message: 'Debit account (Salary Expense) and Credit account (Cash/Bank) are required' });
    }

    const slip = await PaySlip.findByPk(req.params.id, { include: [{ model: Employee, as: 'employee' }], transaction: t });
    if (!slip) {
      await t.rollback();
      return res.status(404).json({ message: 'Not found' });
    }
    if (slip.status === 'Paid') {
      await t.rollback();
      return res.status(400).json({ message: 'This payslip is already paid' });
    }

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
      await t.rollback();
      return res.status(400).json({ message: 'Debit/Credit account not found in Chart of Accounts' });
    }

    // Resolve which Office Budget category this salary payment deducts
    // from: explicit choice from the Pay dialog wins, otherwise auto-detect
    // a top-level category named "Salary". If neither exists, the payment
    // still goes through (so payroll is never blocked by budget setup),
    // but a warning is returned so the admin knows nothing was deducted.
    let resolvedCategoryId = budgetCategory || null;
    let budgetWarning = null;
    if (!resolvedCategoryId) {
      const salaryCategory = await resolveSalaryBudgetCategory();
      resolvedCategoryId = salaryCategory ? salaryCategory.id : null;
    }
    if (!resolvedCategoryId) {
      budgetWarning = 'No "Salary" Office Budget category found — this payment was not deducted from any budget. Create one or pick a category when paying.';
    }

    const voucher = await Voucher.create({
      voucherNo: await generateVoucherNo(),
      type: 'Payment',
      date: new Date(),
      narration: `Salary - ${slip.employee?.name} (${slip.employee?.code}) - ${slip.month}/${slip.year}`,
      reference: `SAL-${slip.year}${String(slip.month).padStart(2, '0')}-${slip.employeeId}`,
      amount: netSalary,
      addedBy: req.user?.name || 'Admin',
    }, { transaction: t });
    await VoucherEntry.create({ accountId: drAccountId, debit: netSalary, credit: 0, voucherId: voucher.id }, { transaction: t });
    await VoucherEntry.create({ accountId: crAccountId, debit: 0, credit: netSalary, voucherId: voucher.id }, { transaction: t });

    // This is the actual fix: record an OfficeExpense sharing the same
    // voucher, so this payment counts against the Salary (or chosen)
    // budget category — same mechanism every other office spend uses.
    let officeExpense = null;
    if (resolvedCategoryId) {
      officeExpense = await OfficeExpense.create({
        date: new Date(),
        budgetCategoryId: resolvedCategoryId,
        title: `Salary - ${slip.employee?.name} (${slip.employee?.code}) - ${slip.month}/${slip.year}`,
        drAccount,
        crAccount,
        amount: netSalary,
        reference: `PAYSLIP-${slip.id}`,
        status: 'approved',
        voucherId: voucher.id,
        addedBy: req.user?.name || 'Admin',
      }, { transaction: t });
    }

    for (const b of breakdown) {
      const adv = await EmployeeAdvance.findByPk(b.advanceId, { transaction: t });
      if (!adv) continue;
      adv.paidAmount = Number(adv.paidAmount || 0) + b.deduct;
      if (adv.paidAmount >= Number(adv.amount)) adv.status = 'Completed';
      await adv.save({ transaction: t });
    }

    for (const row of [...deductionRows, ...additionRows]) {
      row.status = 'Applied';
      row.paySlipId = slip.id;
      await row.save({ transaction: t });
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
    slip.officeExpenseId = officeExpense ? officeExpense.id : null;
    slip.budgetCategoryId = resolvedCategoryId;
    await slip.save({ transaction: t });

    await t.commit();

    await logActivity({
      module: 'Salary', action: 'Paid',
      message: `Paid salary to ${slip.employee?.name} (${slip.employee?.code}) for ${slip.month}/${slip.year}`,
      amount: netSalary, budgetCategoryId: resolvedCategoryId,
      relatedType: 'PaySlip', relatedId: slip.id,
      performedBy: req.user?.name || 'Admin',
    });

    await notifyEmployee(
      slip.employeeId, 'SalaryPaid',
      `Your salary for ${slip.month}/${slip.year} has been paid: ৳${netSalary.toLocaleString()}`,
      'PaySlip', slip.id,
    );

    res.json({ ...slip.toJSON(), budgetWarning });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

// Reverses a paid payslip: deletes the linked OfficeExpense + Voucher (so
// the budget deduction is undone), restores any advance balances that were
// paid down, reverts one-off deductions/bonuses back to Pending, and puts
// the payslip back to Draft. Safe to re-run generate/pay afterward.
router.post('/:id/unpay', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const slip = await PaySlip.findByPk(req.params.id, { include: [{ model: Employee, as: 'employee' }], transaction: t });
    if (!slip) {
      await t.rollback();
      return res.status(404).json({ message: 'Not found' });
    }
    if (slip.status !== 'Paid') {
      await t.rollback();
      return res.status(400).json({ message: 'This payslip has not been paid' });
    }

    const previousAmount = Number(slip.netSalary);
    const previousCategoryId = slip.budgetCategoryId;

    const breakdown = slip.advanceBreakdown ? JSON.parse(slip.advanceBreakdown) : [];
    for (const b of breakdown) {
      const adv = await EmployeeAdvance.findByPk(b.advanceId, { transaction: t });
      if (!adv) continue;
      adv.paidAmount = Math.max(0, Number(adv.paidAmount || 0) - b.deduct);
      if (adv.status === 'Completed' && adv.paidAmount < Number(adv.amount)) adv.status = 'Disbursed';
      await adv.save({ transaction: t });
    }

    await SalaryDeduction.update(
      { status: 'Pending', paySlipId: null },
      { where: { paySlipId: slip.id }, transaction: t },
    );

    if (slip.officeExpenseId) {
      await OfficeExpense.destroy({ where: { id: slip.officeExpenseId }, transaction: t });
    }
    if (slip.voucherId) {
      await VoucherEntry.destroy({ where: { voucherId: slip.voucherId }, transaction: t });
      await Voucher.destroy({ where: { id: slip.voucherId }, transaction: t });
    }

    slip.status = 'Draft';
    slip.paidDate = null;
    slip.voucherId = null;
    slip.officeExpenseId = null;
    slip.budgetCategoryId = null;
    await slip.save({ transaction: t });

    await t.commit();

    await logActivity({
      module: 'Salary', action: 'Unpaid',
      message: `Undid salary payment to ${slip.employee?.name} (${slip.employee?.code}) for ${slip.month}/${slip.year} — ৳${previousAmount.toLocaleString()} restored to budget`,
      amount: previousAmount, budgetCategoryId: previousCategoryId,
      relatedType: 'PaySlip', relatedId: slip.id,
      performedBy: req.user?.name || 'Admin',
    });

    // Refresh the draft numbers from current advances/deductions (should
    // match what was reverted, but this guarantees consistency).
    const refreshed = await syncDraftPaySlip(slip.employeeId, slip.year, slip.month, req.user?.name);

    res.json(refreshed || slip);
  } catch (err) {
    await t.rollback();
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