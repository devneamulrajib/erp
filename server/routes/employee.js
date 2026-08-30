const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');

function generateCode() {
  return 'EMP' + Math.floor(100000000 + Math.random() * 900000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};
    if (search) where.name = { [Op.like]: `%${search}%` };

    const employees = await Employee.findAll({ where, order: [['createdAt', 'DESC']] });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, code, designation, department, phone, email, status } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const employee = await Employee.create({
      name,
      code: code || generateCode(),
      designation,
      department,
      phone,
      email,
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

    const fields = ['name', 'code', 'designation', 'department', 'phone', 'email', 'status'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) employee[key] = req.body[key];
    });

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

module.exports = router;