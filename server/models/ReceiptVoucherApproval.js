const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ReceiptVoucherApproval = sequelize.define('ReceiptVoucherApproval', {
  receiptVoucherId: DataTypes.INTEGER,
  name: DataTypes.STRING,
  approved: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'receipt_voucher_approvals',
  timestamps: true,
});

module.exports = ReceiptVoucherApproval;