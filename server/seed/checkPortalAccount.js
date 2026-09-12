require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const ChartOfAccount = require('../models/ChartOfAccount');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Script connected to database:', sequelize.config.database, '@', sequelize.config.host);

    const rows = await ChartOfAccount.findAll({ where: { email: 's@gmail.com' } });
    console.log(`Found ${rows.length} row(s) with email s@gmail.com:`);
    rows.forEach(r => {
      console.log({
        id: r.id,
        name: r.name,
        email: r.email,
        createUser: r.createUser,
        portalPassword: r.portalPassword,
      });
    });

    process.exit(0);
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

run();