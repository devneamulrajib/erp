const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  Voucher, VoucherEntry, ChartOfAccount, ChartOfGroup, Project, Party,
} = require('../models/associations');

const voucherIncludes = [
  { model: VoucherEntry, as: 'entries', include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'name', 'code'] }] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: Party, as: 'contact', attributes: ['id', 'name'] },
];

// Day Book
router.get('/day-book', auth, async (req, res) => {
  try {
    const { from, to, project, voucherType } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (voucherType) where.type = voucherType;

    const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    where.date = { [Op.gte]: start, [Op.lte]: end };

    const vouchers = await Voucher.findAll({
      where,
      include: voucherIncludes,
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    });

    const rows = [];
    let runningDebit = 0;
    let runningCredit = 0;

    vouchers.forEach((v) => {
      (v.entries || []).forEach((e) => {
        runningDebit += Number(e.debit) || 0;
        runningCredit += Number(e.credit) || 0;
        rows.push({
          date: v.date,
          voucherNo: v.voucherNo,
          type: v.type,
          project: v.project?.name || '-',
          description: e.account?.name || '-',
          accountCode: e.account?.code || '-',
          debit: Number(e.debit) || 0,
          credit: Number(e.credit) || 0,
          note: e.note || v.narration || '',
        });
      });
    });

    res.json({ rows, totals: { debit: runningDebit, credit: runningCredit } });
  } catch (err) {
    console.error('GET /api/accounting-reports/day-book failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Contact ledger summary (Payable / Receivable reports)
router.get('/contact-ledger-summary', auth, async (req, res) => {
  try {
    const { contactType = 'Supplier', contactId, project, from, to } = req.query;

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const accountWhere = { contactType };
    if (contactId) accountWhere.id = contactId;
    const accounts = await ChartOfAccount.findAll({ where: accountWhere, order: [['name', 'ASC']] });

    if (!accounts.length) {
      return res.json({ rows: [], totals: { opening: 0, debit: 0, credit: 0, balance: 0 } });
    }
    const accountIds = accounts.map((a) => a.id);

    const entryWhere = { accountId: { [Op.in]: accountIds } };
    const voucherWhere = {};
    if (project) voucherWhere.projectId = project;

    const entries = await VoucherEntry.findAll({
      where: entryWhere,
      include: [{ model: Voucher, attributes: ['id', 'date', 'projectId'], where: voucherWhere }],
    });

    const aggMap = {};
    entries.forEach((e) => {
      const accId = e.accountId;
      if (!aggMap[accId]) aggMap[accId] = { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
      const vDate = new Date(e.Voucher.date);
      if (vDate < start) {
        aggMap[accId].openingDebit += Number(e.debit) || 0;
        aggMap[accId].openingCredit += Number(e.credit) || 0;
      } else if (vDate >= start && vDate <= end) {
        aggMap[accId].periodDebit += Number(e.debit) || 0;
        aggMap[accId].periodCredit += Number(e.credit) || 0;
      }
    });

    const rows = accounts.map((acc) => {
      const a = aggMap[acc.id] || { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
      const openingBalance = (Number(acc.openingBalance) || 0) + (a.openingCredit - a.openingDebit);
      const balance = openingBalance + a.periodCredit - a.periodDebit;
      return {
        id: acc.id,
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
      credit: t.credit + r.credit,
      balance: t.balance + r.balance,
    }), { opening: 0, debit: 0, credit: 0, balance: 0 });

    res.json({ rows, totals });
  } catch (err) {
    console.error('GET /api/accounting-reports/contact-ledger-summary failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// Expense Report
router.get('/expense-report', auth, async (req, res) => {
  try {
    const { from, to, project } = req.query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const expenseGroups = await ChartOfGroup.findAll({ where: { section: 'Expense' }, attributes: ['id'] });
    const groupIds = expenseGroups.map((g) => g.id);
    const expenseAccounts = await ChartOfAccount.findAll({ where: { chartOfGroupId: { [Op.in]: groupIds } }, attributes: ['id'] });
    const accountIds = expenseAccounts.map((a) => a.id);

    const where = { date: { [Op.gte]: start, [Op.lte]: end } };
    if (project) where.projectId = project;

    const vouchers = await Voucher.findAll({
      where,
      include: [{ model: VoucherEntry, as: 'entries', include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'name'] }] }],
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    });

    const rows = [];
    let total = 0;
    vouchers.forEach((v) => {
      (v.entries || []).forEach((e) => {
        if (!e.account || !accountIds.includes(e.account.id)) return;
        const amount = Number(e.debit) || 0;
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

// Receive Payment Statement — full ledger for ONE ChartOfAccount
router.get('/receive-payment-statement', auth, async (req, res) => {
  try {
    const { account, from, to, project, voucherType, exceptContra } = req.query;
    if (!account) return res.status(400).json({ message: 'account is required' });

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const voucherWhere = {};
    if (project) voucherWhere.projectId = project;
    if (voucherType) voucherWhere.type = voucherType;
    if (exceptContra === 'true') voucherWhere.type = { ...(voucherType ? { [Op.eq]: voucherType } : {}), [Op.ne]: 'Contra' };

    // Opening balance: everything before `start`
    const openingEntries = await VoucherEntry.findAll({
      where: { accountId: account },
      include: [{ model: Voucher, where: { ...voucherWhere, date: { [Op.lt]: start } }, attributes: [] }],
    });
    const openingDebit = openingEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
    const openingCredit = openingEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0);

    const acc = await ChartOfAccount.findByPk(account);
    const openingBalance = (Number(acc?.openingBalance) || 0) + openingCredit - openingDebit;

    // Period rows
    const vouchers = await Voucher.findAll({
      where: { ...voucherWhere, date: { [Op.gte]: start, [Op.lte]: end } },
      include: [
        { model: VoucherEntry, as: 'entries', where: { accountId: account }, include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'name'] }] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Party, as: 'contact', attributes: ['id', 'name'] },
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    });

    const rows = [];
    let periodDebit = 0;
    let periodCredit = 0;
    let running = openingBalance;

    vouchers.forEach((v) => {
      (v.entries || []).forEach((e) => {
        periodDebit += Number(e.debit) || 0;
        periodCredit += Number(e.credit) || 0;
        running += (Number(e.credit) || 0) - (Number(e.debit) || 0);
        rows.push({
          date: v.date,
          project: v.project?.name || '-',
          description: v.contact?.name || v.narration || v.type,
          voucherLabel: `${v.type}-${v.voucherNo}`,
          voucherId: v.id,
          debit: Number(e.debit) || 0,
          credit: Number(e.credit) || 0,
          balance: running,
          note: e.note || v.narration || '',
        });
      });
    });

    res.json({
      rows,
      opening: { debit: openingDebit, credit: openingCredit, balance: openingBalance },
      current: { debit: periodDebit, credit: periodCredit },
      closing: { debit: openingDebit + periodDebit, credit: openingCredit + periodCredit, balance: running },
    });
  } catch (err) {
    console.error('GET /api/accounting-reports/receive-payment-statement failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;