require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const sequelize = require('../config/db');
const Customer = require('../models/Customer');

async function run() {
  try {
    await sequelize.authenticate();

    console.log('--- CONNECTED TO ---');
    console.log({
      database: sequelize.config.database,
      host: sequelize.config.host,
      port: sequelize.config.port,
      username: sequelize.config.username,
    });
    console.log('--------------------');

    const customers = await Customer.findAll({
      attributes: ['id', 'name', 'email', 'mobile'],
      limit: 20,
    });
    console.log(`Found ${customers.length} customer(s):`);
    customers.forEach(c => {
      console.log(`- id: ${c.id}, name: ${c.name}, email: ${c.email || '(none)'}, mobile: ${c.mobile}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

run();