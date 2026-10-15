const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Investor, Investment, InvestorPayment, Project } = require('../models/associations');
const { portalAuth } = require('../middleware/portalAuth');
const { computeInvestmentMetrics } = require('../utils/investorCalculations');

// Ensure token belongs to an investor
router.use(portalAuth, (req, res, next) => {
  if (req.portalUser.role !== 'investor') {
    return res.status(403).json({ message: 'Access denied: investor portal authorization required.' });
  }
  next();
});

const num = (v) => Number(v) || 0;

/* -------------------------------------------------------------------------- */
/*  Date helpers (all UTC, dates are DATEONLY strings)                        */
/* -------------------------------------------------------------------------- */

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const utcToday = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};
const addMonthsUTC = (d, n) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate()));
const toISO = (d) => d.toISOString().split('T')[0];
const dayKey = (v) => String(v || '').slice(0, 10);

/**
 * Loads an investor's investments with their project, payments and metrics
 * using separate queries (no association aliases needed).
 * Pass { withMetrics: false } to skip the (heavier) metrics calculation.
 */
async function loadInvestorInvestments(investorId, extraWhere = {}, { withMetrics = true } = {}) {
  const investments = await Investment.findAll({
    where: { investorId, ...extraWhere },
    order: [['investmentDate', 'DESC'], ['id', 'DESC']],
  });
  if (investments.length === 0) return [];

  const ids = investments.map((i) => i.id);
  const projectIds = [...new Set(investments.map((i) => i.projectId).filter(Boolean))];

  const [payments, projects] = await Promise.all([
    InvestorPayment.findAll({
      where: { investmentId: ids },
      order: [['paymentDate', 'DESC'], ['id', 'DESC']],
    }),
    projectIds.length ? Project.findAll({ where: { id: projectIds } }) : [],
  ]);

  const paymentsByInvestment = {};
  payments.forEach((p) => {
    if (!paymentsByInvestment[p.investmentId]) paymentsByInvestment[p.investmentId] = [];
    paymentsByInvestment[p.investmentId].push(p);
  });

  const projectMap = {};
  projects.forEach((p) => { projectMap[p.id] = p.toJSON(); });

  const rows = [];
  for (const inv of investments) {
    const invPayments = paymentsByInvestment[inv.id] || [];
    const metrics = withMetrics ? await computeInvestmentMetrics(inv, invPayments) : null;
    rows.push({
      inv: inv.toJSON(),
      project: projectMap[inv.projectId] || null,
      payments: invPayments.map((p) => p.toJSON()),
      metrics,
    });
  }
  return rows;
}

/**
 * Amount still owed on one investment: agreed return minus what was paid.
 */
function dueFor(inv, metrics) {
  if (inv.status === 'cancelled') return 0;
  return Math.max(0, num(metrics.expectedReturn) - num(metrics.totalPaid));
}

/**
 * Investor-safe shape of one investment (no internal admin fields).
 */
function cleanInvestment({ inv, project, metrics }) {
  return {
    id: inv.id,
    projectName: project?.name || 'Unassigned Project',
    projectStatus: project?.status || 'active',
    amount: num(inv.principalAmount),
    investmentDate: inv.investmentDate,
    maturityDate: inv.maturityDate,
    investmentType: inv.investmentType,
    expectedRoiPercentage: inv.expectedRoiPercent ? num(inv.expectedRoiPercent) : null,
    profitSharePercentage: inv.profitSharePercent ? num(inv.profitSharePercent) : null,
    expectedReturnAmount: num(inv.expectedReturn),
    expectedProfit: num(inv.expectedProfit),
    agreementRef: inv.investmentCode || `AGR-${inv.id}`,
    status: inv.status,
    totalPaidOut: metrics.totalPaid,
    paidAmount: metrics.totalPaid,
    dueAmount: dueFor(inv, metrics),
    profitGenerated: metrics.profitGenerated,
  };
}

// GET /api/portal/investor/summary
router.get('/summary', async (req, res) => {
  try {
    const investorId = req.portalUser.id;

    const investor = await Investor.findByPk(investorId);
    if (!investor) return res.status(404).json({ message: 'Investor profile not found.' });

    const rows = await loadInvestorInvestments(investorId);

    let totalInvested = 0;
    let profitEarned = 0;
    let payoutsReceived = 0;
    let stillToReceive = 0;
    let outstandingPrincipal = 0;
    let activeInvestmentsCount = 0;
    let pendingAmount = 0;
    let currentValue = 0;
    let expectedTotalReturn = 0;

    const activeProjectNames = new Set();
    const scheduleMap = {};
    let nextDue = null;

    rows.forEach(({ inv, project, metrics }) => {
      totalInvested += metrics.principal;
      profitEarned += metrics.profitGenerated;
      payoutsReceived += metrics.totalPaid;
      stillToReceive += metrics.totalOutstanding;
      outstandingPrincipal += metrics.remainingPrincipal;

      const projectName = project?.name || 'General Business';

      if (inv.status === 'active') {
        activeInvestmentsCount += 1;
        activeProjectNames.add(projectName);
      }

      // Payment schedule, grouped per project (cancelled investments are skipped)
      if (inv.status === 'cancelled') return;

      currentValue += num(metrics.currentInvestmentValue);
      expectedTotalReturn += num(metrics.expectedReturn);

      const total = num(metrics.expectedReturn);
      const paid = num(metrics.totalPaid);
      const due = dueFor(inv, metrics);
      pendingAmount += due;

      if (!scheduleMap[projectName]) {
        scheduleMap[projectName] = {
          project: projectName,
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          nextDueDate: null,
        };
      }
      const row = scheduleMap[projectName];
      row.totalAmount += total;
      row.paidAmount += paid;
      row.dueAmount += due;

      if (due > 0 && inv.maturityDate) {
        if (!row.nextDueDate || inv.maturityDate < row.nextDueDate) {
          row.nextDueDate = inv.maturityDate;
        }
        if (!nextDue || inv.maturityDate < nextDue.dueDate) {
          const daysLeft = Math.ceil(
            (new Date(inv.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ) || 0;
          nextDue = {
            investmentId: inv.id,
            projectName,
            dueDate: inv.maturityDate,
            daysLeft,
            dueAmount: due,
            overdue: daysLeft < 0,
          };
        }
      }
    });

    const paymentSchedule = Object.values(scheduleMap);
    const pendingProjectsCount = paymentSchedule.filter((r) => r.dueAmount > 0).length;

    const roiPercentage = totalInvested > 0
      ? Number(((profitEarned / totalInvested) * 100).toFixed(2))
      : 0;

    res.json({
      investorName: investor.name,
      lastLogin: investor.portalLastLogin,
      totalInvested,
      currentValue,
      expectedTotalReturn,
      profitEarned,
      payoutsReceived,
      stillToReceive,
      outstandingPrincipal,
      roiPercentage,
      activeInvestmentsCount,
      totalInvestmentsCount: rows.length,
      activeProjectsCount: activeProjectNames.size,
      lastInvestmentDate: rows.length ? rows[0].inv.investmentDate : null,
      pendingAmount,
      pendingProjectsCount,
      nextDue,
      paymentSchedule,
      recentInvestments: rows.slice(0, 5).map(cleanInvestment),
    });
  } catch (error) {
    console.error('Investor Portal Summary Error:', error);
    res.status(500).json({ message: 'Failed to load portfolio summary.' });
  }
});

// GET /api/portal/investor/allocation
router.get('/allocation', async (req, res) => {
  try {
    const investorId = req.portalUser.id;

    const rows = await loadInvestorInvestments(investorId, {}, { withMetrics: false });

    const totalInvested = rows.reduce((sum, r) => sum + num(r.inv.principalAmount), 0);
    const projectMap = {};

    rows.forEach(({ inv, project }) => {
      const projName = project?.name || 'General Real Estate';
      const amt = num(inv.principalAmount);
      if (!projectMap[projName]) {
        projectMap[projName] = { project: projName, amount: 0, count: 0 };
      }
      projectMap[projName].amount += amt;
      projectMap[projName].count += 1;
    });

    const allocation = Object.values(projectMap).map((item) => ({
      project: item.project,
      amount: item.amount,
      count: item.count,
      percentage: totalInvested > 0 ? Number(((item.amount / totalInvested) * 100).toFixed(1)) : 0,
    }));

    res.json({ totalInvested, allocation });
  } catch (error) {
    console.error('Investor Portal Allocation Error:', error);
    res.status(500).json({ message: 'Failed to load capital allocation.' });
  }
});

// GET /api/portal/investor/investments
router.get('/investments', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const { status, project_id, projectId } = req.query;

    const where = {};
    if (status && status !== 'all') where.status = status;
    const pid = project_id || projectId;
    if (pid && pid !== 'all') where.projectId = pid;

    const rows = await loadInvestorInvestments(investorId, where);

    res.json(rows.map(cleanInvestment));
  } catch (error) {
    console.error('Investor Portal Investments Error:', error);
    res.status(500).json({ message: 'Failed to load investments list.' });
  }
});

// GET /api/portal/investor/investments/:id
router.get('/investments/:id', async (req, res) => {
  try {
    const investorId = req.portalUser.id;

    const rows = await loadInvestorInvestments(investorId, { id: req.params.id });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Investment agreement not found.' });
    }

    const { inv, project, payments, metrics } = rows[0];

    const payouts = payments.map((p) => ({
      id: p.id,
      amount: num(p.amount),
      principalPaid: num(p.principalPaid),
      profitPaid: num(p.profitPaid),
      paymentDate: p.paymentDate,
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      referenceNo: p.referenceNo || p.paymentCode,
      status: p.status || 'completed',
    }));

    res.json({
      id: inv.id,
      projectName: project?.name || 'Unassigned Project',
      projectDescription: project?.description || '',
      amount: num(inv.principalAmount),
      investmentDate: inv.investmentDate,
      maturityDate: inv.maturityDate,
      investmentType: inv.investmentType,
      expectedRoiPercentage: inv.expectedRoiPercent ? num(inv.expectedRoiPercent) : null,
      profitSharePercentage: inv.profitSharePercent ? num(inv.profitSharePercent) : null,
      expectedReturnAmount: num(inv.expectedReturn),
      expectedProfit: num(inv.expectedProfit),
      agreementRef: inv.investmentCode || `AGR-${inv.id}`,
      status: inv.status,
      totalPaidOut: metrics.totalPaid,
      dueAmount: dueFor(inv, metrics),
      payouts,
      // Expected vs actual
      metrics: {
        principal: metrics.principal,
        profitGenerated: metrics.profitGenerated,
        expectedProfit: metrics.expectedProfit,
        expectedReturn: metrics.expectedReturn,
        principalPaid: metrics.principalPaid,
        profitPaid: metrics.profitPaid,
        totalPaid: metrics.totalPaid,
        remainingPrincipal: metrics.remainingPrincipal,
        remainingProfit: metrics.remainingProfit,
        totalOutstanding: metrics.totalOutstanding,
        roiPercent: metrics.roiPercent,
      },
    });
  } catch (error) {
    console.error('Investor Portal Investment Detail Error:', error);
    res.status(500).json({ message: 'Failed to load investment details.' });
  }
});

/* -------------------------------------------------------------------------- */
/*  HISTORY — one timeline of investments, payouts and maturities             */
/* -------------------------------------------------------------------------- */

const PAYMENT_TITLES = {
  profit_distribution: 'Profit payout',
  principal_return: 'Capital returned',
  combined: 'Capital + profit paid',
};

// GET /api/portal/investor/history?type=&investmentId=&from=&to=&limit=
router.get('/history', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const { type, investmentId, from, to } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 1000);

    const rows = await loadInvestorInvestments(investorId, {}, { withMetrics: false });
    const today = toISO(utcToday());

    let events = [];
    rows.forEach(({ inv, project, payments }) => {
      const projectName = project?.name || 'Unassigned Project';
      const agreementRef = inv.investmentCode || `AGR-${inv.id}`;

      events.push({
        key: `inv-${inv.id}`,
        type: 'investment',
        date: dayKey(inv.investmentDate),
        title: 'Investment made',
        projectName,
        agreementRef,
        investmentId: inv.id,
        investmentType: inv.investmentType,
        amount: num(inv.principalAmount),
        status: inv.status,
      });

      payments.forEach((p) => {
        events.push({
          key: `pay-${p.id}`,
          type: 'payment',
          date: dayKey(p.paymentDate),
          title: PAYMENT_TITLES[p.paymentType] || 'Payout',
          projectName,
          agreementRef,
          investmentId: inv.id,
          amount: num(p.amount),
          principalPaid: num(p.principalPaid),
          profitPaid: num(p.profitPaid),
          method: p.paymentMethod,
          referenceNo: p.referenceNo || p.paymentCode || `REC-${p.id}`,
          status: p.status || 'completed',
        });
      });

      if (inv.maturityDate && inv.status !== 'cancelled') {
        const date = dayKey(inv.maturityDate);
        const upcoming = date > today;
        events.push({
          key: `mat-${inv.id}`,
          type: 'maturity',
          date,
          title: upcoming ? 'Maturity date' : 'Agreement matured',
          projectName,
          agreementRef,
          investmentId: inv.id,
          amount: num(inv.expectedReturn) || num(inv.principalAmount),
          upcoming,
          status: inv.status,
        });
      }
    });

    if (type && type !== 'all') events = events.filter((e) => e.type === type);
    if (investmentId && investmentId !== 'all') {
      events = events.filter((e) => String(e.investmentId) === String(investmentId));
    }
    if (from) events = events.filter((e) => e.date >= from);
    if (to) events = events.filter((e) => e.date <= to);

    const order = { maturity: 0, payment: 1, investment: 2 };
    events.sort((a, b) => (a.date === b.date ? order[a.type] - order[b.type] : a.date < b.date ? 1 : -1));

    const summary = {
      totalInvested: events.filter((e) => e.type === 'investment').reduce((s, e) => s + e.amount, 0),
      totalReceived: events
        .filter((e) => e.type === 'payment' && e.status !== 'pending')
        .reduce((s, e) => s + e.amount, 0),
      eventsCount: events.length,
    };

    res.json({
      summary,
      events: events.slice(0, limit),
      investments: rows.map(({ inv, project }) => ({
        id: inv.id,
        label: `${project?.name || 'Unassigned Project'} · ${inv.investmentCode || `AGR-${inv.id}`}`,
      })),
    });
  } catch (error) {
    console.error('Investor Portal History Error:', error);
    res.status(500).json({ message: 'Failed to load investment history.' });
  }
});

/* -------------------------------------------------------------------------- */
/*  COMPARE — invested vs. what you will get over a time period               */
/* -------------------------------------------------------------------------- */

const MONTHS_PER_PERIOD = { '6m': 6, '1y': 12, '3y': 36 };
const HORIZON_LABELS = { '6m': 'In 6 months', '1y': 'In 1 year', '3y': 'In 3 years', full: 'At maturity' };

// Term of an investment. No maturity date => assume a 12-month term.
function termOf(inv) {
  const start = parseDate(inv.investmentDate) || utcToday();
  let end = parseDate(inv.maturityDate);
  if (!end || end <= start) end = addMonthsUTC(start, 12);
  return { start, end };
}

function progressAt(term, at) {
  if (at <= term.start) return 0;
  if (at >= term.end) return 1;
  return (at.getTime() - term.start.getTime()) / (term.end.getTime() - term.start.getTime());
}

// Profit we expect over the full term. Project-based deals with no agreed
// profit fall back to the profit the project has generated so far (an estimate).
function projectedProfit(inv, metrics) {
  const agreed = num(inv.expectedProfit);
  if (agreed > 0 || inv.investmentType === 'fixed_return') {
    return { profit: agreed, estimated: false };
  }
  return { profit: num(metrics?.profitGenerated), estimated: true };
}

// GET /api/portal/investor/compare?period=6m|1y|3y|full
router.get('/compare', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const period = ['6m', '1y', '3y', 'full'].includes(req.query.period) ? req.query.period : '1y';

    const rows = (await loadInvestorInvestments(investorId)).filter((r) => r.inv.status !== 'cancelled');
    const today = utcToday();

    if (rows.length === 0) {
      return res.json({
        period, asOf: toISO(today), horizonDate: toISO(today),
        summary: {
          invested: 0, receivedToDate: 0, expectedValueAtHorizon: 0,
          expectedProfitAtHorizon: 0, expectedReturnAtMaturity: 0, anyEstimated: false,
        },
        horizons: [], items: [], series: [],
      });
    }

    const items = rows.map(({ inv, project, payments, metrics }) => {
      const { profit, estimated } = projectedProfit(inv, metrics);
      return {
        inv,
        project,
        payments: payments.filter((p) => p.status !== 'pending'),
        term: termOf(inv),
        principal: num(inv.principalAmount),
        profit,
        estimated,
        received: payments
          .filter((p) => p.status !== 'pending')
          .reduce((s, p) => s + num(p.amount), 0),
      };
    });

    const valueAt = (it, at) => (at < it.term.start ? 0 : it.principal + it.profit * progressAt(it.term, at));
    const startedBy = (it, at) => it.term.start <= at;

    // Furthest maturity (at least today)
    let fullHorizon = items.reduce((m, it) => (it.term.end > m ? it.term.end : m), today);
    if (fullHorizon < today) fullHorizon = today;

    const horizonDateFor = (key) =>
      key === 'full' ? fullHorizon : addMonthsUTC(today, MONTHS_PER_PERIOD[key]);

    const totalsAt = (at) => {
      let value = 0;
      let invested = 0;
      items.forEach((it) => {
        if (startedBy(it, at)) {
          invested += it.principal;
          value += valueAt(it, at);
        }
      });
      return { invested, value, profit: value - invested };
    };

    const horizons = ['6m', '1y', '3y', 'full'].map((key) => {
      const date = horizonDateFor(key);
      const t = totalsAt(date);
      return {
        key,
        label: HORIZON_LABELS[key],
        date: toISO(date),
        expectedValue: t.value,
        expectedProfit: t.profit,
      };
    });

    const horizon = horizonDateFor(period);
    const atHorizon = totalsAt(horizon);

    // Chart series (monthly points, from up to 12 months back to the horizon)
    const firstStart = items.reduce((m, it) => (it.term.start < m ? it.term.start : m), items[0].term.start);
    const windowFloor = addMonthsUTC(today, -12);
    const base = firstStart > windowFloor ? firstStart : windowFloor;
    let cursor = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));

    let dates = [];
    while (cursor <= horizon) {
      dates.push(cursor);
      cursor = addMonthsUTC(cursor, 1);
    }
    if (!dates.some((d) => toISO(d) === toISO(today)) && today >= dates[0] && today <= horizon) dates.push(today);
    if (!dates.some((d) => toISO(d) === toISO(horizon))) dates.push(horizon);
    dates.sort((a, b) => a - b);
    if (dates.length > 48) {
      const step = Math.ceil(dates.length / 48);
      dates = dates.filter((d, i) => i % step === 0 || i === dates.length - 1 || toISO(d) === toISO(today));
    }

    const series = dates.map((d) => {
      const t = totalsAt(d);
      let received = null;
      if (d <= today) {
        received = 0;
        items.forEach((it) => {
          it.payments.forEach((p) => {
            const pd = parseDate(p.paymentDate);
            if (pd && pd <= d) received += num(p.amount);
          });
        });
      }
      return { date: toISO(d), invested: t.invested, expectedValue: t.value, received };
    });

    const outItems = items
      .map((it) => {
        const value = valueAt(it, horizon);
        const started = startedBy(it, horizon);
        const expectedReturn = it.principal + it.profit;
        return {
          id: it.inv.id,
          projectName: it.project?.name || 'Unassigned Project',
          agreementRef: it.inv.investmentCode || `AGR-${it.inv.id}`,
          investmentType: it.inv.investmentType,
          expectedRoiPercentage: it.inv.expectedRoiPercent ? num(it.inv.expectedRoiPercent) : null,
          profitSharePercentage: it.inv.profitSharePercent ? num(it.inv.profitSharePercent) : null,
          status: it.inv.status,
          investmentDate: it.inv.investmentDate,
          maturityDate: it.inv.maturityDate,
          maturityAssumed: !it.inv.maturityDate,
          termMonths: Math.max(1, Math.round((it.term.end - it.term.start) / (1000 * 60 * 60 * 24 * 30.4375))),
          estimated: it.estimated,
          principal: it.principal,
          expectedProfit: it.profit,
          expectedReturn,
          received: it.received,
          remaining: Math.max(0, expectedReturn - it.received),
          valueAtHorizon: started ? value : 0,
          profitAtHorizon: started ? value - it.principal : 0,
        };
      })
      .sort((a, b) => (a.investmentDate < b.investmentDate ? 1 : -1));

    res.json({
      period,
      asOf: toISO(today),
      horizonDate: toISO(horizon),
      summary: {
        invested: atHorizon.invested,
        receivedToDate: items.reduce((s, it) => s + it.received, 0),
        expectedValueAtHorizon: atHorizon.value,
        expectedProfitAtHorizon: atHorizon.profit,
        expectedReturnAtMaturity: items.reduce((s, it) => s + it.principal + it.profit, 0),
        anyEstimated: items.some((it) => it.estimated),
      },
      horizons,
      items: outItems,
      series,
    });
  } catch (error) {
    console.error('Investor Portal Compare Error:', error);
    res.status(500).json({ message: 'Failed to load comparison.' });
  }
});

// GET /api/portal/investor/payments
router.get('/payments', async (req, res) => {
  try {
    const investorId = req.portalUser.id;

    const payments = await InvestorPayment.findAll({
      where: { investorId },
      order: [['paymentDate', 'DESC'], ['id', 'DESC']],
    });

    const investmentIds = [...new Set(payments.map((p) => p.investmentId).filter(Boolean))];
    const investments = investmentIds.length
      ? await Investment.findAll({ where: { id: investmentIds } })
      : [];

    const projectIds = [...new Set(investments.map((i) => i.projectId).filter(Boolean))];
    const projects = projectIds.length ? await Project.findAll({ where: { id: projectIds } }) : [];

    const investmentMap = {};
    investments.forEach((i) => { investmentMap[i.id] = i.toJSON(); });
    const projectMap = {};
    projects.forEach((p) => { projectMap[p.id] = p.toJSON(); });

    const cleanPayments = payments.map((p) => {
      const inv = investmentMap[p.investmentId];
      const project = inv ? projectMap[inv.projectId] : null;
      return {
        id: p.id,
        amount: num(p.amount),
        principalPaid: num(p.principalPaid),
        profitPaid: num(p.profitPaid),
        paymentDate: p.paymentDate,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        referenceNo: p.referenceNo || p.paymentCode || `REC-${p.id}`,
        projectName: project?.name || 'Real Estate Venture',
        agreementRef: inv ? (inv.investmentCode || `AGR-${inv.id}`) : null,
        status: p.status || 'completed',
      };
    });

    const totalAmount = cleanPayments.reduce((acc, cur) => acc + cur.amount, 0);

    res.json({ totalAmount, payments: cleanPayments });
  } catch (error) {
    console.error('Investor Portal Payments Error:', error);
    res.status(500).json({ message: 'Failed to load payouts history.' });
  }
});

// GET /api/portal/investor/schedule
router.get('/schedule', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const today = new Date().toISOString().split('T')[0];

    const upcoming = await Investment.findAll({
      where: {
        investorId,
        status: 'active',
        maturityDate: { [Op.gte]: today },
      },
      order: [['maturityDate', 'ASC']],
    });

    const projectIds = [...new Set(upcoming.map((i) => i.projectId).filter(Boolean))];
    const projects = projectIds.length ? await Project.findAll({ where: { id: projectIds } }) : [];
    const projectMap = {};
    projects.forEach((p) => { projectMap[p.id] = p.toJSON(); });

    const schedule = upcoming.map((inv) => {
      const maturity = new Date(inv.maturityDate);
      const diffTime = maturity.getTime() - Date.now();
      const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      return {
        id: inv.id,
        milestoneType: 'Agreement Maturity & Return',
        projectName: projectMap[inv.projectId]?.name || 'Investment Project',
        dueDate: inv.maturityDate,
        daysLeft,
        expectedReturn: num(inv.expectedReturn) || num(inv.principalAmount),
        status: 'scheduled',
      };
    });

    res.json(schedule);
  } catch (error) {
    console.error('Investor Portal Schedule Error:', error);
    res.status(500).json({ message: 'Failed to load upcoming schedule.' });
  }
});

// GET /api/portal/investor/profile
router.get('/profile', async (req, res) => {
  try {
    const investorId = req.portalUser.id;

    const investor = await Investor.findByPk(investorId);
    if (!investor) return res.status(404).json({ message: 'Profile not found.' });

    // Mask sensitive identifiers (last 4 chars visible)
    const maskStr = (str) => {
      if (!str) return '';
      if (str.length <= 4) return '••••';
      return '•••••••• ' + str.slice(-4);
    };

    res.json({
      id: investor.id,
      investorIdCode: investor.investorCode || `INV-${String(investor.id).padStart(4, '0')}`,
      name: investor.name,
      phone: investor.phone,
      email: investor.email,
      address: investor.address,
      maskedNid: maskStr(investor.nidPassport),
      nomineeName: investor.nomineeName,
      nomineeRelation: investor.nomineeRelation,
      nomineePhone: investor.nomineePhone,
      maskedNomineeNid: maskStr(investor.nomineeNid),
      memberSinceYear: investor.createdAt ? new Date(investor.createdAt).getFullYear() : new Date().getFullYear(),
      portalUsername: investor.portalUsername,
      portalLastLogin: investor.portalLastLogin,
      status: investor.status,
    });
  } catch (error) {
    console.error('Investor Portal Profile Error:', error);
    res.status(500).json({ message: 'Failed to load investor profile.' });
  }
});

// POST /api/portal/investor/change-password
router.post('/change-password', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const investor = await Investor.findByPk(investorId);
    if (!investor || !investor.portalPassword) {
      return res.status(404).json({ message: 'Investor account error.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, investor.portalPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    investor.portalPassword = await bcrypt.hash(newPassword, 10);
    await investor.save({ fields: ['portalPassword'], validate: false });

    res.json({ message: 'Your password has been securely updated.' });
  } catch (error) {
    console.error('Investor Change Password Error:', error);
    res.status(500).json({ message: 'Failed to update password.' });
  }
});
// Inbox: messages, documents, shared notes, activity
router.use(require('./portalInvestorExtras'));

module.exports = router;