const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PaymentVoucherApproval = sequelize.define('PaymentVoucherApproval', {
  paymentVoucherId: DataTypes.INTEGER,
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'payment_voucher_approvals',
  timestamps: true,
});

module.exports = PaymentVoucherApproval;