const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  code: { type: DataTypes.STRING, unique: true },
  date: DataTypes.STRING,

  supplierId: DataTypes.INTEGER,

  projectType: DataTypes.STRING,
  projectId: DataTypes.INTEGER,
  titleOfWork: DataTypes.STRING,
  task: DataTypes.STRING,
  siteId: DataTypes.INTEGER,
  categoryId: DataTypes.INTEGER,
  reference: DataTypes.STRING,

  subtotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  grandTotal: { type: DataTypes.DECIMAL(14, 2), defaultValue: 0 },
  attachment: DataTypes.STRING,

  status: { type: DataTypes.STRING, defaultValue: 'Submitted' },

  // Supplier-side confirmation, delivery tracking, invoice
  supplierConfirmedAt: { type: DataTypes.DATE, allowNull: true },
  deliveryStatus: {
    type: DataTypes.ENUM('Pending', 'Shipped', 'Delivered'),
    defaultValue: 'Pending',
  },
  deliveryUpdatedAt: { type: DataTypes.DATE, allowNull: true },
  invoiceFile: { type: DataTypes.STRING, allowNull: true },
  invoiceUploadedAt: { type: DataTypes.DATE, allowNull: true },

  // Admin-side delivery confirmation (triggers auto invoice/bill generation)
  deliveryConfirmedAt: { type: DataTypes.DATE, allowNull: true },

  // Payment lifecycle, synced from the Bill created for this PO
  paymentStatus: { type: DataTypes.STRING, defaultValue: 'Unpaid' }, // 'Unpaid' | 'Paid'
  paidAt: { type: DataTypes.DATE, allowNull: true },
  supplierPaymentConfirmedAt: { type: DataTypes.DATE, allowNull: true },

  // Links this PO to the Bill created from it (Accounts side / auto invoice)
  convertedToBillId: { type: DataTypes.INTEGER, allowNull: true },

  addedBy: DataTypes.STRING,
}, {
  tableName: 'purchase_orders',
  timestamps: true,
});

module.exports = PurchaseOrder;