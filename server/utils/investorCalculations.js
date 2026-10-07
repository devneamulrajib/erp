// server/utils/investorCalculations.js
const {
  Sale,
  Expense,
  Purchase,
  ContractorBill,
  LabourBill,
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
 * Calculates Project Financials (Revenue, Expenses, Net Profit)
 * Reuses existing project-linked tables to prevent double counting.
 */
async function getProjectFinancials(projectId) {
  if (!projectId) {
    return { revenue: 0, expenses: 0, netProfit: 0 };
  }

  const where = { projectId };

  // 1. Total Project Revenue
  const totalSales = await safeSum('Sale', Sale, 'totalAmount', where);

  // 2. Total Project Expenses (operational, materials, contractor and labour costs)
  const generalExpenses = await safeSum('Expense', Expense, 'amount', where);
  const purchases = await safeSum('Purchase', Purchase, 'grandTotal', where);
  const contractorBills = await safeSum('ContractorBill', ContractorBill, 'netPayable', where);
  const labourBills = await safeSum('LabourBill', LabourBill, 'netPayable', where);

  const totalExpenses = generalExpenses + purchases + contractorBills + labourBills;
  const netProfit = Math.max(0, totalSales - totalExpenses);

  return {
    revenue: totalSales,
    expenses: totalExpenses,
    netProfit,
  };
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