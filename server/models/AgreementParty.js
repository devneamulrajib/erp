const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AgreementParty = sequelize.define('AgreementParty', {
  agreementId: DataTypes.INTEGER,
  role: DataTypes.STRING,       // e.g. 'First Party', 'Second Party'
  name: DataTypes.STRING,
  address: DataTypes.TEXT,
  phone: DataTypes.STRING,
  nid: DataTypes.STRING,
}, {
  tableName: 'agreement_parties',
  timestamps: true,
});

module.exports = AgreementParty;