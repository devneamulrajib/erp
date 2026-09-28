const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const { Employee, EmployeeAdvance, LeaveRequest, Attendance } = require('../models/associations');

// GET /api/portal/employee/profile — salary breakdown + basic info
router.get('/profile', portalAuth, requireRole('employee'), async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.portalUser.customerId, {
      attributes: [
        'id', 'name', 'code', 'designation', 'department', 'phone', 'email',
        'joiningDate', 'basicSalary', 'houseRent', 'medicalAllowance',
        'otherAllowance', 'grossSalary', 'bankName', 'bankAccountNo', 'status',
      ],
    });
    if (!employee) return res.status(404).json({ message: 'Not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/portal/employee/attendance?month=YYYY-MM — records + counts
router.get('/attendance', portalAuth, requireRole('employee'), async (req, res) => {
  try {
    const { month } = req.query; // e.g. "2026-09"
    const where = { employeeId: req.portalUser.customerId };
    if (month) {
      where.date = { [Op.like]: `${month}%` };
    }
    const records = await Attendance.findAll({ where, order: [['date', 'DESC']] });

    const counts = { Present: 0, Absent: 0, Leave: 0, Holiday: 0 };
    records.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });

    res.json({ records, counts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------- Advance / Loan requests (own) ----------------

router.get('/advances', portalAuth, requireRole('employee'), async (req, res) => {
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

router.post('/advances', portalAuth, requireRole('employee'), async (req, res) => {
  try {
    const { type, amount, repaymentMonths, reason } = req.body;
    if (!amount) return res.status(400).json({ message: 'Amount is required' });

    const months = Number(repaymentMonths) || 1;
    const advance = await EmployeeAdvance.create({
      employeeId: req.portalUser.customerId,
      type: type || 'Advance Salary',
      amount: Number(amount),
      requestDate: new Date(),
      repaymentMonths: months,
      monthlyDeduction: Number(amount) / months,
      reason: reason || '',
      status: 'Pending',
    });
    res.status(201).json(advance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------------- Leave / day-off requests (own) ----------------

router.get('/leave-requests', portalAuth, requireRole('employee'), async (req, res) => {
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

router.post('/leave-requests', portalAuth, requireRole('employee'), async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'From date and To date are required' });
    }
    const days = Math.max(1, Math.round((new Date(toDate) - new Date(fromDate)) / 86400000) + 1);

    const request = await LeaveRequest.create({
      employeeId: req.portalUser.customerId,
      fromDate,
      toDate,
      days,
      reason: reason || '',
      status: 'Pending',
    });
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;