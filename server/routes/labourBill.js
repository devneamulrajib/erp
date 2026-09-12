const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  LabourBill, LabourBillItem, LabourBillApproval, Party, ChartOfAccount, Project, ProjectType,
} = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'labour-bills');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

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

  // Status is derived automatically from paid vs totalPayable whenever the
  // bill's amounts change. Use the dedicated /:id/status endpoint to set
  // it directly (e.g. a "Mark as Paid" action) without recomputing items.
  let status = 'unpaid';
  if (paid > 0 && due <= 0) status = 'paid';
  else if (paid > 0) status = 'partial';

  return { subtotal, totalQuantity, vatIncluded, vatPercent, vatAmount, grandTotal, totalSecurity, totalPayable, paid, due, status };
}

const includeList = [
  { model: Party, as: 'party', attributes: ['name'] },
  { model: ChartOfAccount, as: 'ledger', attributes: ['name', 'code'] },
  { model: Project, as: 'project', attributes: ['name'] },
];

// Project Type is stored as a raw ProjectType id (see the "Project Type"
// dropdown on the bill form), never as a name — so it has to be resolved
// to a readable name here before sending bills to the frontend.
async function attachProjectTypeNames(bills) {
  const ids = [...new Set(bills.map((b) => b.projectType).filter(Boolean))];
  if (!ids.length) return bills.map((b) => ({ ...b, projectTypeName: null }));
  const types = await ProjectType.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name'] });
  const nameById = Object.fromEntries(types.map((t) => [String(t.id), t.name]));
  return bills.map((b) => ({ ...b, projectTypeName: nameById[String(b.projectType)] || null }));
}

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
    const withNames = await attachProjectTypeNames(bills.map((b) => b.toJSON()));
    res.json(withNames);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const bill = await LabourBill.findByPk(req.params.id, {
      include: [
        { model: Party, as: 'party', attributes: ['name'] },
        { model: ChartOfAccount, as: 'ledger', attributes: ['name', 'code'] },
        { model: Project, as: 'project', attributes: ['name'] },
        { model: LabourBillItem },
      ],
    });
    if (!bill) return res.status(404).json({ message: 'Not found' });
    const [withNames] = await attachProjectTypeNames([bill.toJSON()]);
    res.json(withNames);
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
      paymentMethod: req.body.paymentMethod,
      ...totals,
      addedBy: req.user?.name || 'Admin',
    });

    for (const it of items) {
      await LabourBillItem.create({ ...it, itemId: it.item, labourBillId: bill.id });
    }
    await LabourBillApproval.create({ name: 'Admin', approved: false, labourBillId: bill.id });

    const populated = await LabourBill.findByPk(bill.id, { include: includeList });
    const [withNames] = await attachProjectTypeNames([populated.toJSON()]);
    res.status(201).json(withNames);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const bill = await LabourBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    const map = { party: 'partyId', ledger: 'ledgerId', project: 'projectId', site: 'siteId', category: 'categoryId' };
    const fields = ['date', 'party', 'ledger', 'creditLedgerLabel', 'projectType', 'project', 'titleOfWork', 'task', 'site', 'category', 'refWoNo', 'vatIncluded', 'vatPercent', 'paymentMethod', 'paid'];
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
    const [withNames] = await attachProjectTypeNames([populated.toJSON()]);
    res.json(withNames);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Quick status change — "Mark as Paid" sets paid = totalPayable (due 0);
// "Mark as Unpaid" resets paid to 0. Doesn't touch items/amounts otherwise.
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['paid', 'unpaid'].includes(status)) {
      return res.status(400).json({ message: 'status must be "paid" or "unpaid"' });
    }
    const bill = await LabourBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });

    if (status === 'paid') {
      bill.paid = bill.totalPayable;
      bill.due = 0;
      bill.status = 'paid';
    } else {
      bill.paid = 0;
      bill.due = bill.totalPayable;
      bill.status = 'unpaid';
    }

    await bill.save();
    const populated = await LabourBill.findByPk(bill.id, { include: includeList });
    const [withNames] = await attachProjectTypeNames([populated.toJSON()]);
    res.json(withNames);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Real file upload — mirrors ContractorBill's attachment endpoint. The
// previous version only stored the filename as text with no actual file
// on disk, so any link to it always failed.
router.post('/:id/attachment', auth, (req, res, next) => {
  upload.single('attachment')(req, res, (err) => {
    if (err) {
      console.error('Attachment upload failed:', err);
      return res.status(400).json({ message: `File upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const bill = await LabourBill.findByPk(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Not found' });
    if (req.file) {
      bill.attachment = `/uploads/labour-bills/${req.file.filename}`;
      await bill.save();
    }
    res.json({ attachment: bill.attachment });
  } catch (err) {
    console.error('Saving attachment failed:', err);
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