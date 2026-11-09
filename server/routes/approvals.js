// server/routes/approvals.js
const router = require('express').Router();
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  OfficeExpense,
  Expense,
  PaymentVoucher,
  ReceiptVoucher,
  JournalVoucher,
  ContraVoucher,
  MonthlyBudget,
  BudgetCategory,
  PaySlip,
  Employee,
} = require('../models/associations');
const logActivity = require('../utils/activityLog');
const { notifyAccountant } = require('../utils/notify');

// Voucher-style modules that share the same approval behaviour.
// `amount` picks the right amount field per model; `details` feeds the drawer.
const VOUCHER_MODULES = {
  PaymentVoucher: {
    Model: PaymentVoucher,
    label: 'Payment Voucher',
    prefix: 'PV',
    fallbackTitle: 'Payment Voucher',
    fallbackCategory: 'Project Payment',
    amount: (v) => v.amount,
    title: (v) => v.titleOfWork || v.item,
    details: (v) => ({ debitAccount: v.debitAccount, creditAccount: v.creditAccount, comment: v.comment }),
  },
  ReceiptVoucher: {
    Model: ReceiptVoucher,
    label: 'Receipt Voucher',
    prefix: 'RV',
    fallbackTitle: 'Receipt Voucher',
    fallbackCategory: 'Project Receipt',
    amount: (v) => v.amount,
    title: (v) => v.titleOfWork || v.paymentType,
    details: (v) => ({ debitAccount: v.debitAccount, creditAccount: v.creditAccount, comment: v.comment }),
  },
  JournalVoucher: {
    Model: JournalVoucher,
    label: 'Journal Voucher',
    prefix: 'JV',
    fallbackTitle: 'Journal Voucher',
    fallbackCategory: 'Journal Entry',
    amount: (v) => v.totalDebit,
    title: (v) => v.titleOfWork,
    details: (v) => ({ comment: v.comment }),
  },
  ContraVoucher: {
    Model: ContraVoucher,
    label: 'Contra Voucher',
    prefix: 'CV',
    fallbackTitle: 'Contra Voucher',
    fallbackCategory: 'Contra Entry',
    amount: (v) => v.totalDebit,
    title: (v) => v.titleOfWork,
    details: (v) => ({ comment: v.comment }),
  },
};

// Notifications / activity log must never block an approval decision.
async function safeNotify(...args) {
  try {
    await notifyAccountant(...args);
  } catch (err) {
    console.error('Approvals notify error:', err.message);
  }
}
async function safeLog(payload) {
  try {
    await logActivity(payload);
  } catch (err) {
    console.error('Approvals activity-log error:', err.message);
  }
}

// GET /api/approvals — Fetch financial requests across all modules
router.get('/', auth, async (req, res) => {
  try {
    const { status = 'pending', type } = req.query;
    const results = [];
    const targetStatus = String(status).toLowerCase();

    // 1. Module: Office Expenses (OfficeExpense)
    if (!type || type === 'OfficeExpense') {
      try {
        const officeExpenses = await OfficeExpense.findAll({ order: [['createdAt', 'DESC']] });
        const categories = await BudgetCategory.findAll();
        const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

        officeExpenses.forEach((e) => {
          const itemStatus = (e.status || 'pending').toLowerCase();
          if (targetStatus === 'all' || itemStatus === targetStatus) {
            results.push({
              id: e.id,
              requestType: 'OfficeExpense',
              typeLabel: 'Office Expense',
              reference: e.reference || `OE-${e.id}`,
              title: e.title || 'Office Expense',
              category: catMap[e.budgetCategoryId] || 'Office Budget',
              amount: Number(e.amount || 0),
              requestedBy: e.addedBy || 'Accountant',
              date: e.date || e.createdAt,
              status: itemStatus,
              attachment: e.attachment,
              details: {
                drAccount: e.drAccount,
                crAccount: e.crAccount,
              },
            });
          }
        });
      } catch (err) {
        console.error('Approvals fetch error (OfficeExpense):', err.message);
      }
    }

    // 2. Module: General Voucher Expenses (Expense)
    if (!type || type === 'Expense') {
      try {
        if (Expense) {
          const expenses = await Expense.findAll({ order: [['createdAt', 'DESC']] });
          expenses.forEach((e) => {
            const itemStatus = (e.status || 'pending').toLowerCase();
            if (targetStatus === 'all' || itemStatus === targetStatus) {
              results.push({
                id: e.id,
                requestType: 'Expense',
                typeLabel: 'General Expense',
                reference: e.reference || `EXP-${e.id}`,
                title: e.category ? `${e.category} Expense` : (e.project || 'General Expense'),
                category: e.project || e.category || 'General',
                amount: Number(e.amount || 0),
                requestedBy: e.addedBy || 'Accountant',
                date: e.date || e.createdAt,
                status: itemStatus,
                attachment: e.attachment,
                details: {
                  drAccount: e.drAccount,
                  crAccount: e.crAccount,
                  project: e.project,
                },
              });
            }
          });
        }
      } catch (err) {
        console.error('Approvals fetch error (Expense):', err.message);
      }
    }

    // 3. Voucher modules: Payment / Receipt / Journal / Contra
    for (const [requestType, cfg] of Object.entries(VOUCHER_MODULES)) {
      if (type && type !== requestType) continue;
      try {
        if (!cfg.Model) continue;
        const vouchers = await cfg.Model.findAll({ order: [['createdAt', 'DESC']] });
        vouchers.forEach((v) => {
          const itemStatus = (v.status || 'pending').toLowerCase();
          if (targetStatus === 'all' || itemStatus === targetStatus) {
            results.push({
              id: v.id,
              requestType,
              typeLabel: cfg.label,
              reference: v.voucherNo || `${cfg.prefix}-${v.id}`,
              title: cfg.title(v) || cfg.fallbackTitle,
              category: v.project || cfg.fallbackCategory,
              amount: Number(cfg.amount(v) || 0),
              requestedBy: v.addedBy || 'Accountant',
              date: v.date || v.createdAt,
              status: itemStatus,
              attachment: v.attachment,
              details: cfg.details(v),
            });
          }
        });
      } catch (err) {
        console.error(`Approvals fetch error (${requestType}):`, err.message);
      }
    }

    // 4. Module: Monthly Budget Requests
    if (!type || type === 'MonthlyBudget') {
      try {
        const budgets = await MonthlyBudget.findAll({
          where: { requestedAmount: { [Op.gt]: 0 } },
          order: [['createdAt', 'DESC']],
        });
        const categories = await BudgetCategory.findAll();
        const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

        budgets.forEach((b) => {
          const itemStatus = (b.status || 'Pending').toLowerCase();
          if (targetStatus === 'all' || itemStatus === targetStatus) {
            results.push({
              id: b.id,
              requestType: 'MonthlyBudget',
              typeLabel: 'Budget Allocation',
              reference: `BUD-${b.year}-${String(b.month).padStart(2, '0')}`,
              title: `${catMap[b.budgetCategoryId] || 'Budget'} (${b.month}/${b.year})`,
              category: catMap[b.budgetCategoryId] || 'Budget Category',
              amount: Number(b.requestedAmount || 0),
              requestedBy: b.requestedBy || b.addedBy || 'Accountant',
              date: b.createdAt,
              status: itemStatus,
              remarks: b.rejectionReason || b.note,
              details: {
                year: b.year,
                month: b.month,
                note: b.note,
                rejectionReason: b.rejectionReason,
              },
            });
          }
        });
      } catch (err) {
        console.error('Approvals fetch error (MonthlyBudget):', err.message);
      }
    }

    // 5. Module: Salary PaySlips (Draft = Pending, Paid = Approved)
    if (!type || type === 'PaySlip') {
      try {
        const slips = await PaySlip.findAll({
          include: [{ model: Employee, as: 'employee' }],
          order: [['year', 'DESC'], ['month', 'DESC']],
        });
        slips.forEach((s) => {
          const itemStatus = s.status === 'Paid' ? 'approved' : 'pending';
          if (targetStatus === 'all' || itemStatus === targetStatus) {
            results.push({
              id: s.id,
              requestType: 'PaySlip',
              typeLabel: 'Salary Disbursement',
              reference: `SAL-${s.year}${String(s.month).padStart(2, '0')}-${s.employeeId}`,
              title: `Salary: ${s.employee?.name || 'Employee'} (${s.month}/${s.year})`,
              category: 'HRM Payroll',
              amount: Number(s.netSalary || 0),
              requestedBy: s.generatedBy || 'Accountant',
              date: s.createdAt,
              status: itemStatus,
              details: {
                grossSalary: s.grossSalary,
                netSalary: s.netSalary,
                totalDeduction: s.totalDeduction,
              },
            });
          }
        });
      } catch (err) {
        console.error('Approvals fetch error (PaySlip):', err.message);
      }
    }

    // Sort newest requests first
    results.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/approvals/action — Admin Approve or Reject
router.post('/action', auth, requireAdmin, async (req, res) => {
  try {
    const { requestType, id, action, remarks } = req.body;
    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approved or rejected' });
    }

    const adminName = req.user?.name || 'Admin';

    // 1. Office Expense
    if (requestType === 'OfficeExpense') {
      const expense = await OfficeExpense.findByPk(id);
      if (!expense) return res.status(404).json({ message: 'Record not found' });

      expense.status = action;
      await expense.save();

      await safeLog({
        module: 'Expense',
        action: action === 'approved' ? 'Approved' : 'Rejected',
        message: `${action.toUpperCase()} office expense "${expense.title || expense.reference}"${remarks ? ` - Reason: ${remarks}` : ''}`,
        amount: expense.amount,
        budgetCategoryId: expense.budgetCategoryId,
        relatedType: 'OfficeExpense',
        relatedId: expense.id,
        performedBy: adminName,
      });

      const notifType = action === 'approved' ? 'OfficeExpenseApproved' : 'OfficeExpenseRejected';
      const notifMsg = action === 'approved'
        ? `Your Office Expense "${expense.title || expense.reference}" (৳${Number(expense.amount).toLocaleString()}) was approved by Admin.`
        : `Your Office Expense "${expense.title || expense.reference}" was rejected by Admin. Reason: ${remarks || 'Not specified'}`;

      await safeNotify(null, notifType, notifMsg, 'OfficeExpense', expense.id);
      return res.json({ success: true, message: `Office expense ${action}` });
    }

    // 2. General Expense
    if (requestType === 'Expense') {
      const exp = await Expense.findByPk(id);
      if (!exp) return res.status(404).json({ message: 'Record not found' });

      exp.status = action;
      await exp.save();

      await safeLog({
        module: 'Expense',
        action: action === 'approved' ? 'Approved' : 'Rejected',
        message: `${action.toUpperCase()} expense "${exp.reference}"${remarks ? ` - Reason: ${remarks}` : ''}`,
        amount: exp.amount,
        relatedType: 'Expense',
        relatedId: exp.id,
        performedBy: adminName,
      });

      const notifType = action === 'approved' ? 'OfficeExpenseApproved' : 'OfficeExpenseRejected';
      const notifMsg = action === 'approved'
        ? `Your Expense "${exp.reference}" (৳${Number(exp.amount).toLocaleString()}) was approved by Admin.`
        : `Your Expense "${exp.reference}" was rejected by Admin. Reason: ${remarks || 'Not specified'}`;

      await safeNotify(null, notifType, notifMsg, 'Expense', exp.id);
      return res.json({ success: true, message: `Expense ${action}` });
    }

    // 3. Vouchers: Payment / Receipt / Journal / Contra
    if (VOUCHER_MODULES[requestType]) {
      const cfg = VOUCHER_MODULES[requestType];
      const voucher = await cfg.Model.findByPk(id);
      if (!voucher) return res.status(404).json({ message: 'Record not found' });

      voucher.status = action;
      if (remarks) voucher.comment = `${voucher.comment ? `${voucher.comment} | ` : ''}Admin: ${remarks}`;
      await voucher.save();

      const amount = cfg.amount(voucher);
      const ref = voucher.voucherNo || `${cfg.prefix}-${voucher.id}`;

      await safeLog({
        module: 'Voucher',
        action: action === 'approved' ? 'Approved' : 'Rejected',
        message: `${action.toUpperCase()} ${cfg.label.toLowerCase()} "${ref}"${remarks ? ` - Note: ${remarks}` : ''}`,
        amount,
        relatedType: requestType,
        relatedId: voucher.id,
        performedBy: adminName,
      });

      const notifType = `${requestType}${action === 'approved' ? 'Approved' : 'Rejected'}`;
      const notifMsg = action === 'approved'
        ? `Your ${cfg.label} "${ref}" (৳${Number(amount || 0).toLocaleString()}) was approved by Admin.`
        : `Your ${cfg.label} "${ref}" was rejected by Admin. Reason: ${remarks || 'Not specified'}`;

      await safeNotify(null, notifType, notifMsg, requestType, voucher.id);
      return res.json({ success: true, message: `${cfg.label} ${action}` });
    }

    // 4. Monthly Budget
    if (requestType === 'MonthlyBudget') {
      const budget = await MonthlyBudget.findByPk(id);
      if (!budget) return res.status(404).json({ message: 'Record not found' });

      if (action === 'approved') {
        budget.status = 'Approved';
        budget.allocatedAmount = Number(budget.requestedAmount) || 0;
        budget.approvedBy = adminName;
        budget.approvedAt = new Date();
      } else {
        budget.status = 'Rejected';
        budget.rejectedBy = adminName;
        budget.rejectedAt = new Date();
        budget.rejectionReason = remarks || 'Rejected by Admin';
      }
      await budget.save();

      await safeLog({
        module: 'Budget',
        action: action === 'approved' ? 'Approved' : 'Rejected',
        message: `${action.toUpperCase()} budget request for ${budget.month}/${budget.year}${remarks ? ` - Note: ${remarks}` : ''}`,
        amount: budget.requestedAmount,
        budgetCategoryId: budget.budgetCategoryId,
        relatedType: 'MonthlyBudget',
        relatedId: budget.id,
        performedBy: adminName,
      });

      const notifType = action === 'approved' ? 'BudgetApproved' : 'BudgetRejected';
      const notifMsg = action === 'approved'
        ? `Budget request for ${budget.month}/${budget.year} (৳${Number(budget.requestedAmount).toLocaleString()}) was approved by Admin.`
        : `Budget request for ${budget.month}/${budget.year} was rejected by Admin. Reason: ${remarks || 'Not specified'}`;

      await safeNotify(null, notifType, notifMsg, 'MonthlyBudget', budget.id);
      return res.json({ success: true, message: `Budget request ${action}` });
    }

    if (requestType === 'PaySlip') {
      return res.status(400).json({ message: 'Salary disbursements are approved from the Payroll (PaySlip) page, not here.' });
    }

    res.status(400).json({ message: 'Unsupported request type' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/approvals/accountant-metrics — Metrics for Accountant Dashboard
router.get('/accountant-metrics', auth, async (req, res) => {
  try {
    let pendingCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let totalRequested = 0;
    let totalApproved = 0;

    const tally = (items, getAmount) => {
      items.forEach((item) => {
        const s = (item.status || 'pending').toLowerCase();
        const amt = Number(getAmount(item)) || 0;
        totalRequested += amt;
        if (s === 'approved') {
          approvedCount += 1;
          totalApproved += amt;
        } else if (s === 'rejected') {
          rejectedCount += 1;
        } else {
          pendingCount += 1;
        }
      });
    };

    try {
      const officeExpenses = await OfficeExpense.findAll();
      tally(officeExpenses, (e) => e.amount);
    } catch {}

    try {
      if (Expense) {
        const expenses = await Expense.findAll();
        tally(expenses, (e) => e.amount);
      }
    } catch {}

    for (const cfg of Object.values(VOUCHER_MODULES)) {
      try {
        if (!cfg.Model) continue;
        const rows = await cfg.Model.findAll();
        tally(rows, cfg.amount);
      } catch {}
    }

    try {
      const budgets = await MonthlyBudget.findAll({ where: { requestedAmount: { [Op.gt]: 0 } } });
      tally(budgets, (b) => b.requestedAmount);
    } catch {}

    res.json({
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: pendingCount + approvedCount + rejectedCount,
      totalRequested,
      totalApproved,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;