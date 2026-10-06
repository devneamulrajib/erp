const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FundRequisition = sequelize.define('FundRequisition', {
  date: DataTypes.STRING,
  // Legacy columns (projectType / task / subTask) are kept so old rows stay intact,
  // but the new form no longer sends them.
  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  task: DataTypes.STRING,
  subTask: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  fromUserId: DataTypes.INTEGER, // "Requested By"
  amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  approvedAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  paidAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
  purpose: DataTypes.STRING,
  reference: DataTypes.STRING, // system number: REQ-0001
  paymentStatus: { type: DataTypes.ENUM('Payment Left', 'Done'), defaultValue: 'Payment Left' },
  addedBy: DataTypes.STRING,

  category: DataTypes.STRING,
  payTo: DataTypes.STRING,
  priority: { type: DataTypes.STRING, defaultValue: 'Normal' }, // Normal | Urgent
  requiredBy: DataTypes.STRING,
  remarks: DataTypes.TEXT,
  linkedReference: DataTypes.STRING,
  cancelled: { type: DataTypes.BOOLEAN, defaultValue: false },
  cancelReason: DataTypes.STRING,

  // --- NEW (v3) ---
  rejected: { type: DataTypes.BOOLEAN, defaultValue: false },
  rejectReason: DataTypes.STRING,
  approvalNote: DataTypes.TEXT,
}, { timestamps: true });

module.exports = FundRequisition;