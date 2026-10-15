const { DataTypes } = require('sequelize');
// Supports both default export or named export from your db config
const db = require('../config/db');
const sequelize = db.sequelize || db;

const Investor = sequelize.define('Investor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },

  // --- Basic Information ---
  investorCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique identifier code for the investor (e.g., INV-001)',
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  nidPassport: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },

  // --- Investment Details ---
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },
  investmentType: {
    type: DataTypes.ENUM('project_based', 'fixed_return', 'hybrid'),
    defaultValue: 'project_based',
  },
  profitSharePercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100,
    },
  },
  fixedReturnPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    validate: {
      min: 0,
      max: 100,
    },
  },

  // --- Nominee Information ---
  nomineeName: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  nomineeRelation: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  nomineePhone: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  nomineeNid: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  // --- Relations / Accounts ---
  chartOfAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK to Chart of Accounts (ledger)',
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'FK to Users table for system association',
  },

  // --- Portal Access & Authentication ---
  // These columns were added by migrate-investor-portal.js in snake_case,
  // so they are mapped explicitly with `field`.
  portalAccess: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'portal_access',
  },
  portalUsername: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    field: 'portal_username',
  },
  portalPassword: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'portal_password',
  },
  portalLastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'portal_last_login',
  },

  // --- Status & Notes ---
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'investors',
  timestamps: true,
  // FIX: removed `underscored: true`. The investors table uses camelCase
  // columns (investorCode, nidPassport, createdAt, ...), same as Investments.
});

module.exports = Investor;