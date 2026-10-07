// server/routes/attendanceCorrection.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const sequelize = require('../config/db');
const { Employee, Attendance } = require('../models/associations');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const notify = require('../utils/notify');
const notifyEmployee = (...args) =>
  Promise.resolve()
    .then(() => notify.notifyEmployee(...args))
    .catch((e) => console.error('notifyEmployee failed:', e.message));

router.get('/', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.employeeId) where.employeeId = req.query.employeeId;

    const rows = await AttendanceCorrection.findAll({ where, order: [['createdAt', 'DESC']] });
    const ids = [...new Set(rows.map((r) => r.employeeId))];
    const employees = ids.length
      ? await Employee.findAll({ where: { id: ids }, attributes: ['id', 'name', 'code', 'department'] })
      : [];
    const byId = Object.fromEntries(employees.map((e) => [e.id, e]));

    res.json(rows.map((r) => ({ ...r.toJSON(), employee: byId[r.employeeId] || null })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/approve', auth, requireAdmin, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const row = await AttendanceCorrection.findByPk(req.params.id, { transaction: t });
    if (!row) { await t.rollback(); return res.status(404).json({ message: 'Not found' }); }
    if (row.status !== 'Pending') { await t.rollback(); return res.status(400).json({ message: `Already ${row.status}` }); }

    const actor = req.user?.name || 'Admin';
    const record = await Attendance.findOne({
      where: { employeeId: row.employeeId, date: row.date },
      order: [['id', 'DESC']],
      transaction: t,
    });

    if (record) {
      record.status = 'Present';
      record.markedBy = `${actor} (correction)`;
      await record.save({ transaction: t });
    } else {
      await Attendance.create(
        { employeeId: row.employeeId, date: row.date, status: 'Present', markedBy: `${actor} (correction)` },
        { transaction: t },
      );
    }

    row.status = 'Approved';
    row.adminNote = req.body.adminNote || '';
    row.reviewedBy = actor;
    row.reviewedAt = new Date();
    await row.save({ transaction: t });
    await t.commit();

    await notifyEmployee(
      row.employeeId,
      'AttendanceCorrection',
      `Your attendance correction for ${row.date} was approved`,
      'AttendanceCorrection',
      row.id,
    );
    res.json(row);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reject', auth, requireAdmin, async (req, res) => {
  try {
    const row = await AttendanceCorrection.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    if (row.status !== 'Pending') return res.status(400).json({ message: `Already ${row.status}` });

    const note = String(req.body.adminNote || '').trim();
    if (!note) return res.status(400).json({ message: 'Please add a note explaining the rejection' });

    row.status = 'Rejected';
    row.adminNote = note;
    row.reviewedBy = req.user?.name || 'Admin';
    row.reviewedAt = new Date();
    await row.save();

    await notifyEmployee(
      row.employeeId,
      'AttendanceCorrection',
      `Your attendance correction for ${row.date} was rejected: ${note}`,
      'AttendanceCorrection',
      row.id,
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;