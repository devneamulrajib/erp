require('dotenv').config();
const models = require('./models/associations');

console.log('Model'.padEnd(32), 'Computed table name');
console.log('-'.repeat(60));

Object.entries(models).forEach(([name, model]) => {
  if (model && typeof model.getTableName === 'function') {
    console.log(name.padEnd(32), '->', model.getTableName());
  }
});

process.exit(0);