// server/migrate-budget-category-accounts.js
// Run once:  node migrate-budget-category-accounts.js
const { DataTypes } = require('sequelize');
const sequelize = require('./config/db');
const OfficeAccountDefault = require('./models/OfficeAccountDefault');

(async () => {
  try {
    const qi = sequelize.getQueryInterface();
    const tables = await qi.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));
    const table = names.find((n) => /^budgetcategor(y|ies)$/i.test(n));
    if (!table) throw new Error('Budget categories table not found');

    const cols = await qi.describeTable(table);
    if (!cols.defaultDrAccount) {
      await qi.addColumn(table, 'defaultDrAccount', { type: DataTypes.STRING, allowNull: true });
      console.log(`Added defaultDrAccount to ${table}`);
    } else {
      console.log('defaultDrAccount already exists — nothing to do');
    }

    await OfficeAccountDefault.sync();
    console.log('Office account defaults table ready');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();