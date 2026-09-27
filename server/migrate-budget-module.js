require('dotenv').config();
require('./models/associations');
const sequelize = require('./config/db');
const { BudgetCategory, MonthlyBudget } = require('./models/associations');

async function run() {
  await sequelize.authenticate();
  console.log('Connected. Creating new budget tables...');

  await BudgetCategory.sync();
  await MonthlyBudget.sync();
  console.log('BudgetCategory and MonthlyBudget tables ready.');

  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('Expenses');
  if (!table.budgetCategoryId) {
    await qi.addColumn('Expenses', 'budgetCategoryId', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
    });
    console.log('Added budgetCategoryId column to Expenses table.');
  } else {
    console.log('budgetCategoryId column already exists — skipped.');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});