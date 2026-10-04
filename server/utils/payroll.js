// server/utils/payroll.js
const { Op } = require('sequelize');
const { Employee, EmployeeAdvance, PaySlip, SalaryDeduction } = require('../models/associations');

function grossOf(emp) {
  return (
    (Number(emp.basicSalary) || 0) +
    (Number(emp.houseRent) || 0) +
    (Number(emp.medicalAllowance) || 0) +
    (Number(emp.otherAllowance) || 0)
  );
}

// Sum of what's still owed across this employee's active advances/loans,
// capped per-advance at its own monthlyDeduction. FIFO by disbursement date.
async function computeAdvanceDeduction(employeeId) {
  const advances = await EmployeeAdvance.findAll({
    where: { employeeId, status: 'Disbursed' },
    order: [['disbursementDate', 'ASC']],
  });
  const breakdown = [];
  let total = 0;
  for (const adv of advances) {
    const remaining = Number(adv.amount) - Number(adv.paidAmount || 0);
    if (remaining <= 0) continue;
    const deduct = Math.min(Number(adv.monthlyDeduction) || remaining, remaining);
    if (deduct <= 0) continue;
    breakdown.push({ advanceId: adv.id, type: adv.type, deduct });
    total += deduct;
  }
  return { total, breakdown };
}

// One-off deductions and additions (bonus) still pending for this period.
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
  return { deductionTotal, additionTotal, deductionRows, additionRows, rows };
}

// Full computed payslip fields for one employee for one period, fresh — does not save anything.
async function buildSlipData(emp, year, month) {
  const gross = grossOf(emp);
  const { total: advanceDeduction, breakdown } = await computeAdvanceDeduction(emp.id);
  const { deductionTotal, additionTotal } = await computeAdjustments(emp.id, year, month);
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
  };
}

// If a Draft payslip already exists for this employee/period, recompute and
// save it so it reflects the latest advances/deductions/bonuses. A Paid
// slip is never touched here — only the explicit Pay action finalizes one.
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
  grossOf, computeAdvanceDeduction, computeAdjustments, buildSlipData, syncDraftPaySlip,
};