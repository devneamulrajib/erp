const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const Project = require('../models/Project');
const Site = require('../models/Site');
const Expense = require('../models/Expense');
const Voucher = require('../models/Voucher');
const Sale = require('../models/Sale');
const ProjectManager = require('../models/ProjectManager');

function generateCode() {
  return 'P' + Math.floor(1000000 + Math.random() * 9000000);
}

function formatDuration(startDate, endDate) {
  const from = startDate ? new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  const to = endDate ? new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  return `From: ${from} To: ${to}`;
}

function withDuration(p) {
  const plain = p.toJSON ? p.toJSON() : p;
  return { ...plain, duration: formatDuration(plain.startDate, plain.endDate) };
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/options', auth, async (req, res) => {
  try {
    const managers = await ProjectManager.findAll({ order: [['name', 'ASC']] });
    res.json({
      statuses: ['Active', 'Inactive', 'Complete', 'On Proposed'],
      areas: [],
      projectManagers: managers.map((m) => ({ id: m.id, name: m.name })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { projectType, status, area, search } = req.query;
    const where = {};
    if (projectType && projectType !== 'All Types') where.projectType = projectType;
    if (status && status !== 'All Status') where.status = status;
    if (area) where.area = area;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
      ];
    }

    const projects = await Project.findAll({ where });
    res.json(projects.map(withDuration));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      name, code, projectType, projectManager, description,
      budget, location, status, area, assignUser, startDate, endDate, image,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Project Name is required' });
    }

    const newProject = await Project.create({
      code: code || generateCode(),
      name: name.trim(),
      projectType: projectType || '',
      projectManager: projectManager || '',
      description: description || '',
      budget: budget || null,
      location: location || '',
      status: status || 'Active',
      area: area || '',
      assignUser: assignUser || '',
      startDate: startDate || '',
      endDate: endDate || '',
      image: image || null,
    });

    res.status(201).json(withDuration(newProject));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Project.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(withDuration(item));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Project.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'name', 'projectType', 'projectManager', 'description',
      'budget', 'location', 'status', 'area', 'assignUser', 'startDate', 'endDate', 'image',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });

    await item.save();
    res.json(withDuration(item));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Project.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ------------------------------------------------------------------
// Reports
// ------------------------------------------------------------------

// Sums a model's `amount`-like field grouped by a real projectId FK column.
// Use this for any model that has projectId (Voucher, Sale, ContractorBill, etc).
async function sumByProjectId(Model, projectIdField, amountFields, where = {}) {
  const rows = await Model.findAll({ where });
  const totals = {};
  for (const r of rows) {
    const key = r[projectIdField];
    if (key == null) continue;
    let amount = 0;
    for (const f of amountFields) {
      if (r[f] != null) { amount = Number(r[f]) || 0; break; }
    }
    totals[key] = (totals[key] || 0) + amount;
  }
  return totals;
}

// Sums a model's `amount` field grouped by a plain string `project` name column.
// Only needed for models like Expense that don't have a real projectId FK yet.
async function sumByProjectName(Model, where = {}) {
  const rows = await Model.findAll({ where });
  const totals = {};
  for (const r of rows) {
    const key = (r.project || '').trim();
    totals[key] = (totals[key] || 0) + (Number(r.amount) || 0);
  }
  return totals;
}

router.get('/reports/project-summary', auth, async (req, res) => {
  try {
    const { project } = req.query;
    const where = {};
    if (project) {
      const p = await Project.findOne({ where: { [Op.or]: [{ id: project }, { name: project }] } });
      if (p) where.project = p.name;
    }

    const expenseDocs = await Expense.findAll({ where });
    const expenses = expenseDocs.map((e) => ({
      id: e.id,
      description: e.category || e.reference || 'Expense',
      quantity: 1,
      amount: e.amount || 0,
    }));

    res.json({ materials: [], services: [], expenses });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/reports/project-progress', auth, async (req, res) => {
  try {
    const { project } = req.query;
    const expenseTotals = await sumByProjectName(Expense);
    const projects = await Project.findAll();

    let result = projects.map((p) => {
      const totalTask = p.totalTask || 0;
      const completeTask = p.completeTask || 0;
      const budget = Number(p.budget) || 0;
      const cost = expenseTotals[p.name] || 0;
      return {
        id: p.id,
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

    if (project) result = result.filter((r) => String(r.id) === String(project));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/reports/project-wise-income', auth, async (req, res) => {
  try {
    const { project } = req.query;

    // Expense has no projectId FK yet — only a plain `project` string column —
    // so this side stays name-keyed until a migration adds Expense.projectId.
    const expenseTotals = await sumByProjectName(Expense);

    // Voucher and Sale both have a real projectId FK (see associations.js),
    // so these are keyed by id, not name.
    const receiptTotals = await sumByProjectId(Voucher, 'projectId', ['amount'], { type: 'Receipt' });
    // ASSUMPTION: "income" = amount billed to the customer via Sale.
    // Adjust the field list below if Sale's real column isn't grandTotal/amount/total.
    const incomeTotals = await sumByProjectId(Sale, 'projectId', ['grandTotal', 'amount', 'total']);

    const projects = await Project.findAll();

    let result = projects.map((p) => {
      const totalIncome = incomeTotals[p.id] || 0;
      const totalExpense = expenseTotals[p.name] || 0;
      const receiveAmount = receiptTotals[p.id] || 0;
      return {
        id: p.id,
        project: p.name,
        sales: Number(p.sales) || 0,
        budget: Number(p.budget) || 0,
        totalIncome,
        totalExpense,
        available: totalIncome - totalExpense,
        profit: totalIncome - totalExpense,
        billSubmission: totalIncome,
        receiveAmount,
        due: totalIncome - receiveAmount,
      };
    });

    if (project) result = result.filter((r) => String(r.id) === String(project));
    res.json(result);
  } catch (err) {
    console.error('GET /api/projects/reports/project-wise-income failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/reports/site-wise-income', auth, async (req, res) => {
  try {
    const { project } = req.query;
    const sites = await Site.findAll();
    const projects = await Project.findAll();

    let result = sites.map((s) => {
      const proj = projects.find((p) => String(p.id) === String(s.projectId));
      return {
        id: s.id,
        siteName: s.name,
        project: proj ? proj.name : '',
        sales: Number(s.sales) || 0,
        totalIncome: 0,
        totalExpense: 0,
        profit: 0,
        billSubmission: 0,
        receiveAmount: 0,
        due: 0,
      };
    });

    if (project) {
      const proj = projects.find((p) => String(p.id) === String(project));
      result = result.filter((r) => proj && r.project === proj.name);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/reports/amount-usage', auth, async (req, res) => {
  try {
    const vouchers = await Voucher.findAll();
    const result = vouchers.map((v) => ({
      id: v.id,
      project: v.projectId || '',
      employeeName: '',
      grandTotal: v.amount || 0,
      usage: 0,
      addedBy: v.addedBy || '',
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;