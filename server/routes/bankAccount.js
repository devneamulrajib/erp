const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { BankAccount, Voucher, VoucherEntry } = require('../models/associations');

// Receipt adds to the bank, Payment subtracts. Other types use their entries.
function movementsOf(v, entriesByVoucher) {
  const amt = Number(v.amount) || 0;
  if (v.type === 'Receipt') return [{ debit: amt, credit: 0 }];
  if (v.type === 'Payment') return [{ debit: 0, credit: amt }];
  return (entriesByVoucher[v.id] || []).map((e) => ({
    debit: Number(e.debit) || 0,
    credit: Number(e.credit) || 0,
  }));
}

async function loadEntries(vouchers) {
  const ids = vouchers.filter((v) => v.type !== 'Receipt' && v.type !== 'Payment').map((v) => v.id);
  const map = {};
  if (!ids.length) return map;
  const entries = await VoucherEntry.findAll({ where: { voucherId: { [Op.in]: ids } } });
  entries.forEach((e) => {
    if (!map[e.voucherId]) map[e.voucherId] = [];
    map[e.voucherId].push(e);
  });
  return map;
}

// Live balance for every bank: opening balance + receipts - payments
router.get('/summary', auth, async (req, res) => {
  try {
    const banks = await BankAccount.findAll();
    const vouchers = await Voucher.findAll({
      where: {
        bankId: { [Op.ne]: null },
        reconciliationStatus: { [Op.ne]: 'DisHonour' },
      },
    });
    const entriesByVoucher = await loadEntries(vouchers);

    const out = {};
    banks.forEach((b) => {
      out[b.id] = { current: Number(b.balance) || 0, received: 0, paid: 0, pendingCheques: 0 };
    });

    vouchers.forEach((v) => {
      const s = out[v.bankId];
      if (!s) return;
      movementsOf(v, entriesByVoucher).forEach((m) => {
        s.current += m.debit - m.credit;
        s.received += m.debit;
        s.paid += m.credit;
      });
      if (v.ifCheque && v.reconciliationStatus === 'Pending') {
        s.pendingCheques += Number(v.amount) || 0;
      }
    });

    res.json(out);
  } catch (err) {
    console.error('GET /bank-accounts/summary failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Transactions of one bank, newest first, with running balance
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const bank = await BankAccount.findByPk(req.params.id);
    if (!bank) return res.status(404).json({ message: 'Not found' });

    const vouchers = await Voucher.findAll({
      where: { bankId: bank.id },
      order: [['date', 'ASC'], ['id', 'ASC']],
    });
    const entriesByVoucher = await loadEntries(vouchers);

    const opening = Number(bank.balance) || 0;
    let running = opening;
    const rows = [];

    vouchers.forEach((v) => {
      const dishonoured = v.reconciliationStatus === 'DisHonour';
      movementsOf(v, entriesByVoucher).forEach((m) => {
        if (!dishonoured) running += m.debit - m.credit;
        rows.push({
          id: v.id,
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          description: v.narration || v.type,
          method: v.paymentMethod || (v.ifCheque ? 'Cheque' : ''),
          chequeNo: v.chequeReceiptNo || '',
          status: v.ifCheque ? v.reconciliationStatus : '',
          debit: m.debit,
          credit: m.credit,
          balance: running,
        });
      });
    });

    res.json({
      bankId: bank.id,
      bankName: bank.name,
      opening,
      closing: running,
      rows: rows.reverse().slice(0, 200),
    });
  } catch (err) {
    console.error('GET /bank-accounts/:id/transactions failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const items = await BankAccount.findAll({ order: [['name', 'ASC']] });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, balance } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const item = await BankAccount.create({
      name,
      balance: Number(balance) || 0,
      lastUpdated: new Date(),
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await BankAccount.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    const { name, balance } = req.body;
    if (name !== undefined) item.name = name;
    if (balance !== undefined) item.balance = Number(balance) || 0;
    item.lastUpdated = new Date();
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await BankAccount.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;