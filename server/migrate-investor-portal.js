const sequelize = require('./config/db'); // FIX: default export, not { sequelize }

async function migrateInvestorPortal() {
  console.log('--- Migrating Investor Portal Fields ---');
  try {
    // FIX: table name is lowercase (db.js lowercases all table names)
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'investors';
    `);

    if (columns.length === 0) {
      throw new Error("Table 'investors' not found. Run the investor module migration first.");
    }

    const existingCols = columns.map(c => c.COLUMN_NAME.toLowerCase());

    const columnsToAdd = [
      { name: 'portal_access', query: 'ALTER TABLE investors ADD COLUMN portal_access TINYINT(1) NOT NULL DEFAULT 0;' },
      { name: 'portal_username', query: 'ALTER TABLE investors ADD COLUMN portal_username VARCHAR(100) NULL UNIQUE;' },
      { name: 'portal_password', query: 'ALTER TABLE investors ADD COLUMN portal_password VARCHAR(255) NULL;' },
      { name: 'portal_last_login', query: 'ALTER TABLE investors ADD COLUMN portal_last_login DATETIME NULL;' }
    ];

    for (const col of columnsToAdd) {
      if (!existingCols.includes(col.name.toLowerCase())) {
        console.log(`Adding column investors.${col.name}...`);
        await sequelize.query(col.query);
      } else {
        console.log(`Column investors.${col.name} already exists.`);
      }
    }

    console.log('Investor Portal migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateInvestorPortal();