// server/utils/officeExpensePosting.js
//
// Single place that turns an OfficeExpense into ledger entries.
//
//   approved           -> Voucher (type 'Office Expense', status 'approved') + one Dr line + one Cr line
//   pending / rejected -> nothing on the ledger (any old voucher is removed)
//
// Every function takes the caller's Sequelize transaction `t`, so the expense
// and its journal entry are saved together or not at all.
const { Op } = require('sequelize');
const {
  Voucher,
  VoucherEntry,
  VoucherApproval,
  ChartOfAccount,
  BudgetCategory,
  PaySlip,
  EmployeeAdvance,
} = require('../models/associations');
const OfficeAccountDefault = require('../models/OfficeAccountDefault');

const VOUCHER_TYPE = 'Office Expense';
const PAYMENT_METHODS = ['Cash', 'Bank', 'Cheque'];

const cleanText = (v) => String(v ?? '').trim();
const cleanMethod = (v) => (PAYMENT_METHODS.includes(v) ? v : '');

// Error that carries an HTTP status so routes can answer with it directly.
const fail = (message, status = 400) => Object.assign(new Error(message), { status });

// Fill debit/credit from the category default and the payment-channel default
// when the client did not send them.
async function applyAccountDefaults(body) {
  let drAccount = cleanText(body.drAccount);
  let crAccount = cleanText(body.crAccount);

  if (!drAccount && body.budgetCategory) {
    const cat = await BudgetCategory.findByPk(body.budgetCategory);
    const parent = cat?.parentId ? await BudgetCategory.findByPk(cat.parentId) : null;
    drAccount = cat?.defaultDrAccount || parent?.defaultDrAccount || '';
  }

  if (!crAccount) {
    const d = await OfficeAccountDefault.findOne();
    const method = cleanMethod(body.paymentMethod) || 'Cash';
    crAccount = (method === 'Cash'
      ? d?.cashAccount
      : method === 'Cheque'
        ? d?.chequeAccount || d?.bankAccount
        : d?.bankAccount) || '';
  }

  return { drAccount, crAccount };
}

async function findAccountId(name, label, t) {
  const clean = cleanText(name);
  if (!clean) throw fail(`${label} account is required`);
  const matches = await ChartOfAccount.findAll({
    where: { name: clean },
    attributes: ['id'],
    order: [['id', 'ASC']],
    transaction: t,
  });
  if (matches.length === 0) {
    throw fail(`${label} account "${clean}" was not found in Chart of Accounts. Re-select it from the dropdown.`);
  }
  if (matches.length > 1) {
    throw fail(`More than one account is named "${clean}" in Chart of Accounts. Rename one so the entry posts to the right account.`);
  }
  return matches[0].id;
}

// Looks both accounts up. Used on every save (even while pending) so a bad
// account is caught now and not later at approval time.
async function resolveAccountIds(drAccount, crAccount, t) {
  const drId = await findAccountId(drAccount, 'Debit', t);
  const crId = await findAccountId(crAccount, 'Credit', t);
  return { drId, crId };
}

// OE<yy><mm><dd>-0001. Uses the highest existing suffix (not a row count) so a
// deleted voucher can never cause a duplicate number.
async function generateVoucherNo(t) {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const prefix = `OE${yy}${mm}${dd}`;
  const last = await Voucher.findOne({
    where: { voucherNo: { [Op.like]: `${prefix}-%` } },
    order: [['voucherNo', 'DESC']],
    transaction: t,
  });
  const lastSeq = last ? parseInt(String(last.voucherNo).split('-').pop(), 10) || 0 : 0;
  return `${prefix}-${String(lastSeq + 1).padStart(4, '0')}`;
}

// Payroll creates its own OfficeExpense + voucher (with its own lines). Those
// are never rebuilt here, only their voucher status is mirrored.
async function isManagedElsewhere(expense, t) {
  const [slip, advance] = await Promise.all([
    PaySlip.findOne({ where: { officeExpenseId: expense.id }, attributes: ['id'], transaction: t }),
    EmployeeAdvance.findOne({ where: { officeExpenseId: expense.id }, attributes: ['id'], transaction: t }),
  ]);
  return !!(slip || advance);
}

// Create or rebuild the voucher and its Dr/Cr lines. Marks the voucher approved.
async function postExpense(expense, user, t) {
  const amount = Number(expense.amount) || 0;
  if (!(amount > 0)) throw fail('Amount must be greater than 0');
  if (cleanText(expense.drAccount) === cleanText(expense.crAccount)) {
    throw fail('Debit and Credit accounts must be different');
  }
  const { drId, crId } = await resolveAccountIds(expense.drAccount, expense.crAccount, t);

  let voucher = expense.voucherId ? await Voucher.findByPk(expense.voucherId, { transaction: t }) : null;
  if (!voucher) {
    voucher = await Voucher.create({
      voucherNo: await generateVoucherNo(t),
      type: VOUCHER_TYPE,
      date: expense.date,
      addedBy: user?.name || 'Admin',
    }, { transaction: t });
  } else {
    voucher.editedBy = user?.name || voucher.editedBy;
  }

  voucher.date = expense.date;
  voucher.narration = expense.title || '';
  voucher.reference = expense.reference;
  voucher.amount = amount;
  voucher.attachment = expense.attachment || '';
  voucher.paymentMethod = expense.paymentMethod || voucher.paymentMethod;
  voucher.status = 'approved';
  await voucher.save({ transaction: t });

  await VoucherEntry.destroy({ where: { voucherId: voucher.id }, transaction: t });
  const lines = [
    { accountId: drId, debit: amount, credit: 0, voucherId: voucher.id },
    { accountId: crId, debit: 0, credit: amount, voucherId: voucher.id },
  ];
  const totalDr = lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDr - totalCr) > 0.005) throw fail('Journal entry is not balanced');
  await VoucherEntry.bulkCreate(lines, { transaction: t });

  expense.voucherId = voucher.id;
  return voucher;
}

// Remove the voucher and its lines, so the expense no longer touches the ledger.
async function unpostExpense(expense, t) {
  if (!expense.voucherId) return;
  await VoucherEntry.destroy({ where: { voucherId: expense.voucherId }, transaction: t });
  await VoucherApproval.destroy({ where: { voucherId: expense.voucherId }, transaction: t });
  await Voucher.destroy({ where: { id: expense.voucherId }, transaction: t });
  expense.voucherId = null;
}

// The one call routes make after changing an expense: puts the ledger in line
// with expense.status. The caller must save the expense afterwards.
async function syncLedger(expense, user, t) {
  const status = String(expense.status || '').toLowerCase();

  if (await isManagedElsewhere(expense, t)) {
    if (expense.voucherId) {
      const voucherStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
      await Voucher.update({ status: voucherStatus }, { where: { id: expense.voucherId }, transaction: t });
    }
    return null;
  }

  if (status === 'approved') return postExpense(expense, user, t);
  await unpostExpense(expense, t);
  return null;
}

module.exports = {
  VOUCHER_TYPE,
  PAYMENT_METHODS,
  cleanText,
  cleanMethod,
  fail,
  applyAccountDefaults,
  resolveAccountIds,
  isManagedElsewhere,
  postExpense,
  unpostExpense,
  syncLedger,
};