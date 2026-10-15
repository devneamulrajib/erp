const sequelize = require('./config/db');

async function migrateInvestorNominee() {
  console.log('--- Adding Investor Nominee Columns ---');
  try {
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'investors';
    `);

    if (columns.length === 0) {
      throw new Error("Table 'investors' not found.");
    }

    const existingCols = columns.map(c => c.COLUMN_NAME.toLowerCase());

    const columnsToAdd = [
      { name: 'nomineeName', query: 'ALTER TABLE investors ADD COLUMN nomineeName VARCHAR(255) NULL;' },
      { name: 'nomineeRelation', query: 'ALTER TABLE investors ADD COLUMN nomineeRelation VARCHAR(100) NULL;' },
      { name: 'nomineePhone', query: 'ALTER TABLE investors ADD COLUMN nomineePhone VARCHAR(50) NULL;' },
      { name: 'nomineeNid', query: 'ALTER TABLE investors ADD COLUMN nomineeNid VARCHAR(100) NULL;' }
    ];

    for (const col of columnsToAdd) {
      if (!existingCols.includes(col.name.toLowerCase())) {
        console.log(`Adding column investors.${col.name}...`);
        await sequelize.query(col.query);
      } else {
        console.log(`Column investors.${col.name} already exists.`);
      }
    }

    console.log('Investor nominee migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateInvestorNominee();