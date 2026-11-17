require('dotenv').config();
const { DataTypes } = require('sequelize');
const sequelize = require('./config/db');

(async () => {
  try {
    const qi = sequelize.getQueryInterface();
    const cols = await qi.describeTable('employees');

    if (!cols.bloodGroup) {
      await qi.addColumn('employees', 'bloodGroup', { type: DataTypes.STRING(5), allowNull: true });
      console.log('Added employees.bloodGroup');
    } else {
      console.log('employees.bloodGroup already exists');
    }

    if (!cols.photo) {
      await qi.addColumn('employees', 'photo', { type: DataTypes.STRING, allowNull: true });
      console.log('Added employees.photo');
    } else {
      console.log('employees.photo already exists');
    }

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();