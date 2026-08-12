const router = require('express').Router();
const auth = require('../middleware/auth');

// TEMPORARY: all routes below return mock data, no MongoDB required yet.
// Once Mongo is connected, restore the Project/Expense/BankAccount/Property/
// Voucher/Comment model imports and swap each route back to a real query.

// Top stat cards: Expenses / Material Req / Service Req / Sales / Purchases / Receipt
router.get('/summary', auth, async (req, res) => {
  res.json({
    expenses: 0,
    materialReq: 0,
    serviceReq: 0,
    sales: 0,
    purchases: 0,
    receipt: 0,
  });
});

// Project progress cards
router.get('/projects', auth, async (req, res) => {
  res.json([]);
  // e.g. [{ _id: '1', name: 'Sample Project', status: 'ON TRACK', percentComplete: 0, months: 0, totalTasks: 0, completedTasks: 0 }]
});

// Expense donut chart, last 12 months
router.get('/expense-chart', auth, async (req, res) => {
  res.json([]);
});

// Inflow vs Outflow bar chart
router.get('/inflow-outflow', auth, async (req, res) => {
  res.json({ labels: ['Jul 2026'], inflow: [0], outflow: [0] });
});

// Cash Bank Balance table
router.get('/bank-balances', auth, async (req, res) => {
  res.json({ accounts: [], total: 0 });
});

// Unsold Property list
router.get('/unsold-properties', auth, async (req, res) => {
  res.json([]);
});

// Pending Voucher/Invoice feed
router.get('/pending-vouchers', auth, async (req, res) => {
  res.json([]);
});

// Latest Comments
router.get('/comments', auth, async (req, res) => {
  res.json([]);
});

// --- Project module dashboard endpoints ---

router.get('/project-summary', auth, async (req, res) => {
  res.json({
    totalProject: 0,
    runningProject: 0,
    materialReq: 0,
    serviceReq: 0,
    task: 0,
    unsoldFlatLand: 0,
  });
});

router.get('/project-status-summary', auth, async (req, res) => {
  res.json({ total: 0, onTrack: 0, atRisk: 0, inTrouble: 0 });
});

router.get('/project-progress', auth, async (req, res) => {
  res.json([]);
  // e.g. [{ name: 'Abashik Abashon', runningProgress: 0, financialProgress: 0 }]
});

// --- Inventory module dashboard endpoints ---

router.get('/inventory-summary', auth, async (req, res) => {
  res.json({
    customers: 0,
    suppliers: 0,
    materialReq: 0,
    serviceReq: 0,
    purchases: 0,
    sales: 0,
  });
});

router.get('/overflow-material', auth, async (req, res) => {
  res.json([]);
  // e.g. [{ _id: '1', description: 'Cement', budgetQty: 100, budgetAmount: 50000, issueQty: 120, issueAmount: 60000, status: 'Over Budget' }]
});

router.get('/purchase-chart', auth, async (req, res) => {
  res.json({ labels: ['Jul'], values: [0] });
  // Donut: purchases grouped by month, last 12 months
});

router.get('/purchase-vs-consumption', auth, async (req, res) => {
  res.json({ labels: ['Jul'], purchase: [0], consumption: [0] });
});

module.exports = router;