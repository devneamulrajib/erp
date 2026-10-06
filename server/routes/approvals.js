// server/routes/approvals.js
const router = require('express').Router();
const { Op } = require('sequelize');

const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const {
  OfficeExpense,
  Expense,
  PaymentVoucher,
  MonthlyBudget,
  BudgetCategory,
  PaySlip,
  Employee,
} = require('../models/associations');
const logActivity = require('../utils/activityLog');
const { notifyAdmin, notifyAccountant } = require('../utils/notify');

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

    // 3. Module: Payment Vouchers
    if (!type || type === 'PaymentVoucher') {
      try {
        const paymentVouchers = await PaymentVoucher.findAll({ order: [['createdAt', 'DESC']] });
        paymentVouchers.forEach((pv) => {
          const itemStatus = (pv.status || 'pending').toLowerCase();
          if (targetStatus === 'all' || itemStatus === targetStatus) {
            results.push({
              id: pv.id,
              requestType: 'PaymentVoucher',
              typeLabel: 'Payment Voucher',
              reference: pv.voucherNo || `PV-${pv.id}`,
              title: pv.titleOfWork || pv.item || 'Payment Voucher',
              category: pv.project || 'Project Payment',
              amount: Number(pv.amount || 0),
              requestedBy: pv.addedBy || 'Accountant',
              date: pv.date || pv.createdAt,
              status: itemStatus,
              attachment: pv.attachment,
              details: {
                debitAccount: pv.debitAccount,
                creditAccount: pv.creditAccount,
                comment: pv.comment,
              },
            });
          }
        });
      } catch (err) {
        console.error('Approvals fetch error (PaymentVoucher):', err.message);
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

      await logActivity({
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

      await notifyAccountant(null, notifType, notifMsg, 'OfficeExpense', expense.id);
      return res.json({ success: true, message: `Office expense ${action}` });
    }

    // 2. General Expense
    if (requestType === 'Expense') {
      const exp = await Expense.findByPk(id);
      if (!exp) return res.status(404).json({ message: 'Record not found' });

      exp.status = action;
      await exp.save();

      await logActivity({
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

      await notifyAccountant(null, notifType, notifMsg, 'Expense', exp.id);
      return res.json({ success: true, message: `Expense ${action}` });
    }

    // 3. Payment Voucher
    if (requestType === 'PaymentVoucher') {
      const pv = await PaymentVoucher.findByPk(id);
      if (!pv) return res.status(404).json({ message: 'Record not found' });

      pv.status = action;
      if (remarks) pv.comment = `${pv.comment ? `${pv.comment} | ` : ''}Admin: ${remarks}`;
      await pv.save();

      await logActivity({
        module: 'Voucher',
        action: action === 'approved' ? 'Approved' : 'Rejected',
        message: `${action.toUpperCase()} payment voucher "${pv.voucherNo}"${remarks ? ` - Note: ${remarks}` : ''}`,
        amount: pv.amount,
        relatedType: 'PaymentVoucher',
        relatedId: pv.id,
        performedBy: adminName,
      });

      const notifType = action === 'approved' ? 'PaymentVoucherApproved' : 'PaymentVoucherRejected';
      const notifMsg = action === 'approved'
        ? `Your Payment Voucher "${pv.voucherNo}" (৳${Number(pv.amount).toLocaleString()}) was approved by Admin.`
        : `Your Payment Voucher "${pv.voucherNo}" was rejected by Admin. Reason: ${remarks || 'Not specified'}`;

      await notifyAccountant(null, notifType, notifMsg, 'PaymentVoucher', pv.id);
      return res.json({ success: true, message: `Payment voucher ${action}` });
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

      await logActivity({
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

      await notifyAccountant(null, notifType, notifMsg, 'MonthlyBudget', budget.id);
      return res.json({ success: true, message: `Budget request ${action}` });
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

    try {
      const paymentVouchers = await PaymentVoucher.findAll();
      tally(paymentVouchers, (pv) => pv.amount);
    } catch {}

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