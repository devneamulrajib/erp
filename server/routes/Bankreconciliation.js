const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { PaymentVoucher, ReceiptVoucher, ContraVoucher } = require('../models/associations');

// Bank Reconciliation used to read from the generic Voucher/VoucherEntry
// ledger table, but none of the actual voucher pages (Payment, Receipt,
// Contra) write to that table — they each have their own dedicated table.
// So this reads from the real three, unioned together, the same fix
// pattern already applied to Day Book and Expense Report.

function normalize(row, voucherType, amountField = 'amount') {
  return {
    // Composite id ("Payment-12") since ids are not unique across the
    // three source tables — the frontend and the PATCH route below both
    // treat this as an opaque identifier, not a raw numeric id.
    id: `${voucherType}-${row.id}`,
    voucherType,
    voucherNo: row.voucherNo,
    date: row.date,
    chequeDate: row.chequeDate,
    amount: Number(row[amountField]) || 0,
    bank: { name: row.bankAccount },
    contact: { name: row.debitAccount || row.creditAccount || '' },
    narration: row.comment,
    reconciliationStatus: row.reconciliationStatus || 'Pending',
  };
}

async function fetchRows({ from, to, account, type }) {
  const dateWhere = {};
  if (from) dateWhere[Op.gte] = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    dateWhere[Op.lte] = end;
  }

  async function fetchOne(Model, voucherType, amountField) {
    if (type && type !== voucherType) return [];
    // Only vouchers that actually have a bank account attached can ever be
    // reconciled against a bank statement.
    const where = { bankAccount: { [Op.ne]: null } };
    if (account) where.bankAccount = account;
    if (from || to) where.date = dateWhere;
    const rows = await Model.findAll({ where, order: [['date', 'DESC'], ['createdAt', 'DESC']] });
    return rows.map((r) => normalize(r, voucherType, amountField));
  }

  const [payments, receipts, contras] = await Promise.all([
    fetchOne(PaymentVoucher, 'Payment', 'amount'),
    fetchOne(ReceiptVoucher, 'Receipt', 'amount'),
    fetchOne(ContraVoucher, 'Contra', 'totalDebit'),
  ]);

  return [...payments, ...receipts, ...contras].sort((a, b) => new Date(b.date) - new Date(a.date));
}

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, account, type } = req.query;
    const rows = await fetchRows({ from, to, account, type });
    res.json(rows);
  } catch (err) {
    console.error('GET /api/bank-reconciliation failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:compositeId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Honour', 'DisHonour'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const sep = req.params.compositeId.indexOf('-');
    const voucherType = req.params.compositeId.slice(0, sep);
    const rawId = req.params.compositeId.slice(sep + 1);

    const MODEL_MAP = { Payment: PaymentVoucher, Receipt: ReceiptVoucher, Contra: ContraVoucher };
    const AMOUNT_FIELD = { Payment: 'amount', Receipt: 'amount', Contra: 'totalDebit' };
    const Model = MODEL_MAP[voucherType];
    if (!Model) return res.status(400).json({ message: 'Unknown voucher type' });

    const item = await Model.findByPk(rawId);
    if (!item) return res.status(404).json({ message: 'Not found' });

    item.reconciliationStatus = status;
    await item.save();

    res.json(normalize(item, voucherType, AMOUNT_FIELD[voucherType]));
  } catch (err) {
    console.error('PATCH /api/bank-reconciliation/:id/status failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;