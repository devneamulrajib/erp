const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const notifyAdmin = require('../utils/notify');
const { buildBillPdf } = require('../utils/billPdf');
const {
  PurchaseOrder, PurchaseOrderItem, PurchaseOrderBoqItem, Project, Site,
  Bill, BillLineItem, BillPayment,
} = require('../models/associations');

const includes = [
  { model: PurchaseOrderItem, as: 'items' },
  { model: PurchaseOrderBoqItem, as: 'boqItems' },
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
];

router.get('/', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = { supplierId: req.portalUser.customerId };
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }
    const orders = await PurchaseOrder.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier's own invoice list. Bills carry no supplierId directly, so we
// go via every PurchaseOrder of this supplier that has been converted
// into a Bill, then fetch those Bills.
router.get('/invoices/list', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const orders = await PurchaseOrder.findAll({
      where: { supplierId: req.portalUser.customerId, convertedToBillId: { [Op.ne]: null } },
      attributes: ['id', 'code', 'convertedToBillId', 'paymentStatus', 'paidAt', 'supplierPaymentConfirmedAt'],
    });
    const billIds = orders.map((o) => o.convertedToBillId);
    if (billIds.length === 0) return res.json([]);

    const bills = await Bill.findAll({ where: { id: billIds }, order: [['createdAt', 'DESC']] });
    const orderByBillId = Object.fromEntries(orders.map((o) => [o.convertedToBillId, o]));

    const merged = bills.map((b) => ({
      id: b.id,
      code: b.code,
      date: b.date,
      status: b.status,
      grandTotal: b.grandTotal,
      paid: b.paid,
      due: b.due,
      purchaseOrderId: orderByBillId[b.id]?.id,
      purchaseOrderCode: orderByBillId[b.id]?.code,
      supplierPaymentConfirmedAt: orderByBillId[b.id]?.supplierPaymentConfirmedAt || null,
    }));

    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
      include: includes,
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier confirms the PO.
router.patch('/:id/acknowledge', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    order.status = 'Acknowledged';
    order.supplierConfirmedAt = new Date();
    await order.save();

    await notifyAdmin(
      'PurchaseOrderConfirmed',
      `Order ${order.code} was confirmed by the supplier`,
      'PurchaseOrder',
      order.id
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier advances delivery status: Pending -> Shipped -> Delivered.
router.patch('/:id/delivery-status', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Shipped', 'Delivered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid delivery status' });
    }
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    order.deliveryStatus = status;
    order.deliveryUpdatedAt = new Date();
    await order.save();

    if (status === 'Delivered') {
      await notifyAdmin(
        'PurchaseOrderDelivered',
        `Order ${order.code} was marked as delivered by the supplier`,
        'PurchaseOrder',
        order.id
      );
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier downloads the auto-generated invoice (the Bill created when admin confirmed delivery).
router.get('/:id/invoice', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (!order.convertedToBillId) return res.status(404).json({ message: 'Invoice not generated yet' });

    const bill = await Bill.findByPk(order.convertedToBillId, {
      include: [{ model: BillLineItem }, { model: BillPayment }],
    });
    if (!bill) return res.status(404).json({ message: 'Invoice not found' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${bill.code}.pdf"`);
    buildBillPdf(bill, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier confirms receipt of payment once admin has recorded it as Paid.
router.patch('/:id/confirm-payment', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const order = await PurchaseOrder.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
    });
    if (!order) return res.status(404).json({ message: 'Not found' });
    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({ message: 'Payment has not been recorded by admin yet' });
    }
    if (order.supplierPaymentConfirmedAt) {
      return res.status(400).json({ message: 'Payment has already been confirmed' });
    }
    order.supplierPaymentConfirmedAt = new Date();
    await order.save();

    await notifyAdmin(
      'PaymentConfirmedBySupplier',
      `Supplier confirmed receipt of payment for order ${order.code}`,
      'PurchaseOrder',
      order.id
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;