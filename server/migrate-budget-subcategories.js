require('dotenv').config();
require('./models/associations');
const sequelize = require('./config/db');

async function run() {
  await sequelize.authenticate();
  console.log('Connected.');

  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('BudgetCategories');
  if (!table.parentId) {
    await qi.addColumn('BudgetCategories', 'parentId', {
      type: sequelize.Sequelize.DataTypes.INTEGER,
      allowNull: true,
    });
    console.log('Added parentId column to BudgetCategories table.');
  } else {
    console.log('parentId column already exists — skipped.');
  }

  console.log('Done.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});