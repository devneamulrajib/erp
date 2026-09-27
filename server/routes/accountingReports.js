const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  Voucher, VoucherEntry, ChartOfAccount, ChartOfGroup, Project, Party, BankAccount,
  ContractorBill, ContractorBillPayment, Expense,
  JournalVoucher, JournalVoucherLine,
  ContraVoucher, ContraVoucherLine,
} = require('../models/associations');

const voucherIncludes = [
  { model: VoucherEntry, as: 'entries', include: [{ model: ChartOfAccount, as: 'account', attributes: ['id', 'name', 'code'] }] },
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: Party, as: 'contact', attributes: ['id', 'name'] },
];

router.get('/day-book', auth, async (req, res) => {
  try {
    const { from, to, project, voucherType } = req.query;

    const start = from ? new Date(from) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    const dateWhere = { [Op.gte]: start, [Op.lte]: end };

    const wantType = (t) => !voucherType || voucherType === t;
    const rows = [];
    let totalDebit = 0;
    let totalCredit = 0;

    if (wantType('Journal')) {
      const where = { date: dateWhere };
      if (project) where.project = project;
      const vouchers = await JournalVoucher.findAll({
        where,
        include: [{ model: JournalVoucherLine }],
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
      });
      vouchers.forEach((v) => {
        (v.JournalVoucherLines || []).forEach((l) => {
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;
          totalDebit += debit;
          totalCredit += credit;
          rows.push({
            date: v.date, voucherNo: v.voucherNo, project: v.project || '-',
            description: l.account, debit, credit, note: l.note || v.comment || '',
          });
        });
      });
    }

    if (wantType('Contra')) {
      const where = { date: dateWhere };
      if (project) where.project = project;
      const vouchers = await ContraVoucher.findAll({
        where,
        include: [{ model: ContraVoucherLine }],
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
      });
      vouchers.forEach((v) => {
        (v.ContraVoucherLines || []).forEach((l) => {
          const debit = Number(l.debit) || 0;
          const credit = Number(l.credit) || 0;
          totalDebit += debit;
          totalCredit += credit;
          rows.push({
            date: v.date, voucherNo: v.voucherNo, project: v.project || '-',
            description: l.account, debit, credit, note: l.note || v.comment || '',
          });
        });
      });
    }

    if (wantType('Payment')) {
      const where = { date: dateWhere, type: 'Payment' };
      if (project) where.projectId = project;
      const vouchers = await Voucher.findAll({
        where,
        include: voucherIncludes,
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
      });
      vouchers.forEach((v) => {
        (v.entries || []).forEach((e) => {
          const debit = Number(e.debit) || 0;
          const credit = Number(e.credit) || 0;
          totalDebit += debit;
          totalCredit += credit;
          rows.push({
            date: v.date, voucherNo: v.voucherNo, project: v.project?.name || '-',
            description: e.account?.name || '', debit, credit, note: v.narration || '',
          });
        });
      });
    }

    if (wantType('Receipt')) {
      const where = { date: dateWhere, type: 'Receipt' };
      if (project) where.projectId = project;
      const vouchers = await Voucher.findAll({
        where,
        include: voucherIncludes,
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
      });
      vouchers.forEach((v) => {
        (v.entries || []).forEach((e) => {
          const debit = Number(e.debit) || 0;
          const credit = Number(e.credit) || 0;
          totalDebit += debit;
          totalCredit += credit;
          rows.push({
            date: v.date, voucherNo: v.voucherNo, project: v.project?.name || '-',
            description: e.account?.name || '', debit, credit, note: v.narration || '',
          });
        });
      });
    }

    // Expense — bridged via server/routes/expense.js, which creates a
    // matching Voucher/VoucherEntry pair for every Expense record.
    if (wantType('Expense')) {
      const where = { date: dateWhere, type: 'Expense' };
      if (project) where.projectId = project;
      const vouchers = await Voucher.findAll({
        where,
        include: voucherIncludes,
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
      });
      vouchers.forEach((v) => {
        (v.entries || []).forEach((e) => {
          const debit = Number(e.debit) || 0;
          const credit = Number(e.credit) || 0;
          totalDebit += debit;
          totalCredit += credit;
          rows.push({
            date: v.date, voucherNo: v.voucherNo, project: v.project?.name || '-',
            description: e.account?.name || '', debit, credit, note: v.narration || '',
          });
        });
      });
    }

    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ rows, totals: { debit: totalDebit, credit: totalCredit } });
  } catch (err) {
    console.error('GET /api/accounting-reports/day-book failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/cash-bank-books', auth, async (req, res) => {
  try {
    const { bank, from, to, voucherType } = req.query;

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const banks = bank
      ? await BankAccount.findAll({ where: { id: bank } })
      : await BankAccount.findAll({ order: [['name', 'ASC']] });

    const books = [];

    for (const b of banks) {
      const voucherWhere = { bankId: b.id };
      if (voucherType) voucherWhere.type = voucherType;

      const openingVouchers = await Voucher.findAll({
        where: { ...voucherWhere, date: { [Op.lt]: start } },
        include: [{ model: VoucherEntry, as: 'entries' }],
      });
      let openingBalance = Number(b.balance) || 0;
      openingVouchers.forEach((v) => {
        (v.entries || []).forEach((e) => {
          openingBalance += (Number(e.debit) || 0) - (Number(e.credit) || 0);
        });
      });

      const periodVouchers = await Voucher.findAll({
        where: { ...voucherWhere, date: { [Op.gte]: start, [Op.lte]: end } },
        include: voucherIncludes,
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
      });

      const rows = [];
      let running = openingBalance;
      let periodDebit = 0;
      let periodCredit = 0;

      periodVouchers.forEach((v) => {
        (v.entries || []).forEach((e) => {
          const debit = Number(e.debit) || 0;
          const credit = Number(e.credit) || 0;
          periodDebit += debit;
          periodCredit += credit;
          running += debit - credit;
          rows.push({
            date: v.date,
            voucherLabel: `${v.type}-${v.voucherNo}`,
            voucherId: v.id,
            description: v.contact?.name || v.narration || v.type,
            debit,
            credit,
            balance: running,
            note: e.note || v.narration || '',
          });
        });
      });

      books.push({
        bankId: b.id,
        bankName: b.name,
        opening: openingBalance,
        rows,
        periodDebit,
        periodCredit,
        closing: running,
      });
    }

    res.json({ books });
  } catch (err) {
    console.error('GET /api/accounting-reports/cash-bank-books failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/income-statement', auth, async (req, res) => {
  try {
    const { from, to, project } = req.query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const voucherWhere = { date: { [Op.gte]: start, [Op.lte]: end } };
    if (project) voucherWhere.projectId = project;

    const entries = await VoucherEntry.findAll({
      include: [
        { model: Voucher, attributes: [], where: voucherWhere },
        { model: ChartOfAccount, as: 'account', attributes: ['id', 'name', 'code', 'chartOfGroupId'] },
      ],
    });

    const accountIds = [...new Set(entries.map((e) => e.accountId))];
    const accounts = await ChartOfAccount.findAll({
      where: { id: { [Op.in]: accountIds.length ? accountIds : [0] } },
      include: [{ model: ChartOfGroup, as: 'chartOfGroup', attributes: ['id', 'name', 'section'] }],
    });
    const accountMap = {};
    accounts.forEach((a) => { accountMap[a.id] = a; });

    const totalsByAccount = {};
    entries.forEach((e) => {
      const id = e.accountId;
      if (!totalsByAccount[id]) totalsByAccount[id] = { debit: 0, credit: 0 };
      totalsByAccount[id].debit += Number(e.debit) || 0;
      totalsByAccount[id].credit += Number(e.credit) || 0;
    });

    const sectionMap = {};
    Object.keys(totalsByAccount).forEach((accId) => {
      const acc = accountMap[accId];
      if (!acc) return;
      const section = acc.chartOfGroup?.section || acc.chartOfGroup?.name || 'Unclassified';
      if (!sectionMap[section]) sectionMap[section] = { section, accounts: [], netCredit: 0, netDebit: 0 };
      const t = totalsByAccount[accId];
      sectionMap[section].accounts.push({
        id: acc.id,
        name: acc.name,
        code: acc.code,
        debit: t.debit,
        credit: t.credit,
        net: t.credit - t.debit,
      });
      sectionMap[section].netCredit += t.credit;
      sectionMap[section].netDebit += t.debit;
    });

    const sections = Object.values(sectionMap).map((s) => ({
      ...s,
      net: s.netCredit - s.netDebit,
    }));

    res.json({ sections });
  } catch (err) {
    console.error('GET /api/accounting-reports/income-statement failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/cash-flow-statement', auth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const openingBalances = await BankAccount.findAll();
    const totalOpeningFromAccounts = openingBalances.reduce((s, b) => s + (Number(b.balance) || 0), 0);

    const priorVouchers = await Voucher.findAll({
      where: { bankId: { [Op.ne]: null }, date: { [Op.lt]: start }, type: { [Op.in]: ['Payment', 'Receipt'] } },
    });
    let openingCash = totalOpeningFromAccounts;
    priorVouchers.forEach((v) => {
      const amt = Number(v.amount) || 0;
      openingCash += v.type === 'Receipt' ? amt : -amt;
    });

    const periodVouchers = await Voucher.findAll({
      where: {
        bankId: { [Op.ne]: null },
        date: { [Op.gte]: start, [Op.lte]: end },
        type: { [Op.in]: ['Payment', 'Receipt'] },
      },
      include: voucherIncludes,
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    });

    const accountIds = [...new Set(
      periodVouchers.flatMap((v) => (v.entries || []).map((e) => e.accountId)),
    )];
    const accounts = await ChartOfAccount.findAll({
      where: { id: { [Op.in]: accountIds.length ? accountIds : [0] } },
      include: [{ model: ChartOfGroup, as: 'chartOfGroup', attributes: ['id', 'name', 'section'] }],
    });
    const accountMap = {};
    accounts.forEach((a) => { accountMap[a.id] = a; });

    const inflowMap = {};
    const outflowMap = {};
    let totalInflow = 0;
    let totalOutflow = 0;

    periodVouchers.forEach((v) => {
      const amt = Number(v.amount) || 0;
      const counterEntry = (v.entries || []).find((e) =>
        v.type === 'Receipt' ? Number(e.debit) > 0 : Number(e.credit) > 0
      );
      const acc = counterEntry ? accountMap[counterEntry.accountId] : null;
      const section = acc?.chartOfGroup?.section || acc?.chartOfGroup?.name || 'Unclassified';

      if (v.type === 'Receipt') {
        totalInflow += amt;
        inflowMap[section] = (inflowMap[section] || 0) + amt;
      } else {
        totalOutflow += amt;
        outflowMap[section] = (outflowMap[section] || 0) + amt;
      }
    });

    const inflows = Object.entries(inflowMap).map(([section, amount]) => ({ section, amount }));
    const outflows = Object.entries(outflowMap).map(([section, amount]) => ({ section, amount }));
    const netChange = totalInflow - totalOutflow;
    const closingCash = openingCash + netChange;

    res.json({
      opening: openingCash,
      inflows,
      outflows,
      totalInflow,
      totalOutflow,
      netChange,
      closing: closingCash,
    });
  } catch (err) {
    console.error('GET /api/accounting-reports/cash-flow-statement failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/trial-balance', auth, async (req, res) => {
  try {
    const { asOf } = req.query;
    const end = asOf ? new Date(asOf) : new Date();
    end.setHours(23, 59, 59, 999);

    const entries = await VoucherEntry.findAll({
      include: [
        { model: Voucher, attributes: [], where: { date: { [Op.lte]: end } } },
        { model: ChartOfAccount, as: 'account', attributes: ['id', 'name', 'code'] },
      ],
    });

    const totalsByAccount = {};
    entries.forEach((e) => {
      const acc = e.account;
      if (!acc) return;
      if (!totalsByAccount[acc.id]) {
        totalsByAccount[acc.id] = { id: acc.id, name: acc.name, code: acc.code, debit: 0, credit: 0 };
      }
      totalsByAccount[acc.id].debit += Number(e.debit) || 0;
      totalsByAccount[acc.id].credit += Number(e.credit) || 0;
    });

    const rows = Object.values(totalsByAccount)
      .map((r) => {
        const net = r.debit - r.credit;
        return {
          ...r,
          debitBalance: net > 0 ? net : 0,
          creditBalance: net < 0 ? -net : 0,
        };
      })
      .filter((r) => r.debitBalance !== 0 || r.creditBalance !== 0)
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));

    const totalDebit = rows.reduce((s, r) => s + r.debitBalance, 0);
    const totalCredit = rows.reduce((s, r) => s + r.creditBalance, 0);

    res.json({ rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 });
  } catch (err) {
    console.error('GET /api/accounting-reports/trial-balance failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/balance-sheet', auth, async (req, res) => {
  try {
    const { asOf } = req.query;
    const end = asOf ? new Date(asOf) : new Date();
    end.setHours(23, 59, 59, 999);

    const entries = await VoucherEntry.findAll({
      include: [
        { model: Voucher, attributes: [], where: { date: { [Op.lte]: end } } },
        { model: ChartOfAccount, as: 'account', attributes: ['id', 'name', 'code', 'chartOfGroupId', 'openingBalance'] },
      ],
    });

    const accountIds = [...new Set(entries.map((e) => e.accountId))];
    const accounts = await ChartOfAccount.findAll({
      where: { id: { [Op.in]: accountIds.length ? accountIds : [0] } },
      include: [{ model: ChartOfGroup, as: 'chartOfGroup', attributes: ['id', 'name', 'section'] }],
    });
    const accountMap = {};
    accounts.forEach((a) => { accountMap[a.id] = a; });

    const totalsByAccount = {};
    entries.forEach((e) => {
      const id = e.accountId;
      if (!totalsByAccount[id]) totalsByAccount[id] = { debit: 0, credit: 0 };
      totalsByAccount[id].debit += Number(e.debit) || 0;
      totalsByAccount[id].credit += Number(e.credit) || 0;
    });

    const sectionMap = {};
    Object.keys(totalsByAccount).forEach((accId) => {
      const acc = accountMap[accId];
      if (!acc) return;
      const section = acc.chartOfGroup?.section || acc.chartOfGroup?.name || 'Unclassified';
      if (!sectionMap[section]) sectionMap[section] = { section, accounts: [], netBalance: 0 };
      const t = totalsByAccount[accId];
      const opening = Number(acc.openingBalance) || 0;
      const balance = opening + t.debit - t.credit;
      sectionMap[section].accounts.push({
        id: acc.id,
        name: acc.name,
        code: acc.code,
        balance,
      });
      sectionMap[section].netBalance += balance;
    });

    const sections = Object.values(sectionMap).sort((a, b) => a.section.localeCompare(b.section));

    res.json({ sections, asOf: end });
  } catch (err) {
    console.error('GET /api/accounting-reports/balance-sheet failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/contact-ledger-summary', auth, async (req, res) => {
  try {
    const { contactType = 'Supplier', contactId, project, from, to } = req.query;

    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    if (contactType === 'Supplier') {
      const partyWhere = { type: { [Op.in]: ['supplier', 'contractor'] } };
      if (contactId) partyWhere.id = contactId;
      const parties = await Party.findAll({ where: partyWhere, order: [['name', 'ASC']] });

      const partyIds = parties.map((p) => p.id);
      const rows = [];

      if (partyIds.length) {
        const billWhere = { partyId: { [Op.in]: partyIds } };
        if (project) billWhere.projectId = project;

        const bills = await ContractorBill.findAll({
          where: billWhere,
          include: [{ model: ContractorBillPayment }],
        });

        const aggMap = {};
        bills.forEach((bill) => {
          const pid = bill.partyId;
          if (!aggMap[pid]) aggMap[pid] = { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };

          const billDate = new Date(bill.date);
          const billAmount = Number(bill.grandTotal) || 0;
          if (billDate < start) {
            aggMap[pid].openingDebit += billAmount;
          } else if (billDate >= start && billDate <= end) {
            aggMap[pid].periodDebit += billAmount;
          }

          (bill.ContractorBillPayments || []).forEach((p) => {
            const pDate = new Date(p.date);
            const pAmount = Number(p.amount) || 0;
            if (pDate < start) {
              aggMap[pid].openingCredit += pAmount;
            } else if (pDate >= start && pDate <= end) {
              aggMap[pid].periodCredit += pAmount;
            }
          });
        });

        parties.forEach((party) => {
          const a = aggMap[party.id] || { openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0 };
          const openingBalance = (Number(party.openingBalance) || 0) + a.openingDebit - a.openingCredit;
          const balance = openingBalance + a.periodDebit - a.periodCredit;
          rows.push({
            id: party.id,
            name: party.name,
            code: party.code,
            openingBalance,
            debit: a.periodDebit,
            credit: a.periodCredit,
            balance,
          });
        });
      }

      if (!contactId) {
        const billedNames = new Set(parties.map((p) => p.name?.trim().toLowerCase()));
        const supplierAccounts = await ChartOfAccount.findAll({
          where: { contactType: 'Supplier' },
          order: [['name', 'ASC']],
        });
        supplierAccounts.forEach((acc) => {
          if (billedNames.has(acc.name?.trim().toLowerCase())) return;
          const openingBalance = Number(acc.openingBalance) || 0;
          rows.push({
            id: `coa-${acc.id}`,
            name: acc.name,
            code: acc.code,
            openingBalance,
            debit: 0,
            credit: 0,
            balance: openingBalance,
          });
        });
      }

      const totals = rows.reduce((t, r) => ({
        opening: t.opening + r.openingBalance,
        debit: t.debit + r.debit,
        credit: t.credit + r.credit,
        balance: t.balance + r.balance,
      }), { opening: 0, debit: 0, credit: 0, balance: 0 });

      return res.json({ rows, totals });
    }

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

    const entriesResult = await VoucherEntry.findAll({
      where: entryWhere,
      include: [{ model: Voucher, attributes: ['id', 'date', 'projectId'], where: voucherWhere }],
    });

    const aggMap = {};
    entriesResult.forEach((e) => {
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

router.get('/expense-report', auth, async (req, res) => {
  try {
    const { from, to, project } = req.query;
    const start = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);

    const where = { date: { [Op.gte]: start, [Op.lte]: end } };
    if (project) where.project = project;

    const expenses = await Expense.findAll({
      where,
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
    });

    let total = 0;
    const rows = expenses.map((e) => {
      const amount = Number(e.amount) || 0;
      total += amount;
      return {
        id: e.id,
        date: e.date,
        voucherNo: e.reference,
        description: e.drAccount,
        note: e.category || '',
        amount,
      };
    });

    res.json({ rows, total });
  } catch (err) {
    console.error('GET /api/accounting-reports/expense-report failed:', err);
    res.status(500).json({ message: err.message });
  }
});

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

    const openingEntries = await VoucherEntry.findAll({
      where: { accountId: account },
      include: [{ model: Voucher, where: { ...voucherWhere, date: { [Op.lt]: start } }, attributes: [] }],
    });
    const openingDebit = openingEntries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
    const openingCredit = openingEntries.reduce((s, e) => s + (Number(e.credit) || 0), 0);

    const acc = await ChartOfAccount.findByPk(account);
    const openingBalance = (Number(acc?.openingBalance) || 0) + openingCredit - openingDebit;

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