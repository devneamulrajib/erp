const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Property = sequelize.define('Property', {
  name: DataTypes.STRING,
  project: DataTypes.STRING,
  sold: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { timestamps: false });

module.exports = Property;