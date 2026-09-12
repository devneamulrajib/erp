const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Customer = sequelize.define('Customer', {
  code: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  mobile: { type: DataTypes.STRING, allowNull: false },
  email: DataTypes.STRING,
  nid: { type: DataTypes.STRING, allowNull: true },
  address: DataTypes.STRING,
  buyerReference: DataTypes.STRING,
  creditLimit: { type: DataTypes.FLOAT, defaultValue: 0 },
  dueDate: DataTypes.DATE,
  openingBalance: { type: DataTypes.FLOAT, defaultValue: 0 },
  image: DataTypes.STRING,
  chartOfGroupId: DataTypes.INTEGER,
  // Reused as "portal access granted" toggle — set true by an admin
  // when they want this Customer/Supplier/Vendor to be able to log
  // into the external portal.
  createUser: { type: DataTypes.BOOLEAN, defaultValue: false },

  // --- Portal auth fields (new) ---
  portalPassword: { type: DataTypes.STRING, allowNull: true }, // bcrypt hash, never plain text
  portalRole: {
    type: DataTypes.ENUM('customer', 'supplier', 'vendor'),
    allowNull: true,
  },
  resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
  lastPortalLoginAt: { type: DataTypes.DATE, allowNull: true },
}, { timestamps: true });

module.exports = Customer;