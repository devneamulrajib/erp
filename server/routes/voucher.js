const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Voucher, VoucherEntry, VoucherApproval } = require('../models/associations');

const uploadDir = path.join(__dirname, '..', 'uploads', 'vouchers');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const TYPE_PREFIX = {
  Journal: 'JV', Payment: 'PV', Receipt: 'RV', Contra: 'CV',
  Expense: 'EV', Purchase: 'PU', Sales: 'SV',
};

function todayPrefix() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

async function generateVoucherNo(type) {
  const prefix = TYPE_PREFIX[type] || 'JV';
  const datePart = todayPrefix();
  const fullPrefix = `${prefix}${datePart}`;
  const count = await Voucher.count({ where: { voucherNo: { [Op.like]: `${fullPrefix}%` } } });
  const seq = String(count + 1).padStart(4, '0');
  return `${fullPrefix}-${seq}`;
}

const includeAll = [{ model: VoucherEntry }, { model: VoucherApproval }];

router.get('/next-code', auth, async (req, res) => {
  try {
    const type = req.query.type || 'Journal';
    res.json({ code: await generateVoucherNo(type) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/bank-reconciliation', auth, async (req, res) => {
  try {
    const { from, to, account, type } = req.query;
    const where = { bankId: { [Op.ne]: null } };
    if (type) where.type = type;
    if (account) where.bankId = account;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.date[Op.lte] = end;
      }
    }

    const items = await Voucher.findAll({
      where,
      include: includeAll,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    console.error('GET /api/vouchers/bank-reconciliation failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { type, project, from, to, account, status } = req.query;
    const where = {};
    if (type) where.type = type;
    if (project) where.projectId = project;
    if (status) where.status = status;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.date[Op.lte] = end;
      }
    }

      const include = [
      account ? { model: VoucherEntry, where: { accountId: account } } : { model: VoucherEntry },
      { model: VoucherApproval },
    ];

    const items = await Voucher.findAll({
      where,
      include,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    console.error('GET /api/vouchers failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Voucher.findByPk(req.params.id, { include: includeAll });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const {
      type, date, project, contact, narration, reference, bank, chequeDate,
      projectType, titleOfWork, task, site, item, ifCheque, chequeReceiptNo,
      paymentMethod, paymentType, installment,
    } = req.body;
    let entries = req.body.entries;
    if (typeof entries === 'string') entries = JSON.parse(entries);

    if (!type) return res.status(400).json({ message: 'Type is required' });
    if (!Array.isArray(entries) || entries.length < 2) {
      return res.status(400).json({ message: 'At least 2 entries are required' });
    }

    const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
    const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: `Debits (${totalDebit}) must equal credits (${totalCredit})` });
    }

    const voucherNo = req.body.voucherNo || await generateVoucherNo(type);
    const created = await Voucher.create({
      voucherNo,
      type,
      date: date || new Date(),
      projectId: project || null,
      contactId: contact || null,
      bankId: bank || null,
      chequeDate: chequeDate || null,
      ifCheque: ifCheque === 'true' || ifCheque === true,
      chequeReceiptNo: chequeReceiptNo || '',
      narration,
      reference,
      projectType: projectType || '',
      titleOfWork: titleOfWork || '',
      task: task || '',
      site: site || '',
      item: item || '',
      paymentMethod: paymentMethod || '',
      paymentType: paymentType || '',
      installment: installment || '',
      amount: totalDebit,
      attachment: req.file ? `/uploads/vouchers/${req.file.filename}` : '',
      addedBy: req.user?.name || 'Admin',
    });

    for (const e of entries) {
      await VoucherEntry.create({
        accountId: e.account,
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0,
        note: e.note,
        voucherId: created.id,
      });
    }

    const populated = await Voucher.findByPk(created.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/vouchers failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.single('attachment'), async (req, res) => {
  try {
    const item = await Voucher.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const {
      type, date, project, contact, narration, reference, status,
      bank, chequeDate, reconciliationStatus,
      projectType, titleOfWork, task, site, ifCheque, chequeReceiptNo,
      paymentMethod, paymentType, installment,
    } = req.body;
    const itemField = req.body.item;
    let entries = req.body.entries;
    if (typeof entries === 'string') entries = JSON.parse(entries);

    if (entries !== undefined) {
      if (!Array.isArray(entries) || entries.length < 2) {
        return res.status(400).json({ message: 'At least 2 entries are required' });
      }
      const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
      const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: `Debits (${totalDebit}) must equal credits (${totalCredit})` });
      }
      await VoucherEntry.destroy({ where: { voucherId: item.id } });
      for (const e of entries) {
        await VoucherEntry.create({
          accountId: e.account,
          debit: Number(e.debit) || 0,
          credit: Number(e.credit) || 0,
          note: e.note,
          voucherId: item.id,
        });
      }
      item.amount = totalDebit;
    }

    if (type !== undefined) item.type = type;
    if (date !== undefined) item.date = date;
    if (project !== undefined) item.projectId = project;
    if (contact !== undefined) item.contactId = contact;
    if (narration !== undefined) item.narration = narration;
    if (reference !== undefined) item.reference = reference;
    if (status !== undefined) item.status = status;
    if (bank !== undefined) item.bankId = bank;
    if (chequeDate !== undefined) item.chequeDate = chequeDate;
    if (reconciliationStatus !== undefined) item.reconciliationStatus = reconciliationStatus;
    if (ifCheque !== undefined) item.ifCheque = ifCheque === 'true' || ifCheque === true;
    if (chequeReceiptNo !== undefined) item.chequeReceiptNo = chequeReceiptNo;
    if (projectType !== undefined) item.projectType = projectType;
    if (titleOfWork !== undefined) item.titleOfWork = titleOfWork;
    if (task !== undefined) item.task = task;
    if (site !== undefined) item.site = site;
    if (itemField !== undefined) item.item = itemField;
    if (paymentMethod !== undefined) item.paymentMethod = paymentMethod;
    if (paymentType !== undefined) item.paymentType = paymentType;
    if (installment !== undefined) item.installment = installment;
    if (req.file) item.attachment = `/uploads/vouchers/${req.file.filename}`;
    item.editedBy = req.user?.name || item.editedBy;

    await item.save();
    const populated = await Voucher.findByPk(item.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    console.error('PUT /api/vouchers failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/reconciliation-status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Honour', 'DisHonour'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const item = await Voucher.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    item.reconciliationStatus = status;
    await item.save();

    const populated = await Voucher.findByPk(item.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    console.error('PATCH /api/vouchers/:id/reconciliation-status failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Voucher.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;