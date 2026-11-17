require('dotenv').config();
const sequelize = require('./config/db');

const MODELS = [
  './models/Task',
  './models/TaskProgressUpdate',
  './models/TaskTimeLog',
];

(async () => {
  try {
    const qi = sequelize.getQueryInterface();
    let added = 0;

    for (const path of MODELS) {
      const Model = require(path);
      const tableName = Model.getTableName();
      const table = typeof tableName === 'string' ? tableName : tableName.tableName;
      const existing = await qi.describeTable(table);

      for (const [attrName, attr] of Object.entries(Model.rawAttributes)) {
        const column = attr.field || attrName;
        if (existing[column]) continue;
        if (attr.primaryKey) continue;

        const def = { type: attr.type, allowNull: true };
        if (attr.defaultValue !== undefined && typeof attr.defaultValue !== 'object') {
          def.defaultValue = attr.defaultValue;
        }

        await qi.addColumn(table, column, def);
        console.log(`Added ${table}.${column}`);
        added += 1;
      }
    }

    console.log(added ? `Done. Added ${added} column(s).` : 'Nothing to add. All columns already exist.');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
})();