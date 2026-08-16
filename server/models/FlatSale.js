const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FlatSale = sequelize.define('FlatSale', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,
  bookingNo: DataTypes.STRING,

  projectId: DataTypes.INTEGER,
  siteId: DataTypes.INTEGER,
  flatId: DataTypes.INTEGER,
  customerId: DataTypes.INTEGER,

  projectType: DataTypes.STRING,
  collectionOfficer: DataTypes.STRING,
  salesBy: DataTypes.STRING,
  ledger: { type: DataTypes.STRING, defaultValue: 'Flat Sales' },
  attachment: DataTypes.STRING,

  size: { type: DataTypes.FLOAT, defaultValue: 0 },

  rate: { type: DataTypes.FLOAT, defaultValue: 0 },
  parking: { type: DataTypes.FLOAT, defaultValue: 0 },
  utilityCharge: { type: DataTypes.FLOAT, defaultValue: 0 },
  otherCost: { type: DataTypes.FLOAT, defaultValue: 0 },
  discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },

  bookingMoney: { type: DataTypes.FLOAT, defaultValue: 0 },
  paymentMethod: { type: DataTypes.ENUM('Cash', 'Cheque'), defaultValue: 'Cash' },
  chequeReceiptNo: DataTypes.STRING,

  paid: { type: DataTypes.FLOAT, defaultValue: 0 },
  due: { type: DataTypes.FLOAT, defaultValue: 0 },

  status: { type: DataTypes.ENUM('Booked', 'Sold'), defaultValue: 'Booked' },
}, { timestamps: true });

module.exports = FlatSale;