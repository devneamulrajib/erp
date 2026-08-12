const router = require('express').Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const Voucher = require('../models/Voucher');

// TEMPORARY: in-memory store, no MongoDB yet.
// Once Mongo is reconnected, replace this array with a real Project model
// (fields below) and swap each route to use it instead.
let projects = [
  { _id: '1', code: 'P7339034', name: 'Head Office', projectType: 'Office', projectManager: '', description: '', budget: '', location: '', status: 'Active', area: '', startDate: '', endDate: '' },
  { _id: '2', code: 'P9827840', name: 'Mavie', projectType: 'Real Estate', projectManager: '', description: '', budget: '', location: '', status: 'Active', area: '', startDate: '', endDate: '' },
  { _id: '3', code: 'P3232317', name: 'Lake Garden Palace', projectType: 'Real Estate', projectManager: 'sojib', description: '', budget: 29629305.5, location: '', status: 'Active', area: '', startDate: '2026-05-05', endDate: '', totalTask: 5, completeTask: 0, sales: 0 },
  { _id: '4', code: 'P7783072', name: 'Abason Project', projectType: 'Real Estate', projectManager: '', description: '', budget: '', location: 'Gulshan', status: 'Active', area: '', startDate: '', endDate: '', totalTask: 1, completeTask: 0, sales: 0 },
  { _id: '5', code: 'P7881077', name: 'Abason Project 2', projectType: 'Architechtural & Interior Design', projectManager: '', description: '', budget: '', location: '', status: 'Active', area: '', startDate: '', endDate: '' },
  { _id: '6', code: 'P3599592', name: 'Abashik', projectType: 'Real Estate', projectManager: '', description: '', budget: '', location: 'Baitul Aman Housing Road#16,Plot # 996', status: 'Active', area: '', startDate: '', endDate: '' },
  { _id: '7', code: 'P1480635', name: 'Abason', projectType: 'Real Estate', projectManager: 'Masud Rana', description: '', budget: '', location: 'Baitul Aman Housing Road#16,Plot # 996', status: 'Active', area: '', startDate: '', endDate: '' },
  { _id: '8', code: 'P6171188', name: 'Abashon', projectType: 'Real Estate', projectManager: 'support srm', description: '', budget: '', location: 'HPL khonikaloy ,PLOT # 932,rOAD #15,bLOCK #i,Bashundhara R/A', status: 'Active', area: '', startDate: '2026-07-17', endDate: '2026-07-30' },
  { _id: '9', code: 'P4331115', name: 'Home', projectType: 'Real Estate', projectManager: 'Masud Rana', description: '', budget: '', location: 'Aftabnagar ,Block#M,Sect.#2,Road#4,Plot# 28,30 &32', status: 'Active', area: '', startDate: '2026-07-16', endDate: '' },
  { _id: '10', code: 'P5548438', name: 'Jolshiri', projectType: 'Real Estate', projectManager: '', description: '', budget: '', location: '', status: 'Active', area: '', startDate: '', endDate: '' },
  { _id: '11', code: 'P2094871', name: 'Sample Project 11', projectType: 'Real Estate', projectManager: '', description: '', budget: '', location: '', status: 'Active', area: '', startDate: '', endDate: '' },
];
let nextId = 12;

// TEMPORARY: no Site model yet — mirrors the shape shown in the reference
// Site Wise Income Report screenshot. Replace with a real Site collection
// (with a `project` ref) once one exists.
let sites = [
  { _id: 's1', name: 'Abason Project', projectId: '4', sales: 0 },
  { _id: 's2', name: 'Admin', projectId: '9', sales: 0 },
  { _id: 's3', name: 'HPDL', projectId: '9', sales: 0 },
];

function generateCode() {
  return 'P' + Math.floor(1000000 + Math.random() * 9000000);
}

function formatDuration(startDate, endDate) {
  const from = startDate ? new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  const to = endDate ? new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  return `From: ${from} To: ${to}`;
}

function withDuration(p) {
  return { ...p, duration: formatDuration(p.startDate, p.endDate) };
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

// Static option lists for the filter bar / modal selects
router.get('/options', auth, async (req, res) => {
  res.json({
    statuses: ['Active', 'Inactive', 'Complete', 'On Proposed'],
    areas: [], // populate once you have an Area model
    projectManagers: ['sojib', 'Masud Rana', 'support srm'],
  });
});

router.get('/', auth, async (req, res) => {
  const { projectType, status, area, search } = req.query;
  let result = projects;

  if (projectType && projectType !== 'All Types') {
    result = result.filter((p) => p.projectType === projectType);
  }
  if (status && status !== 'All Status') {
    result = result.filter((p) => p.status === status);
  }
  if (area) {
    result = result.filter((p) => p.area === area);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }

  res.json(result.map(withDuration));
});

router.post('/', auth, async (req, res) => {
  const { name, code, projectType, projectManager, description, budget, location, status, area, assignUser, startDate, endDate } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Project Name is required' });
  }
  const newProject = {
    _id: String(nextId++),
    code: code || generateCode(),
    name: name.trim(),
    projectType: projectType || '',
    projectManager: projectManager || '',
    description: description || '',
    budget: budget || '',
    location: location || '',
    status: status || 'Active',
    area: area || '',
    assignUser: assignUser || '',
    startDate: startDate || '',
    endDate: endDate || '',
  };
  projects.push(newProject);
  res.status(201).json(withDuration(newProject));
});

router.get('/:id', auth, async (req, res) => {
  const item = projects.find((p) => p._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(withDuration(item));
});

router.put('/:id', auth, async (req, res) => {
  const item = projects.find((p) => p._id === req.params.id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  const fields = ['name', 'projectType', 'projectManager', 'description', 'budget', 'location', 'status', 'area', 'assignUser', 'startDate', 'endDate'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) item[f] = req.body[f];
  });
  res.json(withDuration(item));
});

router.delete('/:id', auth, async (req, res) => {
  const before = projects.length;
  projects = projects.filter((p) => p._id !== req.params.id);
  if (projects.length === before) return res.status(404).json({ message: 'Not found' });
  res.json({ deleted: true });
});

// ------------------------------------------------------------------
// Reports (5 pages under Project > Reports)
// ------------------------------------------------------------------

// Sums a mongoose collection's `amount` grouped by its `project` string field.
// Both Expense and Voucher store `project` as free text right now, so this
// matches on project name. Swap to an ObjectId ref once Project moves to Mongo.
async function sumByProject(Model, filter = {}) {
  const rows = await Model.find(filter).lean();
  const totals = {};
  for (const r of rows) {
    const key = (r.project || '').trim();
    totals[key] = (totals[key] || 0) + (Number(r.amount) || 0);
  }
  return totals;
}

// 1) Project Summary Report — Materials / Services / Expenses breakdown for one project
// NOTE: there's no Materials/Services/BOQ model yet, so those two groups return
// empty until that data exists. Expenses is wired to the real Expense collection.
router.get('/reports/project-summary', auth, async (req, res) => {
  const { project, dateRange } = req.query;
  const filter = {};
  if (project) {
    const p = projects.find((pr) => pr._id === project || pr.name === project);
    if (p) filter.project = p.name;
  }

  const expenseDocs = await Expense.find(filter).lean();
  const expenses = expenseDocs.map((e) => ({
    id: e._id,
    description: e.category || e.reference || 'Expense',
    quantity: 1,
    amount: e.amount || 0,
  }));

  res.json({
    materials: [], // TODO: wire up once a Materials/BOQ model exists
    services: [],  // TODO: wire up once a Services model exists
    expenses,
  });
});

// 2) Project Progress Report — one row per project
router.get('/reports/project-progress', auth, async (req, res) => {
  const { project } = req.query;
  const expenseTotals = await sumByProject(Expense);

  let result = projects.map((p) => {
    const totalTask = p.totalTask || 0;
    const completeTask = p.completeTask || 0;
    const budget = Number(p.budget) || 0;
    const cost = expenseTotals[p.name] || 0;
    return {
      id: p._id,
      projectType: p.projectType,
      project: p.name,
      totalTask,
      completeTask,
      workingProgress: totalTask > 0 ? (completeTask / totalTask) * 100 : 0,
      budget,
      cost,
      financialProgress: budget > 0 ? (cost / budget) * 100 : 0,
    };
  });

  if (project) {
    result = result.filter((r) => r.id === project);
  }

  res.json(result);
});

// 3) Project Wise Income Statement — one row per project
// Income/receive figures use Voucher: `type: 'Receipt Voucher'` counts as
// received income. Adjust the type filter once your Voucher `type` values
// are finalized.
router.get('/reports/project-wise-income', auth, async (req, res) => {
  const { project } = req.query;
  const expenseTotals = await sumByProject(Expense);
  const receiptTotals = await sumByProject(Voucher, { type: 'Receipt Voucher' });

  let result = projects.map((p) => {
    const sales = Number(p.sales) || 0;
    const budget = Number(p.budget) || 0;
    const totalIncome = 0; // TODO: wire up once a Sales/Contract model exists
    const totalExpense = expenseTotals[p.name] || 0;
    const available = totalIncome - totalExpense;
    const profit = totalIncome - totalExpense;
    const receiveAmount = receiptTotals[p.name] || 0;
    return {
      id: p._id,
      project: p.name,
      sales,
      budget,
      totalIncome,
      totalExpense,
      available,
      profit,
      billSubmission: 0, // TODO: wire up once a Billing model exists
      receiveAmount,
      due: totalIncome - receiveAmount,
    };
  });

  if (project) {
    result = result.filter((r) => r.id === project);
  }

  res.json(result);
});

// 4) Site Wise Income Statement — one row per site
// TEMPORARY: uses the in-memory `sites` list above until a real Site model exists.
router.get('/reports/site-wise-income', auth, async (req, res) => {
  const { project } = req.query;
  let result = sites.map((s) => {
    const proj = projects.find((p) => p._id === s.projectId);
    return {
      id: s._id,
      siteName: s.name,
      project: proj ? proj.name : '',
      sales: Number(s.sales) || 0,
      totalIncome: 0,   // TODO: wire up once site-level income tracking exists
      totalExpense: 0,  // TODO: wire up once site-level expense tracking exists
      profit: 0,
      billSubmission: 0,
      receiveAmount: 0,
      due: 0,
    };
  });

  if (project) {
    result = result.filter((r) => {
      const proj = projects.find((p) => p._id === project);
      return proj && r.project === proj.name;
    });
  }

  res.json(result);
});

// 5) Amount Usage Report — BOQ/voucher usage per project
// TEMPORARY: mapped from Voucher docs (amount -> grandTotal, addedBy -> addedBy).
// `usage` (how many times a BOQ line was drawn against) has no source yet — hardcoded to 0.
// Replace with a real BOQ/Usage model once one exists.
router.get('/reports/amount-usage', auth, async (req, res) => {
  const vouchers = await Voucher.find({}).lean();
  const result = vouchers.map((v) => ({
    id: v._id,
    project: v.project || '',
    employeeName: '', // TODO: no employee field on Voucher yet
    grandTotal: v.amount || 0,
    usage: 0,
    addedBy: v.addedBy || '',
  }));
  res.json(result);
});

module.exports = router;