const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const {
  ContractorBill, ContractorBillItem, ContractorBillPayment, ContractorBillApproval,
  Party, ChartOfAccount, Project,
} = require('../models/associations');

function generateCode() {
  return 'P.Bill' + Math.floor(1000000 + Math.random() * 9000000);
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
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const securityDeposit = Number(body.securityDeposit) || 0;
  const grandTotal = subtotal + vatAmount + securityDeposit;

  const payments = Array.isArray(body.payments) ? body.payments : [];
  const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const due = grandTotal - paid;

  return { subtotal, totalQuantity, vatIncluded, vatPercent, vatAmount, securityDeposit, grandTotal, paid, due };
}

const includeAll = [{ model: ContractorBillItem }, { model: ContractorBillPayment }, { model: ContractorBillApproval }];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, party, ledger, project, titleOfWork } = req.query;
    const where = {};
    if (party) where.partyId = party;
    if (ledger) where.ledgerId = ledger;
    if (project) where.projectId = project;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const bills = await ContractorBill.findAll({
      where,
      include: [
        { model: Party, attributes: ['name'] },
        { model: ChartOfAccount, attributes: ['name', 'code'] },
        { model: Project, attributes: ['name'] },
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
    const bill = await ContractorBill.findByPk(req.params.id, {
      include: [
        { model: Party, attributes: ['name'] },
        { model: ChartOfAccount, attributes: ['name', 'code'] },
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
    const { party } = req.body;
    if (!party) return res.status(400).json({ message: 'Contractor/Supplier is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const bill = await ContractorBill.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      partyId: req.body.party,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      titleOfWork: req.body.titleOfWork,
      task: req.body.task,
      siteId: req.body.site,
      categoryId: req.body.category,
      refWoNo: req.body.refWoNo,
      attachment: req.body.attachment,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await ContractorBillItem.create({ ...it, itemId: it.item, contractorBillId: bill.id });
    }
    if (Array.isArray(req.body.payments)) {
      for (const p of req.body.payments) {
        await ContractorBillPayment.create({ ...p, contractorBillId: bill.id });
      }
    }
    await ContractorBillApproval.create({ name: 'Admin', approved: false, contractorBillId: bill.id });

    const populated = await ContractorBill.findByPk(bill.id, {
      include: [
        { model: Party, attributes: ['name'] },
        { model: ChartOfAccount, attributes: ['name', 'code'] },
        { model: Project, attributes: ['name'] },
        ...includeAll,
      ],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await ContractorBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const directFields = {
      date: req.body.date,
      partyId: req.body.party,
      ledgerId: req.body.ledger,
      projectType: req.body.projectType,
      projectId: req.body.project,
      titleOfWork: req.body.titleOfWork,
      task: req.body.task,
      siteId: req.body.site,
      categoryId: req.body.category,
      refWoNo: req.body.refWoNo,
      attachment: req.body.attachment,
      vatIncluded: req.body.vatIncluded,
      vatPercent: req.body.vatPercent,
      securityDeposit: req.body.securityDeposit,
    };
    Object.keys(directFields).forEach((key) => {
      if (directFields[key] !== undefined) bill[key] = directFields[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await ContractorBillItem.destroy({ where: { contractorBillId: bill.id } });
      for (const it of items) {
        await ContractorBillItem.create({ ...it, itemId: it.item, contractorBillId: bill.id });
      }
    } else {
      items = await ContractorBillItem.findAll({ where: { contractorBillId: bill.id } });
    }

    if (req.body.payments !== undefined) {
      await ContractorBillPayment.destroy({ where: { contractorBillId: bill.id } });
      for (const p of req.body.payments) {
        await ContractorBillPayment.create({ ...p, contractorBillId: bill.id });
      }
    }

    const totals = computeTotals(req.body, items);
    Object.assign(bill, totals);

    await bill.save();
    const populated = await ContractorBill.findByPk(bill.id, {
      include: [
        { model: Party, attributes: ['name'] },
        { model: ChartOfAccount, attributes: ['name', 'code'] },
        { model: Project, attributes: ['name'] },
        ...includeAll,
      ],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ContractorBill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;