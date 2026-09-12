const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AgreementPayment = sequelize.define('AgreementPayment', {
  agreementId: DataTypes.INTEGER,
  details: DataTypes.STRING,
  amount: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
}, {
  tableName: 'agreement_payments',
  timestamps: true,
});

module.exports = AgreementPayment;