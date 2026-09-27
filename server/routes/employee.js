// server/routes/employee.js
const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  Employee,
  EmployeeAdvance,
  OfficeExpense,
  Voucher,
  VoucherEntry,
  ChartOfAccount,
} = require('../models/associations');

function generateCode() {
  return 'EMP' + Math.floor(100000 + Math.random() * 900000);
}

function parseValidDate(dateVal) {
  if (!dateVal || dateVal === '' || isNaN(new Date(dateVal).getTime())) {
    return null;
  }
  return dateVal;
}

async function generateOfficeExpRef() {
  const count = await OfficeExpense.count();
  return `OEXP${String(count + 1).padStart(5, '0')}`;
}

async function generateVoucherNo() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const fullPrefix = `OE${yy}${mm}${dd}`;
  const count = await Voucher.count({ where: { voucherNo: { [Op.like]: `${fullPrefix}%` } } });
  return `${fullPrefix}-${String(count + 1).padStart(4, '0')}`;
}

async function resolveAccountId(name) {
  if (!name) return null;
  const acc = await ChartOfAccount.findOne({ where: { name } });
  return acc ? acc.id : null;
}

// ---------------- EMPLOYEE ROUTES ---------------- //

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } },
        { designation: { [Op.like]: `%${search}%` } },
      ];
    }

    const employees = await Employee.findAll({
      where,
      include: [{ model: EmployeeAdvance, as: 'advances' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      name, code, designation, department, phone, email, status,
      joiningDate, basicSalary, houseRent, medicalAllowance, otherAllowance,
      bankName, bankAccountNo,
    } = req.body;

    if (!name) return res.status(400).json({ message: 'Name is required' });

    const basic = Number(basicSalary) || 0;
    const rent = Number(houseRent) || 0;
    const med = Number(medicalAllowance) || 0;
    const other = Number(otherAllowance) || 0;
    const gross = basic + rent + med + other;

    const employee = await Employee.create({
      name,
      code: code || generateCode(),
      designation,
      department,
      phone,
      email,
      joiningDate: parseValidDate(joiningDate), // Safely handles empty string or null
      basicSalary: basic,
      houseRent: rent,
      medicalAllowance: med,
      otherAllowance: other,
      grossSalary: gross,
      bankName,
      bankAccountNo,
      status: status || 'Active',
    });

    res.status(201).json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'name', 'code', 'designation', 'department', 'phone', 'email', 'status',
      'basicSalary', 'houseRent', 'medicalAllowance', 'otherAllowance',
      'bankName', 'bankAccountNo',
    ];

    fields.forEach((key) => {
      if (req.body[key] !== undefined) employee[key] = req.body[key];
    });

    if (req.body.joiningDate !== undefined) {
      employee.joiningDate = parseValidDate(req.body.joiningDate);
    }

    employee.grossSalary =
      (Number(employee.basicSalary) || 0) +
      (Number(employee.houseRent) || 0) +
      (Number(employee.medicalAllowance) || 0) +
      (Number(employee.otherAllowance) || 0);

    await employee.save();
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Employee.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------- ADVANCE SALARY / LOAN ROUTES ---------------- //

router.get('/advances/all', auth, async (req, res) => {
  try {
    const advances = await EmployeeAdvance.findAll({
      include: [
        { model: Employee, as: 'employee' },
        { model: OfficeExpense, as: 'officeExpense' },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(advances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/advances/request', auth, async (req, res) => {
  try {
    const { employeeId, type, amount, repaymentMonths, reason } = req.body;
    if (!employeeId || !amount) {
      return res.status(400).json({ message: 'Employee and Amount are required' });
    }

    const months = Number(repaymentMonths) || 1;
    const deduction = Number(amount) / months;

    const advance = await EmployeeAdvance.create({
      employeeId,
      type: type || 'Advance Salary',
      amount: Number(amount),
      requestDate: new Date(),
      repaymentMonths: months,
      monthlyDeduction: deduction,
      reason: reason || '',
      status: 'Pending',
    });

    res.status(201).json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve & Disburse Advance / Loan: Directly creates Office Expense & Accounting Voucher
router.post('/advances/:id/disburse', auth, async (req, res) => {
  try {
    const { budgetCategoryId, drAccount, crAccount } = req.body;
    if (!budgetCategoryId || !drAccount || !crAccount) {
      return res.status(400).json({
        message: 'Office Budget Category, Debit Account, and Credit Account (Cash/Bank) are required to disburse',
      });
    }

    const advance = await EmployeeAdvance.findByPk(req.params.id, {
      include: [{ model: Employee, as: 'employee' }],
    });
    if (!advance) return res.status(404).json({ message: 'Request not found' });
    if (advance.status === 'Disbursed') {
      return res.status(400).json({ message: 'This request has already been disbursed' });
    }

    // 1. Create Office Expense (hits Office Budget)
    const title = `${advance.type} Disbursed to ${advance.employee?.name} (${advance.employee?.code})`;
    const ref = await generateOfficeExpRef();

    const officeExpense = await OfficeExpense.create({
      date: new Date(),
      budgetCategoryId,
      title,
      drAccount,
      crAccount,
      amount: Number(advance.amount),
      reference: ref,
      status: 'approved',
      addedBy: req.user?.name || 'Admin',
    });

    // 2. Post to Accounting Voucher
    const drAccountId = await resolveAccountId(drAccount);
    const crAccountId = await resolveAccountId(crAccount);

    if (drAccountId && crAccountId) {
      const voucher = await Voucher.create({
        voucherNo: await generateVoucherNo(),
        type: 'Office Expense',
        date: new Date(),
        narration: title,
        reference: ref,
        amount: Number(advance.amount),
        addedBy: req.user?.name || 'Admin',
      });

      await VoucherEntry.create({ accountId: drAccountId, debit: Number(advance.amount), credit: 0, voucherId: voucher.id });
      await VoucherEntry.create({ accountId: crAccountId, debit: 0, credit: Number(advance.amount), voucherId: voucher.id });

      officeExpense.voucherId = voucher.id;
      await officeExpense.save();
    }

    // 3. Update Advance status
    advance.status = 'Disbursed';
    advance.disbursementDate = new Date();
    advance.officeExpenseId = officeExpense.id;
    advance.approvedBy = req.user?.name || 'Admin';
    await advance.save();

    res.json({ message: 'Disbursed and recorded in Office Budget & Accounts successfully', advance, officeExpense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;