const mongoose = require('mongoose');
const router = require('express').Router();
const auth = require('../middleware/auth');
const Voucher = require('../models/Voucher');
const ChartOfAccount = require('../models/ChartOfAccount');
const ChartOfGroup = require('../models/ChartOfGroup');

// Day Book: every voucher entry (debit or credit line) across all vouchers,
// flattened to one row per entry, for a date range.
router.get('/day-book', auth, async (req, res) => {
  try {
    const {
      from, to, project, voucherType,
    } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (voucherType) filter.type = voucherType;

    const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    filter.date = { $gte: start, $lte: end };

    const vouchers = await Voucher.find(filter)
      .populate('entries.account', 'name code')
      .populate('project', 'name')
      .sort({ date: 1, createdAt: 1 });

    const rows = [];
    let runningDebit = 0;
    let runningCredit = 0;

    vouchers.forEach((v) => {
      v.entries.forEach((e) => {
        runningDebit += e.debit || 0;
        runningCredit += e.credit || 0;
        rows.push({
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          project: v.project?.name || '-',
          description: e.account?.name || '-',
          accountCode: e.account?.code || '-',
          debit: e.debit || 0,
          credit: e.credit || 0,
          note: e.note || v.narration || '',
        });
      });
    });

    res.json({
      rows,
      totals: { debit: runningDebit, credit: runningCredit },
    });
  } catch (err) {
    console.error('GET /api/accounting-reports/day-book failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Generic contact ledger summary — powers Payable Report (contactType=Supplier)
// and Receivable Report (contactType=Customer) with the same logic.
router.get('/contact-ledger-summary', auth, async (req, res) => {
  try {
    const {
      contactType = 'Supplier', contactId, project, from, to,
    } = req.query;

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const accountFilter = { contactType };
    if (contactId) accountFilter._id = contactId;
    const accounts = await ChartOfAccount.find(accountFilter).sort({ name: 1 });

    if (!accounts.length) {
      return res.json({ rows: [], totals: { opening: 0, debit: 0, credit: 0, balance: 0 } });
    }
    const accountIds = accounts.map((a) => a._id);

    const voucherFilter = { 'entries.account': { $in: accountIds } };
    if (project) voucherFilter.project = project;

    const agg = await Voucher.aggregate([
      { $match: voucherFilter },
      { $unwind: '$entries' },
      { $match: { 'entries.account': { $in: accountIds } } },
      {
        $group: {
          _id: '$entries.account',
          openingDebit: { $sum: { $cond: [{ $lt: ['$date', start] }, '$entries.debit', 0] } },
          openingCredit: { $sum: { $cond: [{ $lt: ['$date', start] }, '$entries.credit', 0] } },
          periodDebit: { $sum: { $cond: [{ $and: [{ $gte: ['$date', start] }, { $lte: ['$date', end] }] }, '$entries.debit', 0] } },
          periodCredit: { $sum: { $cond: [{ $and: [{ $gte: ['$date', start] }, { $lte: ['$date', end] }] }, '$entries.credit', 0] } },
        },
      },
    ]);

    const aggMap = {};
    agg.forEach((a) => { aggMap[a._id.toString()] = a; });

    const rows = accounts.map((acc) => {
      const a = aggMap[acc._id.toString()] || {
        openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0,
      };
      const openingBalance = (acc.openingBalance || 0) + (a.openingCredit - a.openingDebit);
      const balance = openingBalance + a.periodCredit - a.periodDebit;
      return {
        _id: acc._id,
        name: acc.name,
        code: acc.code,
        openingBalance,
        debit: a.periodDebit,
        credit: a.periodCredit,
        balance,
      };
    });

    const totals = rows.reduce((t, r) => ({
      opening: t.opening + r.openingBalance,
      debit: t.debit + r.debit,
      credit: t.debit + r.credit,
      balance: t.balance + r.balance,
    }), { opening: 0, debit: 0, credit: 0, balance: 0 });

    res.json({ rows, totals });
  } catch (err) {
    console.error('GET /api/accounting-reports/contact-ledger-summary failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Expense Report: every voucher entry whose account belongs to a
// ChartOfGroup with section === 'Expense', for a date range.
router.get('/expense-report', auth, async (req, res) => {
  try {
    const { from, to, project } = req.query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const expenseGroups = await ChartOfGroup.find({ section: 'Expense' }).select('_id');
    const groupIds = expenseGroups.map((g) => g._id);
    const expenseAccounts = await ChartOfAccount.find({ chartOfGroup: { $in: groupIds } }).select('_id');
    const accountIds = expenseAccounts.map((a) => a._id);

    const filter = { date: { $gte: start, $lte: end } };
    if (project) filter.project = project;

    const vouchers = await Voucher.find(filter)
      .populate('entries.account', 'name')
      .sort({ date: 1, createdAt: 1 });

    const rows = [];
    let total = 0;
    vouchers.forEach((v) => {
      v.entries.forEach((e) => {
        if (!e.account || !accountIds.some((id) => id.equals(e.account._id))) return;
        const amount = e.debit || 0;
        if (!amount) return;
        total += amount;
        rows.push({
          date: v.date,
          voucherNo: v.voucherNo,
          description: e.account.name,
          note: e.note || v.narration || '',
          amount,
        });
      });
    });

    res.json({ rows, total });
  } catch (err) {
    console.error('GET /api/accounting-reports/expense-report failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Receive Payment Statement: full ledger for ONE selected ChartOfAccount,
// with running balance, opening balance (before `from`), and closing balance.
router.get('/receive-payment-statement', auth, async (req, res) => {
  try {
    const {
      account, from, to, project, voucherType, exceptContra,
    } = req.query;

    if (!account) {
      return res.status(400).json({ message: 'account is required' });
    }

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const baseFilter = { 'entries.account': account };
    if (project) baseFilter.project = project;
    if (voucherType) baseFilter.type = voucherType;
    if (exceptContra === 'true') {
      baseFilter.type = { ...(voucherType ? { $eq: voucherType } : {}), $ne: 'Contra' };
    }

    const accountObjId = new mongoose.Types.ObjectId(account);

    // Opening balance: everything before `start`
    const openingAgg = await Voucher.aggregate([
      { $match: { ...baseFilter, date: { $lt: start } } },
      { $unwind: '$entries' },
      { $match: { 'entries.account': accountObjId } },
      { $group: { _id: null, debit: { $sum: '$entries.debit' }, credit: { $sum: '$entries.credit' } } },
    ]);
    const openingDebit = openingAgg[0]?.debit || 0;
    const openingCredit = openingAgg[0]?.credit || 0;

    const acc = await ChartOfAccount.findById(account);
    const openingBalance = (acc?.openingBalance || 0) + openingCredit - openingDebit;

    // Period rows
    const vouchers = await Voucher.find({ ...baseFilter, date: { $gte: start, $lte: end } })
      .populate('entries.account', 'name')
      .populate('project', 'name')
      .populate('contact', 'name')
      .sort({ date: 1, createdAt: 1 });

    const rows = [];
    let periodDebit = 0;
    let periodCredit = 0;
    let running = openingBalance;

    vouchers.forEach((v) => {
      v.entries.forEach((e) => {
        if (!e.account || e.account._id.toString() !== account) return;
        periodDebit += e.debit || 0;
        periodCredit += e.credit || 0;
        running += (e.credit || 0) - (e.debit || 0);
        rows.push({
          date: v.date,
          project: v.project?.name || '-',
          description: v.contact?.name || v.narration || v.type,
          voucherLabel: `${v.type}-${v.voucherNo}`,
          voucherId: v._id,
          debit: e.debit || 0,
          credit: e.credit || 0,
          balance: running,
          note: e.note || v.narration || '',
        });
      });
    });

    res.json({
      rows,
      opening: { debit: openingDebit, credit: openingCredit, balance: openingBalance },
      current: { debit: periodDebit, credit: periodCredit },
      closing: {
        debit: openingDebit + periodDebit,
        credit: openingCredit + periodCredit,
        balance: running,
      },
    });
  } catch (err) {
    console.error('GET /api/accounting-reports/receive-payment-statement failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;