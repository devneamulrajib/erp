const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ServiceRequisition = sequelize.define('ServiceRequisition', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  // Preferred contractor/supplier (optional). Linked to ChartOfAccount in
  // associations.js and used by the portal. Nullable so older rows are fine.
  supplierId: { type: DataTypes.INTEGER, allowNull: true },

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,

  // When the work is needed, and how urgent it is (helps approvers).
  requiredByDate: DataTypes.STRING,
  priority: { type: DataTypes.STRING, defaultValue: 'normal' }, // 'normal' | 'urgent'

  // Ties the spend to a budget head (BudgetCategory.id).
  budgetCategoryId: { type: DataTypes.INTEGER, allowNull: true },

  remarks: DataTypes.TEXT,

  subtotal: { type: DataTypes.FLOAT, defaultValue: 0 },
  discount: { type: DataTypes.FLOAT, defaultValue: 0 },
  vatPercent: { type: DataTypes.FLOAT, defaultValue: 0 },
  grandTotal: { type: DataTypes.FLOAT, defaultValue: 0 },

  // 'draft' = saved but not sent for approval, 'submitted' = in approval flow.
  status: { type: DataTypes.STRING, defaultValue: 'submitted' },

  // Several attachments are stored as a JSON array of names in a TEXT column.
  // Old rows that hold a single plain string are still read correctly.
  attachment: {
    type: DataTypes.TEXT,
    get() {
      const raw = this.getDataValue('attachment');
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [String(parsed)];
      } catch (e) {
        return [raw];
      }
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('attachment', JSON.stringify(value.filter(Boolean)));
      } else {
        this.setDataValue('attachment', value ? JSON.stringify([String(value)]) : null);
      }
    },
  },

  addedBy: DataTypes.STRING,
}, { timestamps: true });

module.exports = ServiceRequisition;