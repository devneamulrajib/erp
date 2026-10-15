// server/routes/investor.js
const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  Investor,
  Investment,
  InvestorPayment,
  Project,
} = require('../models/associations');
const { computeInvestmentMetrics } = require('../utils/investorCalculations');
const logActivity = require('../utils/activityLog');

const INVESTMENT_TYPES = ['project_based', 'fixed_return', 'equity'];
const TYPE_LABELS = {
  project_based: 'project profit share',
  fixed_return: 'fixed return',
  equity: 'equity (hybrid)',
};

const who = (req) => req.user?.name || req.user?.username || req.user?.email || 'Admin';
const short = (s) => String(s || '').slice(0, 240);
const log = (req, investorId, action, message, amount) =>
  logActivity({
    module: 'Investor',
    action,
    message: short(message),
    amount,
    relatedType: 'Investor',
    relatedId: Number(investorId),
    performedBy: who(req),
  });
const bdt = (n) => `৳ ${Number(n || 0).toLocaleString('en-IN')}`;

async function generateInvestorCode() {
  const count = await Investor.count();
  return `INV-${String(count + 1).padStart(4, '0')}`;
}
async function generateInvestmentCode() {
  const count = await Investment.count();
  return `INVST-${String(count + 1).padStart(5, '0')}`;
}
/**
 * Loads investments plus their investor, project and payments using
 * separate queries, so nothing depends on association aliases.
 * Returns plain objects with `investor`, `project`, `payments` and `metrics`.
 */
async function loadInvestments(where) {
  const investments = await Investment.findAll({ where, order: [['id', 'DESC']] });
  if (investments.length === 0) return [];

  const ids = investments.map((i) => i.id);
  const investorIds = [...new Set(investments.map((i) => i.investorId).filter(Boolean))];
  const projectIds = [...new Set(investments.map((i) => i.projectId).filter(Boolean))];

  const [payments, investors, projects] = await Promise.all([
    InvestorPayment.findAll({ where: { investmentId: ids }, order: [['id', 'DESC']] }),
    investorIds.length ? Investor.findAll({ where: { id: investorIds } }) : [],
    projectIds.length ? Project.findAll({ where: { id: projectIds } }) : [],
  ]);

  const paymentsByInvestment = {};
  payments.forEach((p) => {
    if (!paymentsByInvestment[p.investmentId]) paymentsByInvestment[p.investmentId] = [];
    paymentsByInvestment[p.investmentId].push(p);
  });

  const investorMap = {};
  investors.forEach((i) => { investorMap[i.id] = i; });
  const projectMap = {};
  projects.forEach((p) => { projectMap[p.id] = p; });

  const rows = [];
  for (const inv of investments) {
    const invPayments = paymentsByInvestment[inv.id] || [];
    const metrics = await computeInvestmentMetrics(inv, invPayments);
    rows.push({
      ...inv.toJSON(),
      investor: investorMap[inv.investorId] ? investorMap[inv.investorId].toJSON() : null,
      project: projectMap[inv.projectId] ? projectMap[inv.projectId].toJSON() : null,
      payments: invPayments.map((p) => p.toJSON()),
      metrics,
    });
  }
  return rows;
}

// 1. DASHBOARD SUMMARY
router.get('/dashboard-summary', auth, async (req, res) => {
  try {
    const { investorId, projectId, status, from, to } = req.query;

    const where = {};
    if (investorId) where.investorId = investorId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (from || to) {
      where.investmentDate = {};
      if (from) where.investmentDate[Op.gte] = from;
      if (to) where.investmentDate[Op.lte] = to;
    }

    if (req.user?.role === 'investor' && req.user?.investorId) {
      where.investorId = req.user.investorId;
    }

    const rows = await loadInvestments(where);

    let totalInvested = 0;
    let totalProfitGenerated = 0;
    let totalExpectedProfit = 0;
    let totalPaid = 0;
    let currentInvestmentValue = 0;

    const projectBreakdown = {};
    const monthlyTrend = {};

    for (const row of rows) {
      const m = row.metrics;
      totalInvested += m.principal;
      totalProfitGenerated += m.profitGenerated;
      totalExpectedProfit += m.expectedProfit;
      totalPaid += m.totalPaid;
      currentInvestmentValue += m.currentInvestmentValue;

      const pName = row.project ? row.project.name : 'General Business';
      projectBreakdown[pName] = (projectBreakdown[pName] || 0) + m.principal;

      const month = String(row.investmentDate || '').slice(0, 7);
      if (month) {
        monthlyTrend[month] = monthlyTrend[month] || { invested: 0, profit: 0 };
        monthlyTrend[month].invested += m.principal;
        monthlyTrend[month].profit += m.profitGenerated;
      }
    }

    const overallRoi =
      totalInvested > 0 ? ((totalProfitGenerated / totalInvested) * 100).toFixed(2) : 0;

    res.json({
      kpis: {
        totalInvested,
        currentInvestmentValue,
        profitGenerated: totalProfitGenerated,
        expectedProfit: totalExpectedProfit,
        totalReturn: totalInvested + totalProfitGenerated,
        totalPaid,
        outstandingLiability: currentInvestmentValue,
        roiPercent: Number(overallRoi),
      },
      projectBreakdown,
      monthlyTrend,
      recentInvestments: rows.slice(0, 10),
      totalCount: rows.length,
    });
  } catch (err) {
    console.error('Error in dashboard-summary:', err);
    res.status(500).json({ message: err.message });
  }
});

// 2. INVESTOR CRUD
router.get('/investors', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const investors = await Investor.findAll({
      where,
      include: [{ model: Investment, as: 'investments' }],
      order: [['id', 'DESC']],
    });

    const list = investors.map((inv) => {
      const totalInvested = (inv.investments || []).reduce(
        (acc, item) => acc + (Number(item.principalAmount) || 0),
        0
      );
      return {
        ...inv.toJSON(),
        totalInvestedAmount: totalInvested,
        investmentsCount: (inv.investments || []).length,
      };
    });

    res.json(list);
  } catch (err) {
    console.error('Error in GET /investors:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/investors', auth, async (req, res) => {
  try {
    const {
      name, phone, email, address, nidPassport, startDate,
      investmentType, profitSharePercent, fixedReturnPercent, notes,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Full Name and Phone Number are required' });
    }

    const investorCode = await generateInvestorCode();

    const investor = await Investor.create({
      investorCode,
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : null,
      address: address ? String(address).trim() : null,
      nidPassport: nidPassport ? String(nidPassport).trim() : null,
      startDate: startDate || new Date(),
      investmentType: investmentType || 'project_based',
      profitSharePercent: Number(profitSharePercent) || 0,
      fixedReturnPercent: Number(fixedReturnPercent) || 0,
      status: 'active',
      notes: notes || null,
    });

    await log(req, investor.id, 'Investor Created', `Investor ${investor.name} (${investor.investorCode}) registered`);
    res.status(201).json(investor);
  } catch (err) {
    console.error('Create Investor Error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/investors/:id', auth, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    const updateData = { ...req.body };
    if (updateData.profitSharePercent !== undefined) {
      updateData.profitSharePercent = Number(updateData.profitSharePercent) || 0;
    }
    if (updateData.fixedReturnPercent !== undefined) {
      updateData.fixedReturnPercent = Number(updateData.fixedReturnPercent) || 0;
    }

    await investor.update(updateData);
    await log(req, investor.id, 'Investor Updated', 'Investor profile updated');
    res.json(investor);
  } catch (err) {
    console.error('Update Investor Error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/investors/:id', auth, async (req, res) => {
  try {
    const investor = await Investor.findByPk(req.params.id);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    await investor.destroy();
    res.json({ message: 'Investor deleted successfully' });
  } catch (err) {
    console.error('Delete Investor Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 3. INVESTMENTS CRUD
router.get('/investments', auth, async (req, res) => {
  try {
    const where = {};
    if (req.query.investorId) where.investorId = req.query.investorId;
    if (req.query.projectId) where.projectId = req.query.projectId;
    if (req.query.status) where.status = req.query.status;

    const rows = await loadInvestments(where);
    res.json(rows);
  } catch (err) {
    console.error('Error in GET /investments:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/investments/:id', auth, async (req, res) => {
  try {
    const rows = await loadInvestments({ id: req.params.id });
    if (rows.length === 0) return res.status(404).json({ message: 'Investment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error in GET /investments/:id:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/investments', auth, async (req, res) => {
  try {
    const {
      investorId,
      projectId,
      principalAmount,
      investmentDate,
      maturityDate,
      investmentType,
      profitSharePercent,
      expectedRoiPercent,
      expectedProfit,
      notes,
      debitAccountId,
    } = req.body;

    const amt = Number(principalAmount) || 0;
    if (!investorId || amt <= 0) {
      return res
        .status(400)
        .json({ message: 'Valid Investor and Principal Amount (> 0) are required' });
    }

    const investor = await Investor.findByPk(investorId);
    if (!investor) return res.status(404).json({ message: 'Investor not found' });

    // ---- Return type rules ----
    const type = investmentType || 'project_based';
    if (!INVESTMENT_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Choose a valid return type.' });
    }

    const share = Number(profitSharePercent) || 0;
    const roi = Number(expectedRoiPercent) || 0;
    if (share < 0 || share > 100 || roi < 0 || roi > 100) {
      return res.status(400).json({ message: 'Percentages must be between 0 and 100.' });
    }
    if (type === 'fixed_return' && roi <= 0) {
      return res.status(400).json({ message: 'A fixed return investment needs a return percentage.' });
    }
    if (type === 'project_based') {
      if (!projectId) {
        return res.status(400).json({ message: 'Choose the project: profit share is calculated from that project.' });
      }
      if (share <= 0) {
        return res.status(400).json({ message: 'A project profit share investment needs a profit share percentage.' });
      }
    }
    if (type === 'equity' && (share <= 0 || roi <= 0)) {
      return res.status(400).json({ message: 'Equity needs both a profit share and a guaranteed floor percentage.' });
    }

    const invDate = investmentDate || new Date().toISOString().slice(0, 10);
    if (maturityDate && maturityDate < invDate) {
      return res.status(400).json({ message: 'Maturity date cannot be before the investment date.' });
    }

    // Only keep the numbers that belong to the chosen type
    const storedShare = type === 'fixed_return' ? 0 : share;
    const storedRoi = type === 'project_based' ? 0 : roi;

    const investmentCode = await generateInvestmentCode();
    const expProfit = Number(expectedProfit) || (amt * storedRoi) / 100;

    const investment = await Investment.create({
      investmentCode,
      investorId: Number(investorId),
      projectId: projectId ? Number(projectId) : null,
      principalAmount: amt,
      investmentDate: invDate,
      maturityDate: maturityDate ? maturityDate : null,
      investmentType: type,
      profitSharePercent: storedShare,
      expectedRoiPercent: storedRoi,
      expectedProfit: expProfit,
      expectedReturn: amt + expProfit,
      status: 'active',
      notes: notes || null,
      debitAccountId: debitAccountId ? Number(debitAccountId) : null,
    });

    await log(
      req,
      investor.id,
      'Investment Created',
      `Investment ${investmentCode} of ${bdt(amt)} recorded (${TYPE_LABELS[type]})`,
      amt
    );

    res.status(201).json(investment);
  } catch (err) {
    console.error('Create Investment Error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 4. PAYOUTS, RECEIPTS, SPLIT PAYMENTS, INVESTOR BANK ACCOUNTS
router.use(require('./investorPayments'));

// 5. DOCUMENTS / COMMUNICATION / NOTES / ACTIVITY (per investor)
router.use(require('./investorExtras'));

// 4. PAYOUTS, RECEIPTS, SPLIT PAYMENTS, INVESTOR BANK ACCOUNTS
router.use(require('./investorPayments'));
router.use(require('./investorPayments'));
router.use(require('./investorPhoto'));

module.exports = router;