const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Was an embedded array (`items`) on the Quote Mongoose doc.
const QuoteItem = sequelize.define('QuoteItem', {
  itemName: DataTypes.STRING,
  unit: DataTypes.STRING,
  quantity: { type: DataTypes.FLOAT, defaultValue: 0 },
  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  details: DataTypes.TEXT,
  image: DataTypes.STRING,
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
}, { timestamps: true });

module.exports = QuoteItem;