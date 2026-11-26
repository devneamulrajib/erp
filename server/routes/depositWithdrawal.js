// server/routes/depositWithdrawal.js
// Deposit & Withdrawal (Accounting). One screen for money coming into or going
// out of a Cash / Bank / MFS account (the BankAccount table).
//
// No new table: every transaction is a normal Voucher + two VoucherEntry lines,
// exactly like the Receipt / Payment voucher pages, so it shows up everywhere
// the ledger is read (Trial Balance, General Ledger, Cash & Bank Book, Bank
// Accounts, Receipt / Payment voucher lists).
//
//   Deposit    -> Voucher type 'Receipt', bankId = account
//                 Dr  ledger head of the account (cash / bank head)
//                 Cr  counter account (where the money came from)
//   Withdrawal -> Voucher type 'Payment', bankId = account
//                 Dr  counter account (where the money went)
//                 Cr  ledger head of the account
//
// Voucher numbers: DEP-YYYY-MMDD-001 / WDR-YYYY-MMDD-001.
// Account balances use the same rule as GET /bank-accounts/summary:
// opening balance + receipts - payments (dishonoured cheques ignored).
//
// Transaction types come from the Office Budget: a withdrawal can be tagged
// with an office expense category (BudgetCategory), and the deposit type
// "Receive Cash" also records the money as an office-fund cash receipt
// (MonthlyBudgetCashReceipt, the same row the Office Budget "Receive Cash"
// button creates), in the same transaction as the voucher.
const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');

const sequelize = require('../config/db');
const auth = require('../middleware/auth');
const { requireModule } = require('../middleware/permissions');
const {
  Voucher, VoucherEntry, ChartOfAccount, BankAccount, Project, BudgetCategory,
} = require('../models/associations');
const MonthlyBudgetCashReceipt = require('../models/MonthlyBudgetCashReceipt');
const OfficeAccountDefault = require('../models/OfficeAccountDefault');
const logActivity = require('../utils/activityLog');

const RECEIVE_CASH = 'Receive Cash';

const isAdminRole = (user) => ['superadmin', 'admin'].includes(user?.role);

// Same folder as the generic voucher route, so attachments open the same way.
const uploadDir = path.join(__dirname, '..', 'uploads', 'vouchers');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.pdf'];
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ok = ALLOWED_EXT.includes(path.extname(file.originalname || '').toLowerCase());
    cb(ok ? null : Object.assign(new Error('Attachment must be JPG, PNG or PDF'), { status: 400 }), ok);
  },
});

// multer errors (too large / wrong type) answer 400 instead of 500.
function uploadAttachment(req, res, next) {
  upload.single('attachment')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Attachment must be 5MB or smaller' : err.message;
    return res.status(err.status || 400).json({ message });
  });
}

const KINDS = {
  deposit: { type: 'Receipt', prefix: 'DEP' },
  withdrawal: { type: 'Payment', prefix: 'WDR' },
};
const KIND_BY_TYPE = { Receipt: 'deposit', Payment: 'withdrawal' };

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const clean = (v) => String(v ?? '').trim();

// Cash / Bank / MFS from the account name (BankAccount has no type column).
function accountTypeOf(name) {
  const n = String(name || '').toLowerCase();
  if (/(bkash|b-kash|nagad|rocket|upay|\bmfs\b|mobile)/.test(n)) return 'MFS';
  if (/bank/.test(n)) return 'Bank';
  if (/(cash|petty|in hand)/.test(n)) return 'Cash';
  return 'Bank';
}

// YYYY-MM-DD -> local Date at the start / end of that day.
function dayStart(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function dayEnd(value) {
  const d = dayStart(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

// Date range from the query; default = this month up to today.
function readRange(query) {
  const now = new Date();
  const start = (query.from && dayStart(query.from)) || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = (query.to && dayEnd(query.to)) || dayEnd(now);
  return { start, end };
}

// Highest existing suffix for today's prefix (not a row count), so a deleted
// voucher can never cause a duplicate number.
async function generateVoucherNo(kind, t) {
  const d = new Date();
  const prefix = `${KINDS[kind].prefix}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const last = await Voucher.findOne({
    where: { voucherNo: { [Op.like]: `${prefix}-%` } },
    order: [['voucherNo', 'DESC']],
    transaction: t,
  });
  const lastSeq = last ? parseInt(String(last.voucherNo).split('-').pop(), 10) || 0 : 0;
  return `${prefix}-${String(lastSeq + 1).padStart(3, '0')}`;
}

// All accounts with their live balance and last movement date.
async function loadAccountBalances() {
  const banks = await BankAccount.findAll({ order: [['name', 'ASC']] });
  const vouchers = await Voucher.findAll({
    where: { bankId: { [Op.ne]: null }, reconciliationStatus: { [Op.ne]: 'DisHonour' } },
    attributes: ['id', 'type', 'bankId', 'amount', 'date'],
  });

  // Receipt/Payment move the bank by the voucher amount; other types by their lines.
  const otherIds = vouchers.filter((v) => !KIND_BY_TYPE[v.type]).map((v) => v.id);
  const linesByVoucher = {};
  if (otherIds.length) {
    const lines = await VoucherEntry.findAll({ where: { voucherId: { [Op.in]: otherIds } } });
    lines.forEach((l) => {
      (linesByVoucher[l.voucherId] = linesByVoucher[l.voucherId] || []).push(l);
    });
  }

  const byId = {};
  banks.forEach((b) => {
    byId[b.id] = {
      id: b.id,
      name: b.name,
      accountType: accountTypeOf(b.name),
      opening: Number(b.balance) || 0,
      balance: Number(b.balance) || 0,
      lastUpdated: b.lastUpdated || null,
    };
  });

  vouchers.forEach((v) => {
    const acc = byId[v.bankId];
    if (!acc) return;
    const amt = Number(v.amount) || 0;
    if (v.type === 'Receipt') acc.balance += amt;
    else if (v.type === 'Payment') acc.balance -= amt;
    else (linesByVoucher[v.id] || []).forEach((l) => { acc.balance += (Number(l.debit) || 0) - (Number(l.credit) || 0); });
    if (v.date && (!acc.lastUpdated || new Date(v.date) > new Date(acc.lastUpdated))) acc.lastUpdated = v.date;
  });

  return Object.values(byId);
}

function filterByType(accounts, accountType) {
  if (!accountType || accountType === 'all') return accounts;
  return accounts.filter((a) => a.accountType.toLowerCase() === String(accountType).toLowerCase());
}

function publicRow(v, accountNames) {
  const entries = v.entries || [];
  return {
    id: v.id,
    kind: KIND_BY_TYPE[v.type],
    type: v.type,
    voucherNo: v.voucherNo,
    date: v.date,
    amount: Number(v.amount) || 0,
    bankId: v.bankId,
    accountName: v.bank?.name || '',
    accountType: accountTypeOf(v.bank?.name),
    projectId: v.projectId,
    projectName: v.project?.name || '',
    transactionType: v.paymentType || '',
    paymentMethod: v.paymentMethod || '',
    description: v.narration || '',
    reference: v.reference || '',
    chequeNo: v.chequeReceiptNo || '',
    attachment: v.attachment || '',
    status: v.status || 'pending',
    reconciliationStatus: v.reconciliationStatus,
    addedBy: v.addedBy || '',
    createdAt: v.createdAt,
    entries: entries.map((e) => ({
      accountId: e.accountId,
      accountName: e.account?.name || accountNames?.[e.accountId] || '',
      accountCode: e.account?.code || '',
      debit: Number(e.debit) || 0,
      credit: Number(e.credit) || 0,
    })),
  };
}

const rowIncludes = [
  { model: VoucherEntry, as: 'entries', include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'name', 'code'] }] },
  { model: BankAccount, as: 'bank', attributes: ['id', 'name'] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
];

// Only Accounting users (accountant role, Accounting section, admins).
router.use(auth, requireModule('accounts'));

// Dropdown data for the form: accounts (with type + balance), chart of
// accounts and projects, in one call.
router.get('/options', async (req, res) => {
  try {
    const [accounts, chart, projects, categories, defaults] = await Promise.all([
      loadAccountBalances(),
      ChartOfAccount.findAll({ attributes: ['id', 'name', 'code'], order: [['name', 'ASC']] }),
      Project.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] }),
      BudgetCategory.findAll({ attributes: ['id', 'name', 'parentId', 'defaultDrAccount'], order: [['name', 'ASC']] }),
      OfficeAccountDefault.findOne(),
    ]);
    res.json({
      accounts,
      chartOfAccounts: chart,
      projects,
      // Office expense categories (Office Budget) for the transaction type list.
      budgetCategories: categories,
      // Office ledger heads per payment channel (chart-of-account names).
      accountDefaults: {
        cashAccount: defaults?.cashAccount || '',
        bankAccount: defaults?.bankAccount || '',
        chequeAccount: defaults?.chequeAccount || '',
      },
    });
  } catch (err) {
    console.error('GET /api/deposit-withdrawals/options failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/next-code', async (req, res) => {
  try {
    const kind = KINDS[req.query.kind] ? req.query.kind : 'deposit';
    res.json({ code: await generateVoucherNo(kind) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stat cards + account balances table.
router.get('/summary', async (req, res) => {
  try {
    const { start, end } = readRange(req.query);
    const accounts = await loadAccountBalances();
    const shown = filterByType(accounts, req.query.accountType);
    const ids = shown.map((a) => a.id);

    // Same-length period right before, for the % change.
    const span = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - span);

    const sumFor = async (type, from, to) => {
      if (!ids.length) return 0;
      const total = await Voucher.sum('amount', {
        where: {
          type,
          bankId: { [Op.in]: ids },
          reconciliationStatus: { [Op.ne]: 'DisHonour' },
          date: { [Op.gte]: from, [Op.lte]: to },
        },
      });
      return Number(total) || 0;
    };

    const [deposit, withdrawal, prevDeposit, prevWithdrawal] = await Promise.all([
      sumFor('Receipt', start, end),
      sumFor('Payment', start, end),
      sumFor('Receipt', prevStart, prevEnd),
      sumFor('Payment', prevStart, prevEnd),
    ]);
    const change = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null);
    const balanceOf = (type) => shown.filter((a) => a.accountType === type).reduce((s, a) => s + a.balance, 0);

    res.json({
      from: start,
      to: end,
      totalDeposit: deposit,
      totalWithdrawal: withdrawal,
      depositChange: change(deposit, prevDeposit),
      withdrawalChange: change(withdrawal, prevWithdrawal),
      cashBalance: balanceOf('Cash'),
      bankBalance: balanceOf('Bank'),
      mfsBalance: balanceOf('MFS'),
      totalBalance: shown.reduce((s, a) => s + a.balance, 0),
      accounts: shown,
    });
  } catch (err) {
    console.error('GET /api/deposit-withdrawals/summary failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Recent deposits / withdrawals (every Receipt / Payment voucher that moves a
// Cash / Bank / MFS account), newest first.
router.get('/', async (req, res) => {
  try {
    const { start, end } = readRange(req.query);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 200);
    const where = {
      type: { [Op.in]: ['Receipt', 'Payment'] },
      bankId: { [Op.ne]: null },
      date: { [Op.gte]: start, [Op.lte]: end },
    };
    if (KINDS[req.query.kind]) where.type = KINDS[req.query.kind].type;
    if (req.query.accountType && req.query.accountType !== 'all') {
      const accounts = filterByType(await BankAccount.findAll({ attributes: ['id', 'name'] })
        .then((rows) => rows.map((b) => ({ id: b.id, accountType: accountTypeOf(b.name) }))), req.query.accountType);
      where.bankId = { [Op.in]: accounts.length ? accounts.map((a) => a.id) : [0] };
    }
    const rows = await Voucher.findAll({
      where,
      include: rowIncludes,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });
    res.json(rows.map((v) => publicRow(v)));
  } catch (err) {
    console.error('GET /api/deposit-withdrawals failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const v = await Voucher.findByPk(req.params.id, { include: rowIncludes });
    if (!v || !KIND_BY_TYPE[v.type]) return res.status(404).json({ message: 'Not found' });
    res.json(publicRow(v));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save & Post: the voucher and both ledger lines are written in one
// transaction (all or nothing). Admin entries are approved straight away;
// other users' entries are posted with status 'pending' like the other
// voucher pages, so an admin can still review them.
router.post('/', uploadAttachment, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const kind = clean(req.body.kind).toLowerCase();
    if (!KINDS[kind]) throw fail('Choose Deposit or Withdrawal');

    const amount = Number(req.body.amount);
    const bankId = Number(req.body.account) || null;
    const ledgerAccountId = Number(req.body.ledgerAccount) || null;
    const counterAccountId = Number(req.body.counterAccount) || null;
    const transactionType = clean(req.body.transactionType);
    const description = clean(req.body.description);
    const paymentMethod = clean(req.body.paymentMethod);
    const date = dayStart(req.body.date);

    if (!transactionType) throw fail('Transaction Type is required');
    if (!date) throw fail('Date is required');
    if (!description) throw fail('Reference / Description is required');
    if (!bankId) throw fail('Account is required');
    if (!(amount > 0)) throw fail('Amount must be greater than 0');
    if (!paymentMethod) throw fail('Payment Method is required');
    if (!ledgerAccountId) throw fail('Ledger head for the account is required');
    if (!counterAccountId) throw fail(kind === 'deposit' ? 'Received From account is required' : 'Paid To account is required');
    if (ledgerAccountId === counterAccountId) throw fail('Ledger head and counter account must be different');

    const bank = await BankAccount.findByPk(bankId, { transaction: t });
    if (!bank) throw fail('Selected account was not found');
    const heads = await ChartOfAccount.findAll({
      where: { id: { [Op.in]: [ledgerAccountId, counterAccountId] } },
      attributes: ['id'],
      transaction: t,
    });
    if (heads.length !== 2) throw fail('Selected chart of account was not found');
    const projectId = Number(req.body.project) || null;
    if (projectId && !(await Project.findByPk(projectId, { attributes: ['id'], transaction: t }))) {
      throw fail('Selected project was not found');
    }
    const budgetCategoryId = Number(req.body.budgetCategory) || null;
    if (budgetCategoryId && !(await BudgetCategory.findByPk(budgetCategoryId, { attributes: ['id'], transaction: t }))) {
      throw fail('Selected office category was not found');
    }
    const isReceiveCash = kind === 'deposit' && transactionType === RECEIVE_CASH;

    const isCheque = paymentMethod === 'Cheque';
    const voucher = await Voucher.create({
      voucherNo: await generateVoucherNo(kind, t),
      type: KINDS[kind].type,
      date,
      projectId,
      bankId,
      ifCheque: isCheque,
      chequeReceiptNo: isCheque ? clean(req.body.chequeNo) : '',
      chequeDate: isCheque ? date : null,
      narration: description,
      reference: clean(req.body.reference),
      amount,
      paymentMethod,
      paymentType: transactionType,
      attachment: req.file ? `/uploads/vouchers/${req.file.filename}` : '',
      addedBy: req.user?.name || 'Admin',
      status: isAdminRole(req.user) ? 'approved' : 'pending',
    }, { transaction: t });

    const lines = kind === 'deposit'
      ? [
        { accountId: ledgerAccountId, debit: amount, credit: 0 },
        { accountId: counterAccountId, debit: 0, credit: amount },
      ]
      : [
        { accountId: counterAccountId, debit: amount, credit: 0 },
        { accountId: ledgerAccountId, debit: 0, credit: amount },
      ];
    await VoucherEntry.bulkCreate(
      lines.map((l) => ({ ...l, note: description.slice(0, 250), voucherId: voucher.id })),
      { transaction: t },
    );

    // "Receive Cash" also counts as office-fund cash received for that month.
    let cashReceipt = null;
    if (isReceiveCash) {
      const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      cashReceipt = await MonthlyBudgetCashReceipt.create({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        budgetCategoryId,
        amount,
        receivedDate: ymd,
        receivedFrom: clean(req.body.receivedFrom) || 'Management',
        paymentMethod,
        referenceNo: voucher.voucherNo,
        note: description.slice(0, 250),
        receivedBy: req.user?.name || 'Accounts Manager',
      }, { transaction: t });
    }

    await t.commit();
    if (cashReceipt) {
      try {
        await logActivity({
          module: 'Budget',
          action: 'CashReceived',
          message: `Recorded cash receipt of ৳${amount.toLocaleString()} (${voucher.voucherNo}) for ${cashReceipt.month}/${cashReceipt.year}`,
          amount,
          budgetCategoryId,
          relatedType: 'MonthlyBudgetCashReceipt',
          relatedId: cashReceipt.id,
          performedBy: req.user?.name || 'Accounts Manager',
        });
      } catch (logErr) {
        console.error('Deposit cash-receipt activity log failed:', logErr.message);
      }
    }
    const saved = await Voucher.findByPk(voucher.id, { include: rowIncludes });
    res.status(201).json(publicRow(saved));
  } catch (err) {
    await t.rollback();
    if (req.file) fs.unlink(req.file.path, () => {});
    if (!err.status) console.error('POST /api/deposit-withdrawals failed:', err);
    res.status(err.status || 500).json({ message: err.message });
  }
});

module.exports = router;
