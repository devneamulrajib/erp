const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const {
  LabourBill, LabourBillItem, LabourBillApproval, Party, ChartOfAccount, Project,
} = require('../models/associations');

function generateCode() {
  return 'L/WB' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items) {
  return (Array.isArray(items) ? items : []).map((it) => {
    const qtyDays = Number(it.qtyDays) || 0;
    const rate = Number(it.rate) || 0;
    const security = Number(it.security) || 0;
    const gross = qtyDays * rate;
    return { ...it, qtyDays, rate, security, gross, netPayable: gross - security };
  });
}

function computeTotals(body, items) {
  const subtotal = items.reduce((sum, it) => sum + (Number(it.gross) || 0), 0);
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.qtyDays) || 0), 0);
  const totalSecurity = items.reduce((sum, it) => sum + (Number(it.security) || 0), 0);

  const vatIncluded = !!body.vatIncluded;
  const vatPercent = Number(body.vatPercent) || 0;
  const vatAmount = vatIncluded ? subtotal * (vatPercent / 100) : 0;

  const grandTotal = subtotal + vatAmount;
  const totalPayable = grandTotal - totalSecurity;

  const paid = Number(body.paid) || 0;
  const due = totalPayable - paid;

  return { subtotal, totalQuantity, vatIncluded, vatPercent, vatAmount, grandTotal, totalSecurity, totalPayable, paid, due };
}

const includeList = [
  { model: Party, attributes: ['name'] },
  { model: ChartOfAccount, as: 'Ledger', attributes: ['name', 'code'] },
  { model: Project, attributes: ['name'] },
];

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
    const bills = await LabourBill.findAll({ where, include: includeList, order: [['createdAt', 'DESC']] });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await LabourBill.findByPk(req.params.id, {
      include: [
        { model: Party, attributes: ['name'] },
        { model: ChartOfAccount, as: 'Ledger', attributes: ['name', 'code'] },
        { model: Project, attributes: ['name'] },
        { model: LabourBillItem },
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
    if (!party) return res.status(400).json({ message: 'Contractor is required' });

    const items = cleanItems(req.body.items);
    const totals = computeTotals(req.body, items);

    const bill = await LabourBill.create({
      code: req.body.code || generateCode(),
      date: req.body.date,
      partyId: party,
      ledgerId: req.body.ledger,
      creditLedgerLabel: req.body.creditLedgerLabel,
      projectType: req.body.projectType,
      projectId: req.body.project,
      titleOfWork: req.body.titleOfWork,
      task: req.body.task,
      siteId: req.body.site,
      categoryId: req.body.category,
      refWoNo: req.body.refWoNo,
      attachment: req.body.attachment,
      paymentMethod: req.body.paymentMethod,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await LabourBillItem.create({ ...it, itemId: it.item, labourBillId: bill.id });
    }
    await LabourBillApproval.create({ name: 'Admin', approved: false, labourBillId: bill.id });

    const populated = await LabourBill.findByPk(bill.id, { include: includeList });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await LabourBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const map = { party: 'partyId', ledger: 'ledgerId', project: 'projectId', site: 'siteId', category: 'categoryId' };
    const fields = ['date', 'party', 'ledger', 'creditLedgerLabel', 'projectType', 'project', 'titleOfWork', 'task', 'site', 'category', 'refWoNo', 'attachment', 'vatIncluded', 'vatPercent', 'paymentMethod', 'paid'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) bill[map[key] || key] = req.body[key];
    });

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items);
      await LabourBillItem.destroy({ where: { labourBillId: bill.id } });
      for (const it of items) {
        await LabourBillItem.create({ ...it, itemId: it.item, labourBillId: bill.id });
      }
    } else {
      items = await LabourBillItem.findAll({ where: { labourBillId: bill.id } });
    }

    const totals = computeTotals(req.body, items);
    Object.assign(bill, totals);

    await bill.save();
    const populated = await LabourBill.findByPk(bill.id, { include: includeList });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await LabourBill.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;