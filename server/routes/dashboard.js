const router = require('express').Router();
const { Op, fn, col, literal } = require('sequelize');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Expense = require('../models/Expense');
const Voucher = require('../models/Voucher');
const VoucherApproval = require('../models/VoucherApproval');
const BankAccount = require('../models/BankAccount');
const Property = require('../models/Property');
const Party = require('../models/Party');
const { Comment, CommentAttachment } = require('../models/associations');
const Customer = require('../models/Customer');
const ChartOfAccount = require('../models/ChartOfAccount');
const Sale = require('../models/Sale');
const Purchase = require('../models/Purchase');

// Helper: date range for a TimeFilterTabs-style range key
function getRangeBounds(range) {
  const now = new Date();
  const start = new Date(now);
  switch (range) {
    case 'weekly':
      start.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(now.getMonth() - 1);
      break;
    case 'yearly':
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
      return null; // no lower bound
    case 'today':
    default:
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { [Op.gte]: start };
}

// Top stat cards: Expenses / Material Req / Service Req / Sales / Purchases / Receipt
router.get('/summary', auth, async (req, res) => {
  try {
    const expenses = await Expense.sum('amount') || 0;
    const receipt = await Voucher.sum('amount', { where: { type: 'Receipt' } }) || 0;

    res.json({
      expenses,
      materialReq: 0, // TODO: wire up once MaterialRequisition is converted
      serviceReq: 0,  // TODO: wire up once ServiceRequisition is converted
      sales: 0,       // TODO: wire up once Sale is converted
      purchases: 0,   // TODO: wire up once Purchase is converted
      receipt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accounts module dashboard stat cards:
// Total Expense (sum) / Payment / Sales / Purchases / Receipt / Journal (counts)
// Accepts ?range=today|weekly|monthly|yearly|all (defaults to today, matches the
// Today/Weekly/Monthly/Yearly/All tabs in the UI).
router.get('/accounts-summary', auth, async (req, res) => {
  try {
    const dateFilter = getRangeBounds(req.query.range);
    const dateWhere = dateFilter ? { date: dateFilter } : {};

    const totalExpense = await Expense.sum('amount', { where: dateWhere }) || 0;
    const payment = await Voucher.count({ where: { type: 'Payment', ...dateWhere } });
    const receipt = await Voucher.count({ where: { type: 'Receipt', ...dateWhere } });
    const journal = await Voucher.count({ where: { type: 'Journal', ...dateWhere } });

    // NOTE: Sale/Purchase models weren't shared with this task, so if their date
    // column isn't literally `date`, adjust dateWhere's key below to match.
    const sales = await Sale.count({ where: dateWhere }).catch(() => 0);
    const purchases = await Purchase.count({ where: dateWhere }).catch(() => 0);

    res.json({ totalExpense, payment, sales, purchases, receipt, journal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Project progress cards
router.get('/projects', auth, async (req, res) => {
  try {
    const projects = await Project.findAll({ order: [['createdAt', 'DESC']], limit: 10 });
    const result = projects.map((p) => ({
      _id: p.id,
      name: p.name,
      image: p.image || null,
      location: p.location || '',
      status: p.status === 'Active' ? 'ON TRACK' : p.status,
      percentComplete: p.totalTask > 0 ? Math.round((p.completeTask / p.totalTask) * 100) : 0,
      months: 0, // TODO: no start/end month calc source yet
      totalTasks: p.totalTask || 0,
      completedTasks: p.completeTask || 0,
      workers: 0,     // TODO: no workers/assignment count source yet
      dueDate: p.endDate || null,
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Expense donut chart, last 12 months
router.get('/expense-chart', auth, async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const rows = await Expense.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'month'],
        [fn('SUM', col('amount')), 'total'],
      ],
      where: { date: { [Op.gte]: twelveMonthsAgo } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
    });

    res.json(rows.map((r) => ({ month: r.get('month'), total: Number(r.get('total')) || 0 })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Inflow vs Outflow bar chart
router.get('/inflow-outflow', auth, async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const inflowRows = await Voucher.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'month'],
        [fn('SUM', col('amount')), 'total'],
      ],
      where: { type: 'Receipt', date: { [Op.gte]: twelveMonthsAgo } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
    });
    const outflowRows = await Voucher.findAll({
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'month'],
        [fn('SUM', col('amount')), 'total'],
      ],
      where: { type: 'Payment', date: { [Op.gte]: twelveMonthsAgo } },
      group: [literal('month')],
      order: [[literal('month'), 'ASC']],
    });

    const labels = [...new Set([...inflowRows, ...outflowRows].map((r) => r.get('month')))].sort();
    const inflow = labels.map((m) => Number(inflowRows.find((r) => r.get('month') === m)?.get('total')) || 0);
    const outflow = labels.map((m) => Number(outflowRows.find((r) => r.get('month') === m)?.get('total')) || 0);

    res.json({ labels, inflow, outflow });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Cash Bank Balance table
router.get('/bank-balances', auth, async (req, res) => {
  try {
    const accounts = await BankAccount.findAll({ order: [['lastUpdated', 'DESC']] });
    const total = accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    res.json({ accounts, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Pending Cheque table (from vouchers with a bank + cheque date, awaiting reconciliation)
router.get('/pending-cheques', auth, async (req, res) => {
  try {
    const cheques = await Voucher.findAll({
      where: {
        chequeDate: { [Op.ne]: null },
        reconciliationStatus: 'Pending',
      },
      include: [{ model: BankAccount, as: 'bank', attributes: ['id', 'name'] }],
      order: [['chequeDate', 'DESC']],
    });

    res.json(cheques.map((c) => ({
      _id: c.id,
      voucherNo: c.voucherNo,
      description: c.narration,
      bank: c.bank?.name || c.bankId || '-',
      date: c.date,
      chequeDate: c.chequeDate,
      amount: c.amount,
      status: c.reconciliationStatus,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unsold Property list
router.get('/unsold-properties', auth, async (req, res) => {
  try {
    const properties = await Property.findAll({ where: { sold: false } });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Pending Voucher/Invoice feed
router.get('/pending-vouchers', auth, async (req, res) => {
  try {
    const vouchers = await Voucher.findAll({
      where: { status: 'pending' },
      include: [
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Party, as: 'contact', attributes: ['id', 'name'] },
        { model: VoucherApproval },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    const result = vouchers.map((v) => ({
      _id: v.id,
      type: v.type,
      amount: v.amount,
      project: v.project?.name || '-',
      contact: v.contact?.name || '',
      reference: v.voucherNo,
      addedBy: v.addedBy,
      date: v.date,
      // NOTE: VoucherApproval field names weren't shared with this task -
      // adjust `name`/`approved` below to match its actual columns.
      approvals: (v.VoucherApprovals || []).map((a) => ({
        name: a.approverName || a.name || 'Approver',
        approved: a.status === 'approved' || a.approved === true,
      })),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Latest Comments
router.get('/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.findAll({
      include: [{ model: CommentAttachment }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Project module dashboard endpoints ---

router.get('/project-summary', auth, async (req, res) => {
  try {
    const totalProject = await Project.count();
    const runningProject = await Project.count({ where: { status: 'Active' } });
    const unsoldFlatLand = await Property.count({ where: { sold: false } });

    res.json({
      totalProject,
      runningProject,
      materialReq: 0, // TODO
      serviceReq: 0,  // TODO
      task: 0,        // TODO: no task model yet
      unsoldFlatLand,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/project-status-summary', auth, async (req, res) => {
  try {
    const total = await Project.count();
    const onTrack = await Project.count({ where: { status: 'Active' } });
    const atRisk = 0;   // TODO: no delay-tracking field yet
    const inTrouble = 0; // TODO
    res.json({ total, onTrack, atRisk, inTrouble });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/project-progress', auth, async (req, res) => {
  try {
    const projects = await Project.findAll();
    const result = projects.map((p) => ({
      name: p.name,
      runningProgress: p.totalTask > 0 ? Math.round((p.completeTask / p.totalTask) * 100) : 0,
      financialProgress: 0, // TODO: needs cost-vs-budget calc like project.js reports
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Inventory module dashboard endpoints ---

router.get('/inventory-summary', auth, async (req, res) => {
  try {
    const customers = await Customer.count();
    const suppliers = await ChartOfAccount.count({ where: { contactType: 'Supplier' } });

    res.json({
      customers,
      suppliers,
      materialReq: 0, // TODO
      serviceReq: 0,  // TODO
      purchases: 0,   // TODO
      sales: 0,       // TODO
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/overflow-material', auth, async (req, res) => {
  res.json([]); // TODO: no Materials/BOQ usage model yet
});

router.get('/purchase-chart', auth, async (req, res) => {
  res.json({ labels: [], values: [] }); // TODO: wire up once Purchase is converted
});

router.get('/purchase-vs-consumption', auth, async (req, res) => {
  res.json({ labels: [], purchase: [], consumption: [] }); // TODO: wire up once Purchase/MaterialUsage are converted
});

module.exports = router;