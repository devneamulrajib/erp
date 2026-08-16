const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Sale, SaleItem, SalePayment, SaleApproval, Customer, Project } = require('../models/associations');

async function generateSaleCode() {
  for (let i = 0; i < 5; i += 1) {
    const candidate = `Sale${Math.floor(1000000 + Math.random() * 9000000)}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Sale.findOne({ where: { code: candidate } });
    if (!exists) return candidate;
  }
  return `Sale${Date.now()}`;
}

const includeAll = [{ model: SaleItem }, { model: SalePayment }, { model: SaleApproval }];

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateSaleCode() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

    const items = await Sale.findAll({
      where,
      include: includeAll,
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    console.error('GET /api/sales failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Sale.findByPk(req.params.id, { include: includeAll });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload.customer) return res.status(400).json({ message: 'Customer is required' });

    const code = payload.code || await generateSaleCode();
    const item = await Sale.create({
      code,
      date: payload.date,
      customerId: payload.customer,
      ledger: payload.ledger,
      projectType: payload.projectType,
      projectId: payload.project,
      titleOfWork: payload.titleOfWork,
      siteId: payload.site,
      refWoNo: payload.refWoNo,
      content: payload.content,
      subtotal: payload.subtotal,
      vatIncluded: payload.vatIncluded,
      vatPercent: payload.vatPercent,
      vatAmount: payload.vatAmount,
      aitIncluded: payload.aitIncluded,
      aitPercent: payload.aitPercent,
      aitAmount: payload.aitAmount,
      interestRate: payload.interestRate,
      interestAmount: payload.interestAmount,
      grandTotal: payload.grandTotal,
      paid: payload.paid,
      due: payload.due,
      attachment: payload.attachment,
      addedBy: req.user?.name || 'Admin',
    });

    if (Array.isArray(payload.items)) {
      for (const it of payload.items) {
        await SaleItem.create({ ...it, itemId: it.item, saleId: item.id });
      }
    }
    if (Array.isArray(payload.payments)) {
      for (const p of payload.payments) {
        await SalePayment.create({ ...p, saleId: item.id });
      }
    }
    for (const a of (Array.isArray(payload.approvals) ? payload.approvals : [{ name: 'Admin', approved: false }])) {
      await SaleApproval.create({ ...a, saleId: item.id });
    }

    const populated = await Sale.findByPk(item.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/sales failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Sale.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const payload = req.body;
    const directFields = [
      'date', 'ledger', 'projectType', 'titleOfWork', 'refWoNo', 'content',
      'subtotal', 'vatIncluded', 'vatPercent', 'vatAmount', 'aitIncluded', 'aitPercent', 'aitAmount',
      'interestRate', 'interestAmount', 'grandTotal', 'paid', 'due', 'attachment',
    ];
    directFields.forEach((key) => {
      if (payload[key] !== undefined) item[key] = payload[key];
    });
    if (payload.customer !== undefined) item.customerId = payload.customer;
    if (payload.project !== undefined) item.projectId = payload.project;
    if (payload.site !== undefined) item.siteId = payload.site;

    if (payload.items !== undefined) {
      await SaleItem.destroy({ where: { saleId: item.id } });
      for (const it of payload.items) {
        await SaleItem.create({ ...it, itemId: it.item, saleId: item.id });
      }
    }
    if (payload.payments !== undefined) {
      await SalePayment.destroy({ where: { saleId: item.id } });
      for (const p of payload.payments) {
        await SalePayment.create({ ...p, saleId: item.id });
      }
    }
    if (payload.approvals !== undefined) {
      await SaleApproval.destroy({ where: { saleId: item.id } });
      for (const a of payload.approvals) {
        await SaleApproval.create({ ...a, saleId: item.id });
      }
    }

    await item.save();
    const populated = await Sale.findByPk(item.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    console.error('PUT /api/sales failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Sale.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;