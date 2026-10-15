// server/utils/investorLedger.js
// Posts one Voucher (+ 2 VoucherEntry rows) per investor payment line, so the money
// shows in the Day Book, Trial Balance and Cash/Bank Book.
//   receipt (investor pays us): Dr cash/bank, Cr investor account
//   payout  (we pay investor) : Dr investor account, Cr cash/bank
const { Op } = require('sequelize');
const {
  Voucher, VoucherEntry, ChartOfAccount, ChartOfGroup, BankAccount,
} = require('../models/associations');
const InvestorPaymentLine = require('../models/InvestorPaymentLine');

async function findGroupId(hints) {
  for (const h of hints) {
    const g = await ChartOfGroup.findOne({ where: { name: { [Op.like]: `%${h}%` } } });
    if (g) return g.id;
  }
  const any = await ChartOfGroup.findOne({ order: [['id', 'ASC']] });
  if (!any) throw new Error('No Chart of Account groups exist yet.');
  return any.id;
}

async function ensureAccount({ name, hints, codePrefix, contactType, extraWhere = {} }) {
  const found = await ChartOfAccount.findOne({ where: { name, ...extraWhere } });
  if (found) return found;
  return ChartOfAccount.create({
    chartOfGroupId: await findGroupId(hints),
    code: `${codePrefix}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
    name,
    contactType: contactType || 'Others',
  });
}

async function investorAccount(investor) {
  if (investor.chartOfAccountId) {
    const acc = await ChartOfAccount.findByPk(investor.chartOfAccountId);
    if (acc) return acc;
  }
  const acc = await ensureAccount({
    name: investor.name,
    hints: ['Investor', 'Capital', 'Equity', 'Liabilit'],
    codePrefix: 'INVR',
    contactType: 'Investor',
    extraWhere: { contactType: 'Investor' },
  });
  await investor.update({ chartOfAccountId: acc.id });
  return acc;
}

async function companyAccount(line, bank) {
  if (bank) {
    return ensureAccount({ name: bank.name, hints: ['Bank', 'Cash', 'Asset'], codePrefix: 'BNK' });
  }
  if (line.method === 'Cash') {
    return ensureAccount({ name: 'Cash in Hand', hints: ['Cash', 'Asset'], codePrefix: 'CSH' });
  }
  return ensureAccount({ name: 'Bank Account', hints: ['Bank', 'Cash', 'Asset'], codePrefix: 'BNK' });
}

async function nextVoucherNo(prefix) {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const full = `${prefix}${stamp}`;
  const count = await Voucher.count({ where: { voucherNo: { [Op.like]: `${full}%` } } });
  return `${full}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * direction: 'receipt' | 'payout'
 * Reads the saved lines of the parent, posts a voucher for each, stores voucherId on the line.
 */
async function postParentLines({ direction, parentId, investor, date, code, investmentCode, createdBy }) {
  const parentType = direction === 'receipt' ? 'receipt' : 'payout';
  const lines = await InvestorPaymentLine.findAll({
    where: { parentType, parentId },
    order: [['id', 'ASC']],
  });
  if (!lines.length) return [];

  const invAcc = await investorAccount(investor);
  const cashBook = await BankAccount.findOne({ where: { name: { [Op.like]: 'cash%' } } });
  const ids = [];

  for (const line of lines) {
    if (line.voucherId) continue;

    const bank = line.bankAccountId ? await BankAccount.findByPk(line.bankAccountId) : null;
    const coAcc = await companyAccount(line, bank);
    const amount = Number(line.amount) || 0;
    const isReceipt = direction === 'receipt';

    const detail =
      line.method === 'Cheque'
        ? `Cheque #${line.chequeNo}${line.bankName ? ` (${line.bankName})` : ''}`
        : line.method === 'Bank'
          ? `Bank transfer${line.referenceNo ? ` Ref ${line.referenceNo}` : ''}`
          : `Cash${line.referenceNo ? ` ${line.referenceNo}` : ''}`;

    const voucher = await Voucher.create({
      voucherNo: await nextVoucherNo(isReceipt ? 'RV' : 'PV'),
      type: isReceipt ? 'Receipt' : 'Payment',
      date,
      bankId: bank ? bank.id : line.method === 'Cash' && cashBook ? cashBook.id : null,
      ifCheque: line.method === 'Cheque',
      chequeReceiptNo: line.method === 'Cheque' ? line.chequeNo : null,
      chequeDate: line.chequeDate || null,
      narration: `${isReceipt ? 'Investment received from' : 'Payout to'} ${investor.name} · ${investmentCode || ''} · ${code} · ${detail}`,
      reference: code,
      amount,
      paymentMethod: line.method,
      status: 'approved',
      addedBy: createdBy || 'Admin',
    });

    await VoucherEntry.create({
      accountId: isReceipt ? coAcc.id : invAcc.id,
      debit: amount,
      credit: 0,
      note: detail.slice(0, 250),
      voucherId: voucher.id,
    });
    await VoucherEntry.create({
      accountId: isReceipt ? invAcc.id : coAcc.id,
      debit: 0,
      credit: amount,
      note: detail.slice(0, 250),
      voucherId: voucher.id,
    });

    await line.update({ voucherId: voucher.id });
    ids.push(voucher.id);
  }
  return ids;
}

module.exports = { postParentLines };