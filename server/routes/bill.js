const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Bill, BillLineItem, BillPayment, BillApproval, Customer, Project } = require('../models/associations');

function generateCode() {
  return 'Bill' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const quantity = Number(it.quantity) || 0;
    const rate = Number(it.rate) || 0;
    return { ...it, quantity, rate, amount: quantity * rate };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const aitIncluded = !!body.aitIncluded;
  const aitPercent = Number(body.aitPercent) || 0;
  const aitAmount = aitIncluded ? subtotal * (aitPercent / 100) : 0;

  const interestRate = Number(body.interestRate) || 0;
  const interestAmount = subtotal * (interestRate / 100);

  const grandTotal = subtotal + vatAmount + aitAmount + interestAmount;

  const payments = Array.isArray(body.payments) ? body.payments : [];
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const due = grandTotal - paid;

  return {
    subtotal, vatIncluded, vatPercent, vatAmount,
    aitIncluded, aitPercent, aitAmount,
    interestRate, interestAmount, grandTotal, paid, due,
  };
}

const includeAll = [{ model: BillLineItem }, { model: BillPayment }, { model: BillApproval }];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, customer, project } = req.query;
    const where = {};
    if (customer) where.customerId = customer;
    if (project) where.projectId = project;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const bills = await Bill.findAll({
      where,
      include: [
        { model: Customer, attributes: ['name'] },
        { model: Project, attributes: ['name'] },
        { model: BillLineItem }, { model: BillPayment }, { model: BillApproval },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ['name'] },
        { model: Project, attributes: ['name'] },
        ...includeAll,
      ],
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    res.json(bill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { customer } = req.body;
    if (!customer) return res.status(400).json({ message: 'Customer is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const bill = await Bill.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      customerId: req.body.customer,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      refWoNo: req.body.refWoNo,
      contentBody: req.body.contentBody,
      attachment: req.body.attachment,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await BillLineItem.create({ ...it, billId: bill.id });
    }
    if (Array.isArray(req.body.payments)) {
      for (const p of req.body.payments) {
        await BillPayment.create({ ...p, billId: bill.id });
      }
    }
    await BillApproval.create({ name: 'Admin', approved: false, billId: bill.id });

    const populated = await Bill.findByPk(bill.id, {
      include: [{ model: Customer, attributes: ['name'] }, { model: Project, attributes: ['name'] }, ...includeAll],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await Bill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const directFields = {
      date: req.body.date,
      customerId: req.body.customer,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      siteId: req.body.site,
      refWoNo: req.body.refWoNo,
      contentBody: req.body.contentBody,
      attachment: req.body.attachment,
      vatIncluded: req.body.vatIncluded,
      vatPercent: req.body.vatPercent,
      aitIncluded: req.body.aitIncluded,
      aitPercent: req.body.aitPercent,
      interestRate: req.body.interestRate,
    };
    Object.keys(directFields).forEach((key) => {
      if (directFields[key] !== undefined) bill[key] = directFields[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await BillLineItem.destroy({ where: { billId: bill.id } });
      for (const it of items) {
        await BillLineItem.create({ ...it, billId: bill.id });
      }
    } else {
      items = await BillLineItem.findAll({ where: { billId: bill.id } });
    }

    if (req.body.payments !== undefined) {
      await BillPayment.destroy({ where: { billId: bill.id } });
      for (const p of req.body.payments) {
        await BillPayment.create({ ...p, billId: bill.id });
      }
    }

    const totals = computeTotals(req.body, items);
    Object.assign(bill, totals);

    await bill.save();
    const populated = await Bill.findByPk(bill.id, {
      include: [{ model: Customer, attributes: ['name'] }, { model: Project, attributes: ['name'] }, ...includeAll],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Bill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;