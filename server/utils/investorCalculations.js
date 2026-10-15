// server/utils/investorCalculations.js
const { Op } = require('sequelize');
const {
  Sale,
  Expense,
  Purchase,
  ContractorBill,
  LabourBill,
  Project,
} = require('../models/associations');

/**
 * Sums one column for a project. If the model or column doesn't exist
 * (wrong field name), it logs a warning that names the problem and counts as 0,
 * instead of crashing the whole dashboard request.
 */
async function safeSum(label, model, field, where) {
  try {
    if (!model) throw new Error('model is not exported from associations.js');
    return Number(await model.sum(field, { where })) || 0;
  } catch (err) {
    console.warn(`[investorCalculations] ${label}.${field} skipped: ${err.message}`);
    return 0;
  }
}

/**
 * Short-lived cache so a request that handles several investments in the
 * same project (summary, compare, ...) calculates that project only once.
 * Stores the promise, so parallel callers share the same in-flight query.
 */
const CACHE_TTL_MS = 30 * 1000;
const financialsCache = new Map(); // projectId -> { at, promise }

async function computeProjectFinancials(projectId) {
  // Expense stores the project as free text (name), not an ID, so look the
  // name up and match on either the name or the ID-as-string.
  let projectName = null;
  try {
    const project = await Project.findByPk(projectId);
    projectName = project?.name || null;
  } catch (err) {
    console.warn(`[investorCalculations] Project lookup skipped: ${err.message}`);
  }
  const expenseKeys = [projectName, String(projectId)].filter(Boolean);

  const byProjectId = { projectId };

  const [totalSales, generalExpenses, purchases, contractorBills, labourBills] = await Promise.all([
    // Revenue
    safeSum('Sale', Sale, 'grandTotal', byProjectId),
    // Costs
    safeSum('Expense', Expense, 'amount', { project: { [Op.in]: expenseKeys } }),
    safeSum('Purchase', Purchase, 'grandTotal', byProjectId),
    safeSum('ContractorBill', ContractorBill, 'grandTotal', byProjectId),
    safeSum('LabourBill', LabourBill, 'grandTotal', byProjectId),
  ]);

  const totalExpenses = generalExpenses + purchases + contractorBills + labourBills;
  const netProfit = Math.max(0, totalSales - totalExpenses);

  return {
    revenue: totalSales,
    expenses: totalExpenses,
    netProfit,
  };
}

/**
 * Calculates Project Financials (Revenue, Expenses, Net Profit)
 * Reuses existing project-linked tables to prevent double counting.
 */
async function getProjectFinancials(projectId) {
  if (!projectId) {
    return { revenue: 0, expenses: 0, netProfit: 0 };
  }

  const cached = financialsCache.get(projectId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = computeProjectFinancials(projectId);
  financialsCache.set(projectId, { at: Date.now(), promise });
  promise.catch(() => financialsCache.delete(projectId));
  return promise;
}

/**
 * Calculates complete ROI and balance breakdown for an individual investment
 */
async function computeInvestmentMetrics(investment, paymentsList = null) {
  const principal = Number(investment.principalAmount) || 0;

  let payments = paymentsList;
  if (!payments) {
    payments =
      typeof investment.getPayments === 'function' ? await investment.getPayments() : [];
  }

  // 1. Payments already made to the investor
  const principalPaid = payments.reduce((acc, p) => acc + (Number(p.principalPaid) || 0), 0);
  const profitPaid = payments.reduce((acc, p) => acc + (Number(p.profitPaid) || 0), 0);
  const totalPaid = principalPaid + profitPaid;

  // 2. Project performance
  const financials = await getProjectFinancials(investment.projectId);

  // 3. Investor Profit Calculation
  let profitGenerated = 0;
  const profitSharePct = Number(investment.profitSharePercent) || 0;
  const expectedRoiPct = Number(investment.expectedRoiPercent) || 0;

  if (investment.investmentType === 'project_based') {
    profitGenerated = (financials.netProfit * profitSharePct) / 100;
  } else if (investment.investmentType === 'fixed_return') {
    // Calculated based on flat expected ROI
    profitGenerated = (principal * expectedRoiPct) / 100;
  } else {
    // Equity / hybrid: flat guarantee or profit share, whichever is higher
    const dynamicShare = (financials.netProfit * profitSharePct) / 100;
    const fixedFloor = (principal * expectedRoiPct) / 100;
    profitGenerated = Math.max(dynamicShare, fixedFloor);
  }

  const remainingPrincipal = Math.max(0, principal - principalPaid);
  const remainingProfit = Math.max(0, profitGenerated - profitPaid);
  const currentInvestmentValue = remainingPrincipal + remainingProfit;
  const expectedProfit = Number(investment.expectedProfit) || (principal * expectedRoiPct) / 100;
  const expectedReturn = principal + expectedProfit;

  const actualRoi = principal > 0 ? ((profitGenerated / principal) * 100).toFixed(2) : '0.00';

  return {
    principal,
    projectRevenue: financials.revenue,
    projectExpenses: financials.expenses,
    projectNetProfit: financials.netProfit,
    profitSharePercent: profitSharePct,
    profitGenerated,
    principalPaid,
    profitPaid,
    totalPaid,
    remainingPrincipal,
    remainingProfit,
    totalOutstanding: remainingPrincipal + remainingProfit,
    currentInvestmentValue,
    expectedProfit,
    expectedReturn,
    roiPercent: Number(actualRoi),
  };
}

module.exports = {
  getProjectFinancials,
  computeInvestmentMetrics,
};