// server/utils/payroll.js
const { Op } = require('sequelize');
const { Employee, EmployeeAdvance, PaySlip, SalaryDeduction } = require('../models/associations');
const StandingDeduction = require('../models/StandingDeduction');

function grossOf(emp) {
  return (
    (Number(emp.basicSalary) || 0) +
    (Number(emp.houseRent) || 0) +
    (Number(emp.medicalAllowance) || 0) +
    (Number(emp.otherAllowance) || 0)
  );
}

function periodKey(year, month) {
  return Number(year) * 12 + Number(month);
}

async function computeAdvanceDeduction(employeeId, year, month) {
  const advances = await EmployeeAdvance.findAll({
    where: { employeeId, status: 'Disbursed' },
    order: [['disbursementDate', 'ASC']],
  });
  const breakdown = [];
  let total = 0;
  const currentKey = year && month ? periodKey(year, month) : null;

  for (const adv of advances) {
    if (currentKey !== null && adv.targetYear && adv.targetMonth) {
      if (periodKey(adv.targetYear, adv.targetMonth) > currentKey) continue;
    }

    const remaining = Number(adv.amount) - Number(adv.paidAmount || 0);
    if (remaining <= 0) continue;
    const deduct = Math.min(Number(adv.monthlyDeduction) || remaining, remaining);
    if (deduct <= 0) continue;
    breakdown.push({ advanceId: adv.id, type: adv.type, deduct });
    total += deduct;
  }
  return { total, breakdown };
}

// Recurring deductions/additions that apply every month until deactivated
// (e.g. a ৳1000 Food Allowance deducted from every active employee).
// scoped to 'All' employees or one specific employeeId, with an optional
// start/end period window.
async function computeStandingAdjustments(employeeId, year, month) {
  if (!year || !month) return { deductionTotal: 0, additionTotal: 0, rows: [] };
  const currentKey = periodKey(year, month);

  const rows = await StandingDeduction.findAll({
    where: {
      active: true,
      [Op.or]: [{ appliesTo: 'All' }, { appliesTo: 'Employee', employeeId }],
    },
  });

  let deductionTotal = 0;
  let additionTotal = 0;
  const applied = [];

  rows.forEach((r) => {
    if (r.startYear && r.startMonth && periodKey(r.startYear, r.startMonth) > currentKey) return;
    if (r.endYear && r.endMonth && periodKey(r.endYear, r.endMonth) < currentKey) return;

    const amt = Number(r.amount) || 0;
    if (r.type === 'Addition') additionTotal += amt;
    else deductionTotal += amt;
    applied.push({ standingDeductionId: r.id, title: r.title, amount: amt, type: r.type });
  });

  return { deductionTotal, additionTotal, rows: applied };
}

// One-off deductions/additions (SalaryDeduction, status Pending) plus
// standing recurring ones, merged into single totals. deductionRows /
// additionRows are the one-off Sequelize rows (these get marked Applied
// when a slip is paid); standingRows is a snapshot array for display only
// — standing items never get "Applied", they just recur every period.
async function computeAdjustments(employeeId, year, month) {
  const rows = await SalaryDeduction.findAll({
    where: { employeeId, year, month, status: 'Pending' },
    order: [['createdAt', 'ASC']],
  });
  let deductionTotal = 0;
  let additionTotal = 0;
  const deductionRows = [];
  const additionRows = [];
  rows.forEach((r) => {
    if (r.type === 'Addition') {
      additionTotal += Number(r.amount);
      additionRows.push(r);
    } else {
      deductionTotal += Number(r.amount);
      deductionRows.push(r);
    }
  });

  const standing = await computeStandingAdjustments(employeeId, year, month);
  deductionTotal += standing.deductionTotal;
  additionTotal += standing.additionTotal;

  return { deductionTotal, additionTotal, deductionRows, additionRows, standingRows: standing.rows, rows };
}

async function buildSlipData(emp, year, month) {
  const gross = grossOf(emp);
  const { total: advanceDeduction, breakdown } = await computeAdvanceDeduction(emp.id, year, month);
  const { deductionTotal, additionTotal, standingRows } = await computeAdjustments(emp.id, year, month);
  const totalDeduction = advanceDeduction + deductionTotal;
  const netSalary = gross - totalDeduction + additionTotal;

  return {
    employeeId: emp.id, year, month,
    basicSalary: emp.basicSalary, houseRent: emp.houseRent,
    medicalAllowance: emp.medicalAllowance, otherAllowance: emp.otherAllowance,
    grossSalary: gross,
    advanceDeduction, otherDeduction: deductionTotal, otherAddition: additionTotal,
    totalDeduction, netSalary,
    advanceBreakdown: JSON.stringify(breakdown),
    standingBreakdown: JSON.stringify(standingRows),
  };
}

async function syncDraftPaySlip(employeeId, year, month, actorName) {
  const existing = await PaySlip.findOne({ where: { employeeId, year, month } });
  if (!existing || existing.status === 'Paid') return existing || null;

  const emp = await Employee.findByPk(employeeId);
  if (!emp) return null;

  const data = await buildSlipData(emp, year, month);
  Object.assign(existing, data);
  if (actorName) existing.generatedBy = actorName;
  await existing.save();
  return existing;
}

module.exports = {
  grossOf, computeAdvanceDeduction, computeAdjustments, computeStandingAdjustments,
  buildSlipData, syncDraftPaySlip, periodKey,
};