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
  // Bill carries the running paid / due amounts and the payment history,
  // so the supplier sees partial payments too.
  {
    model: Bill,
    as: 'bill',
    attributes: ['id', 'code', 'grandTotal', 'paid', 'due', 'status'],
    include: [{ model: BillPayment, attributes: ['id', 'paymentMethod', 'chequeReceiptNo', 'amount', 'date'] }],
  },
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

// Supplier's earnings track record: every payment the company has made against
// this supplier's invoices, plus totals and a month-by-month breakdown.
// Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD only narrows the payment list.
// (Must stay above '/:id' so "earnings" isn't treated as an order id.)
router.get('/earnings', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const { from, to } = req.query;
    const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

    const orders = await PurchaseOrder.findAll({
      where: { supplierId: req.portalUser.customerId, convertedToBillId: { [Op.ne]: null } },
      attributes: ['id', 'code', 'convertedToBillId'],
    });
    const billIds = orders.map((o) => o.convertedToBillId);

    const empty = {
      summary: {
        totalInvoiced: 0, totalReceived: 0, outstanding: 0, paymentsCount: 0,
        lastPaymentDate: null, rangeTotal: 0, rangeCount: 0,
      },
      monthly: [],
      payments: [],
    };
    if (billIds.length === 0) return res.json(empty);

    const [bills, payRows] = await Promise.all([
      Bill.findAll({ where: { id: billIds }, attributes: ['id', 'code', 'grandTotal', 'paid', 'due'] }),
      BillPayment.findAll({ where: { billId: billIds }, order: [['date', 'DESC'], ['id', 'DESC']] }),
    ]);

    const billById = Object.fromEntries(bills.map((b) => [b.id, b]));
    const orderByBillId = Object.fromEntries(orders.map((o) => [o.convertedToBillId, o]));

    const allPayments = payRows.map((p) => ({
      id: p.id,
      date: p.date,
      amount: round2(p.amount),
      method: p.paymentMethod,
      chequeReceiptNo: p.chequeReceiptNo || null,
      billCode: billById[p.billId]?.code || null,
      purchaseOrderId: orderByBillId[p.billId]?.id || null,
      purchaseOrderCode: orderByBillId[p.billId]?.code || null,
    }));

    // All-time figures (not affected by the date filter)
    const totalInvoiced = bills.reduce((s, b) => s + (Number(b.grandTotal) || 0), 0);
    const totalReceived = allPayments.reduce((s, p) => s + p.amount, 0);
    const outstanding = bills.reduce((s, b) => s + Math.max(Number(b.due) || 0, 0), 0);

    const monthlyMap = {};
    allPayments.forEach((p) => {
      const key = String(p.date || '').slice(0, 7); // YYYY-MM
      if (!/^\d{4}-\d{2}$/.test(key)) return;
      monthlyMap[key] = (monthlyMap[key] || 0) + p.amount;
    });
    const monthly = Object.keys(monthlyMap).sort().map((month) => ({ month, received: round2(monthlyMap[month]) }));

    // Date-filtered list (dates are stored as YYYY-MM-DD strings, so string compare works)
    const payments = allPayments.filter((p) => {
      const d = p.date || '';
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });

    const dates = allPayments.map((p) => p.date).filter(Boolean).sort();

    res.json({
      summary: {
        totalInvoiced: round2(totalInvoiced),
        totalReceived: round2(totalReceived),
        outstanding: round2(outstanding),
        paymentsCount: allPayments.length,
        lastPaymentDate: dates.length ? dates[dates.length - 1] : null,
        rangeTotal: round2(payments.reduce((s, p) => s + p.amount, 0)),
        rangeCount: payments.length,
      },
      monthly,
      payments,
    });
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