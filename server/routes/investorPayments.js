// server/routes/investorPayments.js
// Payouts to investors, money received from investors (both can be split across
// Cash / Bank / Cheque lines with attachments) and the investor's bank accounts.
// Each line also posts a ledger voucher (see utils/investorLedger.js).
// Mounted from routes/investor.js, so paths are under /investor-management.
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const db = require('../config/db');
const { Investor, Investment, InvestorPayment, BankAccount } = require('../models/associations');
const InvestorBankAccount = require('../models/InvestorBankAccount');
const InvestorPaymentLine = require('../models/InvestorPaymentLine');
const InvestmentReceipt = require('../models/InvestmentReceipt');
const logActivity = require('../utils/activityLog');
const { postParentLines } = require('../utils/investorLedger');

const sequelize = db.sequelize || db;

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'investor-payments');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const METHODS = ['Cash', 'Bank', 'Cheque'];
const PAYMENT_TYPES = ['profit_distribution', 'principal_return', 'combined'];
const ALLOWED_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const MAX_LINES = 10;

/* ------------------------------- Helpers ------------------------------- */

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
const bad = (message) => new HttpError(message, 400);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const clean = (v, max = 150) => {
  const s = String(v ?? '').trim();
  return s ? s.slice(0, max) : null;
};
const validDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
const todayStr = () => new Date().toISOString().slice(0, 10);
const bdt = (n) => `৳ ${Number(n || 0).toLocaleString('en-IN')}`;

const who = (req) => req.user?.name || req.user?.username || req.user?.email || 'Admin';
const short = (s) => String(s || '').slice(0, 240);
const safeLog = async (req, investorId, action, message, amount) => {
  try {
    await logActivity({
      module: 'Investor',
      action,
      message: short(message),
      amount,
      relatedType: 'Investor',
      relatedId: Number(investorId),
      performedBy: who(req),
    });
  } catch (err) {
    console.warn('Activity log skipped:', err.message);
  }
};

async function nextCode(Model, prefix, width, transaction) {
  const last = Number(await Model.max('id', { transaction })) || 0;
  return `${prefix}-${String(last + 1).padStart(width, '0')}`;
}

// Staff only: portal-type users must never reach these routes
const staffOnly = [
  auth,
  (req, res, next) => {
    if (['investor', 'customer', 'supplier'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    next();
  },
];

/* -------------------------------- Uploads ------------------------------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: MAX_LINES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('Attachments must be a PDF or an image (PNG, JPG, WEBP).'));
  },
});

const uploadAny = (req, res, next) =>
  upload.any()(req, res, (err) => {
    if (!err) return next();
    (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'An attachment is too large (10 MB max).' : err.message;
    res.status(400).json({ message });
  });

// Wraps a handler so uploaded files are removed whenever it fails
const handle = (label, fn) => async (req, res) => {
  const files = req.files || [];
  const cleanup = () => files.forEach((f) => fs.unlink(f.path, () => {}));
  try {
    await fn(req, res, files);
  } catch (err) {
    cleanup();
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(`${label} error:`, err);
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------- Payment lines ---------------------------- */

/**
 * Reads and validates the `lines` JSON (+ file_<index> uploads) from a multipart request.
 * Returns clean line objects plus any new investor bank accounts to save.
 */
async function buildLines(req, investorId, investorName) {
  let raw;
  try {
    raw = JSON.parse(req.body.lines || '[]');
  } catch {
    throw bad('The payment lines could not be read. Please try again.');
  }
  if (!Array.isArray(raw) || raw.length === 0) throw bad('Add at least one payment line.');
  if (raw.length > MAX_LINES) throw bad(`Use at most ${MAX_LINES} payment lines.`);

  const fileMap = {};
  (req.files || []).forEach((f) => {
    fileMap[f.fieldname] = f;
  });

  const saved = await InvestorBankAccount.findAll({ where: { investorId } });
  const savedMap = {};
  saved.forEach((a) => {
    savedMap[a.id] = a;
  });

  const bankIds = [...new Set(raw.map((l) => Number(l?.bankAccountId)).filter(Boolean))];
  const companyBanks = bankIds.length ? await BankAccount.findAll({ where: { id: bankIds } }) : [];
  const companyMap = {};
  companyBanks.forEach((b) => {
    companyMap[b.id] = b;
  });

  const lines = [];
  const newBanks = [];

  raw.forEach((l, i) => {
    const n = i + 1;
    const method = METHODS.includes(l?.method) ? l.method : null;
    if (!method) throw bad(`Line ${n}: choose Cash, Bank or Cheque.`);

    const amount = round2(l.amount);
    if (!(amount > 0)) throw bad(`Line ${n}: enter an amount greater than 0.`);

    const line = {
      method,
      amount,
      bankAccountId: null,
      investorBankAccountId: null,
      bankName: null,
      accountName: null,
      accountNumber: null,
      branch: null,
      referenceNo: clean(l.referenceNo, 120),
      chequeNo: null,
      chequeDate: null,
      attachment: null,
      attachmentName: null,
    };

    let companyBank = null;
    if (method !== 'Cash') {
      const bankId = Number(l.bankAccountId) || null;
      if (bankId) {
        companyBank = companyMap[bankId];
        if (!companyBank) throw bad(`Line ${n}: the selected company bank account was not found.`);
        line.bankAccountId = bankId;
      }
    }

    if (method === 'Bank') {
      const savedId = Number(l.investorBankAccountId) || null;
      if (savedId) {
        const acc = savedMap[savedId];
        if (!acc) throw bad(`Line ${n}: the selected investor bank account was not found.`);
        line.investorBankAccountId = acc.id;
        line.bankName = acc.bankName;
        line.accountName = acc.accountName;
        line.accountNumber = acc.accountNumber;
        line.branch = acc.branch;
      } else {
        line.bankName = clean(l.bankName);
        line.accountName = clean(l.accountName);
        line.accountNumber = clean(l.accountNumber, 80);
        line.branch = clean(l.branch);
        if (l.saveBank && line.bankName && line.accountNumber) {
          newBanks.push({
            investorId,
            bankName: line.bankName,
            accountName: line.accountName || investorName || 'Account holder',
            accountNumber: line.accountNumber,
            branch: line.branch,
          });
        }
      }
      if (!line.bankName || !line.accountNumber) {
        throw bad(`Line ${n}: enter the investor's bank name and account number.`);
      }
    }

    if (method === 'Cheque') {
      line.chequeNo = clean(l.chequeNo, 60);
      if (!line.chequeNo) throw bad(`Line ${n}: enter the cheque number.`);
      line.chequeDate = validDate(l.chequeDate);
      line.bankName = clean(l.bankName) || companyBank?.name || null;
      if (!line.bankName) throw bad(`Line ${n}: enter the cheque's bank name.`);
    }

    const file = fileMap[`file_${i}`];
    if (file) {
      line.attachment = file.filename;
      // multer reads filenames as latin1; restore UTF-8 so Bengali names survive
      line.attachmentName = Buffer.from(file.originalname, 'latin1').toString('utf8').slice(0, 250);
    }

    lines.push(line);
  });

  return { lines, newBanks };
}

const sumLines = (lines) => round2(lines.reduce((s, l) => s + l.amount, 0));

const methodOf = (lines) => {
  const set = new Set(lines.map((l) => l.method));
  return set.size === 1 ? [...set][0] : 'Multiple';
};

const lineSummary = (lines) =>
  lines.map((l) => `${l.method} ${bdt(l.amount)}`).join(' + ');

// Saves newly typed bank details (the ones with "save" ticked), skipping duplicates
async function saveNewBanks(newBanks, transaction) {
  for (const b of newBanks) {
    const exists = await InvestorBankAccount.findOne({
      where: { investorId: b.investorId, bankName: b.bankName, accountNumber: b.accountNumber },
      transaction,
    });
    if (exists) continue;
    const count = await InvestorBankAccount.count({ where: { investorId: b.investorId }, transaction });
    await InvestorBankAccount.create({ ...b, isDefault: count === 0 }, { transaction });
  }
}

// Capital fully / partly returned -> keep the investment status in step
async function syncInvestmentStatus(investment, transaction) {
  if (investment.status === 'cancelled') return;
  const returned =
    Number(await InvestorPayment.sum('principalPaid', { where: { investmentId: investment.id }, transaction })) || 0;
  const principal = Number(investment.principalAmount) || 0;

  let next = investment.status;
  if (principal > 0 && returned >= principal - 0.005) next = 'fully_returned';
  else if (returned > 0) next = 'partially_returned';

  if (next !== investment.status) await investment.update({ status: next }, { transaction });
}

// Posts the ledger vouchers after the payment is saved. A failure here never
// loses the payment; it is reported as a warning instead.
async function postLedgerSafe(args) {
  try {
    await postParentLines(args);
    return null;
  } catch (err) {
    console.error('Investor ledger posting failed:', err);
    return `Saved, but the accounting entry could not be posted: ${err.message}`;
  }
}

/* --------------------------- Reading payments --------------------------- */

const publicLine = (line, companyBankName) => {
  const j = line.toJSON();
  j.hasAttachment = !!j.attachment;
  delete j.attachment; // internal storage name never leaves the server
  j.companyBankName = companyBankName || null;
  return j;
};

// Attaches `lines` to each receipt / payout using two queries in total
async function withLines(receipts, payouts) {
  const conds = [];
  if (receipts.length) conds.push({ parentType: 'receipt', parentId: receipts.map((r) => r.id) });
  if (payouts.length) conds.push({ parentType: 'payout', parentId: payouts.map((p) => p.id) });

  const lines = conds.length
    ? await InvestorPaymentLine.findAll({ where: { [Op.or]: conds }, order: [['id', 'ASC']] })
    : [];

  const bankIds = [...new Set(lines.map((l) => l.bankAccountId).filter(Boolean))];
  const banks = bankIds.length ? await BankAccount.findAll({ where: { id: bankIds } }) : [];
  const bankNames = {};
  banks.forEach((b) => {
    bankNames[b.id] = b.name;
  });

  const byParent = { receipt: {}, payout: {} };
  lines.forEach((l) => {
    const bucket = byParent[l.parentType];
    if (!bucket[l.parentId]) bucket[l.parentId] = [];
    bucket[l.parentId].push(publicLine(l, bankNames[l.bankAccountId]));
  });

  return {
    receipts: receipts.map((r) => ({ ...r.toJSON(), lines: byParent.receipt[r.id] || [] })),
    payouts: payouts.map((p) => ({ ...p.toJSON(), lines: byParent.payout[p.id] || [] })),
  };
}

const orderNewest = [
  ['id', 'DESC'],
];

// All money movements for one investment
router.get('/investments/:id/money', ...staffOnly, async (req, res) => {
  try {
    const investment = await Investment.findByPk(req.params.id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    const [receipts, payouts] = await Promise.all([
      InvestmentReceipt.findAll({ where: { investmentId: investment.id }, order: orderNewest }),
      InvestorPayment.findAll({ where: { investmentId: investment.id }, order: orderNewest }),
    ]);
    const data = await withLines(receipts, payouts);

    const principal = Number(investment.principalAmount) || 0;
    const receivedTotal = round2(data.receipts.reduce((s, r) => s + Number(r.amount || 0), 0));

    res.json({
      ...data,
      principal,
      receivedTotal,
      receivedDue: Math.max(0, round2(principal - receivedTotal)),
    });
  } catch (err) {
    console.error('Investment money error:', err);
    res.status(500).json({ message: err.message });
  }
});

// All money movements for one investor
router.get('/investors/:id/money', ...staffOnly, async (req, res) => {
  try {
    const investorId = req.params.id;
    const [investments, receipts, payouts] = await Promise.all([
      Investment.findAll({ where: { investorId }, attributes: ['id', 'investmentCode'] }),
      InvestmentReceipt.findAll({ where: { investorId }, order: orderNewest }),
      InvestorPayment.findAll({ where: { investorId }, order: orderNewest }),
    ]);
    const codes = {};
    investments.forEach((i) => {
      codes[i.id] = i.investmentCode;
    });

    const data = await withLines(receipts, payouts);
    const tag = (row) => ({ ...row, investmentCode: codes[row.investmentId] || null });

    const totalReceived = round2(data.receipts.reduce((s, r) => s + Number(r.amount || 0), 0));
    const totalPaid = round2(data.payouts.reduce((s, p) => s + Number(p.amount || 0), 0));

    res.json({
      receipts: data.receipts.map(tag),
      payouts: data.payouts.map(tag),
      totalReceived,
      totalPaid,
    });
  } catch (err) {
    console.error('Investor money error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ----------------------- Payout (we pay the investor) ----------------------- */

router.post(
  '/payments',
  ...staffOnly,
  uploadAny,
  handle('Create payout', async (req, res, files) => {
    const investment = await Investment.findByPk(req.body.investmentId);
    if (!investment) throw new HttpError('Investment not found', 404);
    if (investment.status === 'cancelled') throw bad('This investment is cancelled.');

    const investor = await Investor.findByPk(investment.investorId);
    const { lines, newBanks } = await buildLines(req, investment.investorId, investor?.name);
    const total = sumLines(lines);

    const type = PAYMENT_TYPES.includes(req.body.paymentType) ? req.body.paymentType : 'profit_distribution';
    let principalPart = 0;
    let profitPart = 0;
    if (type === 'principal_return') {
      principalPart = total;
    } else if (type === 'combined') {
      principalPart = round2(req.body.principalPortion);
      if (!(principalPart > 0)) throw bad('Enter how much of this payout is capital.');
      if (principalPart > total) throw bad('The capital part cannot be more than the total payout.');
      profitPart = round2(total - principalPart);
    } else {
      profitPart = total;
    }

    // Capital can never be returned more than once
    if (principalPart > 0) {
      const already =
        Number(await InvestorPayment.sum('principalPaid', { where: { investmentId: investment.id } })) || 0;
      const remaining = Math.max(0, round2((Number(investment.principalAmount) || 0) - already));
      if (principalPart > remaining + 0.005) {
        throw bad(`Capital to return cannot be more than the remaining capital (${bdt(remaining)}).`);
      }
    }

    const paymentDate = validDate(req.body.paymentDate) || todayStr();
    const refs = lines.map((l) => l.chequeNo || l.referenceNo).filter(Boolean);

    const t = await sequelize.transaction();
    let payment;
    try {
      payment = await InvestorPayment.create(
        {
          paymentCode: await nextCode(InvestorPayment, 'IPAY', 5, t),
          investorId: investment.investorId,
          investmentId: investment.id,
          paymentDate,
          amount: total,
          paymentType: type,
          principalPaid: principalPart,
          profitPaid: profitPart,
          paymentMethod: methodOf(lines),
          bankAccountId: lines.length === 1 ? lines[0].bankAccountId : null,
          referenceNo: lines.length === 1 && refs[0] ? refs[0] : null,
          status: 'completed',
          notes: clean(req.body.notes, 2000),
        },
        { transaction: t }
      );

      await InvestorPaymentLine.bulkCreate(
        lines.map((l) => ({ ...l, parentType: 'payout', parentId: payment.id })),
        { transaction: t }
      );
      await saveNewBanks(newBanks, t);
      await syncInvestmentStatus(investment, t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    // Attachments that did not belong to any line are not kept
    const used = new Set(lines.map((l) => l.attachment).filter(Boolean));
    files.filter((f) => !used.has(f.filename)).forEach((f) => fs.unlink(f.path, () => {}));

    const ledgerWarning = await postLedgerSafe({
      direction: 'payout',
      parentId: payment.id,
      investor,
      date: paymentDate,
      code: payment.paymentCode,
      investmentCode: investment.investmentCode,
      createdBy: who(req),
    });

    const kind = type === 'principal_return' ? 'capital return' : type === 'combined' ? 'capital + profit' : 'profit payout';
    await safeLog(
      req,
      investment.investorId,
      'Payment Recorded',
      `Payout ${payment.paymentCode} of ${bdt(total)} (${kind}) paid by ${lineSummary(lines)}`,
      total
    );

    const out = await withLines([], [payment]);
    res.status(201).json({ ...out.payouts[0], ledgerWarning });
  })
);

/* ----------------- Receipt (the investor pays us) ----------------- */

router.post(
  '/investments/:id/receipts',
  ...staffOnly,
  uploadAny,
  handle('Create receipt', async (req, res, files) => {
    const investment = await Investment.findByPk(req.params.id);
    if (!investment) throw new HttpError('Investment not found', 404);
    if (investment.status === 'cancelled') throw bad('This investment is cancelled.');

    const investor = await Investor.findByPk(investment.investorId);
    const { lines, newBanks } = await buildLines(req, investment.investorId, investor?.name);
    const total = sumLines(lines);

    const principal = Number(investment.principalAmount) || 0;
    const already = Number(await InvestmentReceipt.sum('amount', { where: { investmentId: investment.id } })) || 0;
    const stillToReceive = Math.max(0, round2(principal - already));
    if (total > stillToReceive + 0.005) {
      throw bad(
        stillToReceive > 0
          ? `This is more than the amount still to be received (${bdt(stillToReceive)}).`
          : 'The full investment amount has already been received.'
      );
    }

    const receiptDate = validDate(req.body.receiptDate) || todayStr();

    const t = await sequelize.transaction();
    let receipt;
    try {
      receipt = await InvestmentReceipt.create(
        {
          receiptCode: await nextCode(InvestmentReceipt, 'IREC', 5, t),
          investmentId: investment.id,
          investorId: investment.investorId,
          receiptDate,
          amount: total,
          paymentMethod: methodOf(lines),
          notes: clean(req.body.notes, 2000),
          createdBy: who(req),
        },
        { transaction: t }
      );

      await InvestorPaymentLine.bulkCreate(
        lines.map((l) => ({ ...l, parentType: 'receipt', parentId: receipt.id })),
        { transaction: t }
      );
      await saveNewBanks(newBanks, t);
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }

    const used = new Set(lines.map((l) => l.attachment).filter(Boolean));
    files.filter((f) => !used.has(f.filename)).forEach((f) => fs.unlink(f.path, () => {}));

    const ledgerWarning = await postLedgerSafe({
      direction: 'receipt',
      parentId: receipt.id,
      investor,
      date: receiptDate,
      code: receipt.receiptCode,
      investmentCode: investment.investmentCode,
      createdBy: who(req),
    });

    await safeLog(
      req,
      investment.investorId,
      'Payment Received',
      `Received ${receipt.receiptCode} of ${bdt(total)} from investor for ${investment.investmentCode} by ${lineSummary(lines)}`,
      total
    );

    const out = await withLines([receipt], []);
    res.status(201).json({ ...out.receipts[0], ledgerWarning });
  })
);

/* ------------------------- Attachment download ------------------------- */

router.get('/payment-lines/:lineId/file', ...staffOnly, async (req, res) => {
  try {
    const line = await InvestorPaymentLine.findByPk(req.params.lineId);
    if (!line || !line.attachment) return res.status(404).json({ message: 'Attachment not found' });

    const filePath = path.join(UPLOAD_DIR, path.basename(line.attachment));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File is missing from the server.' });

    res.download(filePath, line.attachmentName || path.basename(line.attachment));
  } catch (err) {
    console.error('Download attachment error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ------------------------ Investor bank accounts ------------------------ */

async function makeDefault(investorId, accountId) {
  await InvestorBankAccount.update({ isDefault: false }, { where: { investorId } });
  await InvestorBankAccount.update({ isDefault: true }, { where: { id: accountId } });
}

function readBankBody(body) {
  const data = {
    bankName: clean(body.bankName),
    accountName: clean(body.accountName),
    accountNumber: clean(body.accountNumber, 80),
    branch: clean(body.branch),
    routingNumber: clean(body.routingNumber, 50),
  };
  if (!data.bankName) throw bad('Enter the bank name.');
  if (!data.accountName) throw bad('Enter the account holder name.');
  if (!data.accountNumber) throw bad('Enter the account number.');
  return data;
}

router.get('/investors/:id/bank-accounts', ...staffOnly, async (req, res) => {
  try {
    const rows = await InvestorBankAccount.findAll({
      where: { investorId: req.params.id },
      order: [['isDefault', 'DESC'], ['id', 'ASC']],
    });
    res.json(rows);
  } catch (err) {
    console.error('List bank accounts error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/investors/:id/bank-accounts', ...staffOnly, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    const data = readBankBody(req.body);
    const count = await InvestorBankAccount.count({ where: { investorId: investor.id } });
    const account = await InvestorBankAccount.create({ ...data, investorId: investor.id, isDefault: false });
    if (count === 0 || req.body.isDefault === true) await makeDefault(investor.id, account.id);

    await safeLog(req, investor.id, 'Bank Account Added', `Bank account added: ${data.bankName} (${data.accountNumber})`);
    res.status(201).json(await InvestorBankAccount.findByPk(account.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Create bank account error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/bank-accounts/:accId', ...staffOnly, async (req, res) => {
  try {
    const account = await InvestorBankAccount.findByPk(req.params.accId);
    if (!account) return res.status(404).json({ message: 'Bank account not found' });

    await account.update(readBankBody(req.body));
    if (req.body.isDefault === true) await makeDefault(account.investorId, account.id);

    res.json(await InvestorBankAccount.findByPk(account.id));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error('Update bank account error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/bank-accounts/:accId', ...staffOnly, async (req, res) => {
  try {
    const account = await InvestorBankAccount.findByPk(req.params.accId);
    if (!account) return res.status(404).json({ message: 'Bank account not found' });

    const { investorId, isDefault, bankName } = account;
    await account.destroy(); // past payments keep their own copy of the details

    if (isDefault) {
      const next = await InvestorBankAccount.findOne({ where: { investorId }, order: [['id', 'ASC']] });
      if (next) await makeDefault(investorId, next.id);
    }

    await safeLog(req, investorId, 'Bank Account Removed', `Bank account removed: ${bankName}`);
    res.json({ message: 'Bank account deleted' });
  } catch (err) {
    console.error('Delete bank account error:', err);
    res.status(500).json({ message: err.message });
  }
});

/* ----------------------------- Our bank accounts ----------------------------- */

router.get('/company-banks', ...staffOnly, async (req, res) => {
  try {
    const rows = await BankAccount.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] });
    res.json(rows);
  } catch (err) {
    console.error('Company banks error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;