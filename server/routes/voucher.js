const router = require('express').Router();
const auth = require('../middleware/auth');
const Voucher = require('../models/Voucher');

const TYPE_PREFIX = {
  Journal: 'JV',
  Payment: 'PV',
  Receipt: 'RV',
  Contra: 'CV',
  Expense: 'EV',
  Purchase: 'PU',
  Sales: 'SV',
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
  const count = await Voucher.countDocuments({ voucherNo: { $regex: `^${fullPrefix}` } });
  const seq = String(count + 1).padStart(4, '0');
  return `${fullPrefix}-${seq}`;
}

router.get('/next-code', auth, async (req, res) => {
  try {
    const type = req.query.type || 'Journal';
    res.json({ code: await generateVoucherNo(type) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// NOTE: this must stay ABOVE router.get('/:id', ...) or Express will treat
// "bank-reconciliation" as an :id param and this route will never be hit.
router.get('/bank-reconciliation', auth, async (req, res) => {
  try {
    const {
      from, to, account, type,
    } = req.query;

    const filter = { bank: { $exists: true, $ne: null } };
    if (type) filter.type = type;
    if (account) filter.bank = account;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const items = await Voucher.find(filter)
      .populate('bank', 'name code')
      .populate('contact', 'name')
      .populate('project', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('GET /api/vouchers/bank-reconciliation failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const {
      type, project, from, to, account, status,
    } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (account) filter['entries.account'] = account;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const items = await Voucher.find(filter)
      .populate('entries.account', 'name code')
      .populate('project', 'name')
      .populate('contact', 'name')
      .sort({ date: -1, createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('GET /api/vouchers failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Voucher.findById(req.params.id)
      .populate('entries.account', 'name code')
      .populate('project', 'name')
      .populate('contact', 'name')
      .populate('bank', 'name code');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      type, date, project, contact, entries, narration, reference,
      bank, chequeDate,
    } = req.body;

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
    const item = await Voucher.create({
      voucherNo,
      type,
      date: date || new Date(),
      project: project || undefined,
      contact: contact || undefined,
      bank: bank || undefined,
      chequeDate: chequeDate || undefined,
      entries,
      narration,
      reference,
      amount: totalDebit,
      addedBy: req.user?.name || 'Admin',
    });

    const populated = await item.populate([
      { path: 'entries.account', select: 'name code' },
      { path: 'project', select: 'name' },
      { path: 'contact', select: 'name' },
      { path: 'bank', select: 'name code' },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/vouchers failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Voucher.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const {
      type, date, project, contact, entries, narration, reference, status,
      bank, chequeDate, reconciliationStatus,
    } = req.body;

    if (entries !== undefined) {
      if (!Array.isArray(entries) || entries.length < 2) {
        return res.status(400).json({ message: 'At least 2 entries are required' });
      }
      const totalDebit = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
      const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return res.status(400).json({ message: `Debits (${totalDebit}) must equal credits (${totalCredit})` });
      }
      item.entries = entries;
      item.amount = totalDebit;
    }

    if (type !== undefined) item.type = type;
    if (date !== undefined) item.date = date;
    if (project !== undefined) item.project = project;
    if (contact !== undefined) item.contact = contact;
    if (narration !== undefined) item.narration = narration;
    if (reference !== undefined) item.reference = reference;
    if (status !== undefined) item.status = status;
    if (bank !== undefined) item.bank = bank;
    if (chequeDate !== undefined) item.chequeDate = chequeDate;
    if (reconciliationStatus !== undefined) item.reconciliationStatus = reconciliationStatus;

    await item.save();
    const populated = await item.populate([
      { path: 'entries.account', select: 'name code' },
      { path: 'project', select: 'name' },
      { path: 'contact', select: 'name' },
      { path: 'bank', select: 'name code' },
    ]);
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
    const item = await Voucher.findByIdAndUpdate(
      req.params.id,
      { reconciliationStatus: status },
      { new: true },
    )
      .populate('bank', 'name code')
      .populate('contact', 'name')
      .populate('project', 'name');
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error('PATCH /api/vouchers/:id/reconciliation-status failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Voucher.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;