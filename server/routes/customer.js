const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const Customer = require('../models/Customer');
const CustomerNominee = require('../models/CustomerNominee');

function generateCode() {
  return 'CUS' + Math.floor(1000000 + Math.random() * 9000000);
}

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
        { mobile: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }
    const customers = await Customer.findAll({
      where,
      include: [{ model: CustomerNominee }],
      order: [['createdAt', 'DESC']],
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: CustomerNominee }],
    });
    if (!customer) return res.status(404).json({ message: 'Not found' });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, name, mobile, email, nid, address, buyerReference,
      creditLimit, dueDate, openingBalance, image, chartOfGroup,
      createUser, nominees,
    } = req.body;

    if (!name || !mobile || !nid) {
      return res.status(400).json({ message: 'Name, Mobile and NID are required' });
    }

    const customer = await Customer.create({
      code: code || generateCode(),
      name, mobile, email, nid, address, buyerReference,
      creditLimit: Number(creditLimit) || 0,
      dueDate: dueDate || null,
      openingBalance: Number(openingBalance) || 0,
      image,
      chartOfGroupId: chartOfGroup || null,
      createUser: !!createUser,
    });

    if (Array.isArray(nominees)) {
      for (const n of nominees.filter((n) => n.name)) {
        await CustomerNominee.create({ ...n, customerId: customer.id });
      }
    }

    const populated = await Customer.findByPk(customer.id, { include: [{ model: CustomerNominee }] });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'name', 'mobile', 'email', 'nid', 'address', 'buyerReference',
      'creditLimit', 'dueDate', 'openingBalance', 'image', 'createUser',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) customer[key] = req.body[key];
    });
    if (req.body.chartOfGroup !== undefined) customer.chartOfGroupId = req.body.chartOfGroup;

    if (req.body.nominees !== undefined) {
      await CustomerNominee.destroy({ where: { customerId: customer.id } });
      for (const n of req.body.nominees.filter((n) => n.name)) {
        await CustomerNominee.create({ ...n, customerId: customer.id });
      }
    }

    await customer.save();
    const populated = await Customer.findByPk(customer.id, { include: [{ model: CustomerNominee }] });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Customer.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;