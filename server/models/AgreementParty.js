const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AgreementParty = sequelize.define('AgreementParty', {
  agreementId: DataTypes.INTEGER,
  selectParty: DataTypes.STRING,   // e.g. 'Buyer', 'Seller', 'Witness'
  name: DataTypes.STRING,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  nid: DataTypes.STRING,
  position: DataTypes.STRING,
  image: DataTypes.TEXT('long'),   // base64 data URL
  address: DataTypes.TEXT,
  type: DataTypes.STRING,          // e.g. 'Individual', 'Company'
  details: DataTypes.TEXT,
}, {
  tableName: 'agreement_parties',
  timestamps: true,
});

module.exports = AgreementParty;