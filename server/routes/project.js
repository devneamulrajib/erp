const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const Project = require('../models/Project');
const Site = require('../models/Site');
const Expense = require('../models/Expense');
const Voucher = require('../models/Voucher');

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
  res.json({
    statuses: ['Active', 'Inactive', 'Complete', 'On Proposed'],
    areas: [],
    projectManagers: ['sojib', 'Masud Rana', 'support srm'],
  });
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
    const { name, code, projectType, projectManager, description, budget, location, status, area, assignUser, startDate, endDate } = req.body;
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

    const fields = ['name', 'projectType', 'projectManager', 'description', 'budget', 'location', 'status', 'area', 'assignUser', 'startDate', 'endDate'];
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
// Reports (5 pages under Project > Reports)
// ------------------------------------------------------------------

async function sumByProject(Model, where = {}) {
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
    const expenseTotals = await sumByProject(Expense);
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
    const expenseTotals = await sumByProject(Expense);
    const receiptTotals = await sumByProject(Voucher, { type: 'Receipt' });
    const projects = await Project.findAll();

    let result = projects.map((p) => {
      const sales = Number(p.sales) || 0;
      const budget = Number(p.budget) || 0;
      const totalIncome = 0;
      const totalExpense = expenseTotals[p.name] || 0;
      const available = totalIncome - totalExpense;
      const profit = totalIncome - totalExpense;
      const receiveAmount = receiptTotals[p.name] || 0;
      return {
        id: p.id,
        project: p.name,
        sales, budget, totalIncome, totalExpense, available, profit,
        billSubmission: 0,
        receiveAmount,
        due: totalIncome - receiveAmount,
      };
    });

    if (project) result = result.filter((r) => String(r.id) === String(project));
    res.json(result);
  } catch (err) {
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