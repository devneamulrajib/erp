// server/migrate-monthly-budget-status.js
// Run once: node migrate-monthly-budget-status.js
//
// Fixes: {"message":"Unknown column 'status' in 'SELECT'"} on
// GET /api/monthly-budget/summary
//
// Cause: the MonthlyBudget Sequelize MODEL has approval-workflow columns
// (status, requestedAmount, requestedBy, rejectedBy, rejectedAt,
// rejectionReason, approvedBy, approvedAt) that the production DATABASE
// table was never altered to include — the model and the live schema
// drifted apart.
//
// `sync({ alter: true })` scoped to just this one model compares the
// model definition against the live table and ALTERs it to match —
// adding missing columns — without dropping the table or touching
// existing rows. Safe to run multiple times.
const sequelize = require('./config/db');
const MonthlyBudget = require('./models/MonthlyBudget');

async function run() {
  try {
    await MonthlyBudget.sync({ alter: true });
    console.log('MonthlyBudget table schema is now in sync with the model.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();