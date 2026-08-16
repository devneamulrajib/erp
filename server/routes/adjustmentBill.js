const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { AdjustmentBill, AdjustmentBillItem, AdjustmentBillPayment } = require('../models/associations');

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

function computeTotals(body, proposedItems, adjustmentItems) {
  const subtotal = adjustmentItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

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

    const bills = await AdjustmentBill.findAll({
      where,
      include: [
        { model: AdjustmentBillItem },
        { model: AdjustmentBillPayment },
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
    const bill = await AdjustmentBill.findByPk(req.params.id, {
      include: [
        { model: AdjustmentBillItem },
        { model: AdjustmentBillPayment },
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

    const proposedItems = cleanItems(req.body.proposedItems);
    const adjustmentItems = cleanItems(req.body.adjustmentItems);
    const totals = computeTotals(req.body, proposedItems, adjustmentItems);

    const bill = await AdjustmentBill.create({
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

    for (const item of proposedItems) {
      await AdjustmentBillItem.create({ ...item, itemType: 'proposed', adjustmentBillId: bill.id });
    }
    for (const item of adjustmentItems) {
      await AdjustmentBillItem.create({ ...item, itemType: 'adjustment', adjustmentBillId: bill.id });
    }
    if (Array.isArray(req.body.payments)) {
      for (const p of req.body.payments) {
        await AdjustmentBillPayment.create({ ...p, adjustmentBillId: bill.id });
      }
    }

    const populated = await AdjustmentBill.findByPk(bill.id, {
      include: [{ model: AdjustmentBillItem }, { model: AdjustmentBillPayment }],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await AdjustmentBill.findByPk(req.params.id);
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

    let proposedItems, adjustmentItems;

    if (req.body.proposedItems !== undefined) {
      proposedItems = cleanItems(req.body.proposedItems);
      await AdjustmentBillItem.destroy({ where: { adjustmentBillId: bill.id, itemType: 'proposed' } });
      for (const item of proposedItems) {
        await AdjustmentBillItem.create({ ...item, itemType: 'proposed', adjustmentBillId: bill.id });
      }
    } else {
      proposedItems = await AdjustmentBillItem.findAll({ where: { adjustmentBillId: bill.id, itemType: 'proposed' } });
    }

    if (req.body.adjustmentItems !== undefined) {
      adjustmentItems = cleanItems(req.body.adjustmentItems);
      await AdjustmentBillItem.destroy({ where: { adjustmentBillId: bill.id, itemType: 'adjustment' } });
      for (const item of adjustmentItems) {
        await AdjustmentBillItem.create({ ...item, itemType: 'adjustment', adjustmentBillId: bill.id });
      }
    } else {
      adjustmentItems = await AdjustmentBillItem.findAll({ where: { adjustmentBillId: bill.id, itemType: 'adjustment' } });
    }

    if (req.body.payments !== undefined) {
      await AdjustmentBillPayment.destroy({ where: { adjustmentBillId: bill.id } });
      for (const p of req.body.payments) {
        await AdjustmentBillPayment.create({ ...p, adjustmentBillId: bill.id });
      }
    }

    const totals = computeTotals(req.body, proposedItems, adjustmentItems);
    Object.assign(bill, totals);

    await bill.save();

    const populated = await AdjustmentBill.findByPk(bill.id, {
      include: [{ model: AdjustmentBillItem }, { model: AdjustmentBillPayment }],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await AdjustmentBill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;