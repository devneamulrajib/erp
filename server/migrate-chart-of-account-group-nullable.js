// Run once from the server folder: node migrate-chart-of-account-group-nullable.js
// Non-destructive: only allows NULL in chartOfGroupId. No data is changed or dropped.
const sequelize = require('./config/db');
const ChartOfAccount = require('./models/ChartOfAccount');

(async () => {
  try {
    const table = ChartOfAccount.getTableName();
    await sequelize.query(`ALTER TABLE \`${table}\` MODIFY \`chartOfGroupId\` INT NULL`);
    console.log(`OK: ${table}.chartOfGroupId now allows NULL`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();