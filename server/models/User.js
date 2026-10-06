// server/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  name: DataTypes.STRING,
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: {
    type: DataTypes.ENUM(
      'superadmin',
      'admin',
      'manager',
      'accountant',
      'storekeeper',
      'sales',
      'hr',
      'user'
    ),
    defaultValue: 'user',
  },
  roles: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: '[]',
    get() {
      const raw = this.getDataValue('roles');
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      try {
        return JSON.parse(raw);
      } catch {
        return [];
      }
    },
    set(val) {
      this.setDataValue('roles', typeof val === 'string' ? val : JSON.stringify(val || []));
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, { timestamps: true });

module.exports = User;