const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CustomerNominee = sequelize.define('CustomerNominee', {
  name: DataTypes.STRING,
  nid: DataTypes.STRING,
  relation: DataTypes.STRING,
  percentage: DataTypes.FLOAT,
}, { timestamps: false });

module.exports = CustomerNominee;