const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  type: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.STRING, allowNull: false },
  relatedType: DataTypes.STRING,
  relatedId: DataTypes.INTEGER,
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Who this notification is for. 'admin' (default — the main ERP topbar,
  // unscoped) or 'supplier'/'customer' (portal-scoped, paired with
  // audienceId = that party's ChartOfAccount id).
  audience: { type: DataTypes.STRING, defaultValue: 'admin' },
  audienceId: { type: DataTypes.INTEGER, allowNull: true },
}, { timestamps: true });

module.exports = Notification;