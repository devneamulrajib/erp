const router = require('express').Router();
const auth = require('../middleware/auth');
const FlatSale = require('../models/FlatSale');
const Flat = require('../models/Flat');

function generateCode() {
  return 'Sale' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, salesBy, project, customer } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (customer) filter.customer = customer;
    if (salesBy) filter.salesBy = salesBy;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const sales = await FlatSale.find(filter)
      .populate('project', 'name')
      .populate('site', 'name')
      .populate('flat', 'flatLandNo')
      .populate('customer', 'name')
      .sort({ createdAt: -1 });

    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Flattens every installment across every sale into one row per installment.
// Must be declared before GET /:id or Express would treat "installment-report"
// as an :id value.
router.get('/installment-report', auth, async (req, res) => {
  try {
    const { from, to, salesBy, project } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (salesBy) filter.salesBy = salesBy;

    const sales = await FlatSale.find(filter)
      .populate('project', 'name')
      .populate('flat', 'flatLandNo')
      .populate('customer', 'name')
      .lean();

    const rows = [];
    sales.forEach((sale) => {
      (sale.installments || []).forEach((inst) => {
        if (from && inst.date && inst.date < from) return;
        if (to && inst.date && inst.date > to) return;
        rows.push({
          saleId: sale._id,
          installmentId: inst._id,
          project: sale.project,
          flat: sale.flat,
          customerName: sale.customer?.name || '-',
          totalValue: sale.grandTotal,
          paid: sale.paid,
          due: sale.due,
          installmentDate: inst.date,
          installmentAmount: inst.amount,
          recovered: inst.recovered || 0,
          installmentDue: (inst.amount || 0) - (inst.recovered || 0),
          salesBy: sale.salesBy,
        });
      });
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Records a recovery payment against one specific installment.
router.put('/:saleId/installments/:installmentId/pay', auth, async (req, res) => {
  try {
    const { saleId, installmentId } = req.params;
    const { amount, method, receiptNo, comment } = req.body;
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const sale = await FlatSale.findById(saleId);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const installment = sale.installments.id(installmentId);
    if (!installment) return res.status(404).json({ message: 'Installment not found' });

    installment.recovered = (installment.recovered || 0) + numAmount;
    installment.payments.push({
      amount: numAmount,
      method: method || 'Cash',
      receiptNo,
      comment,
      date: new Date(),
    });
    if (installment.recovered >= installment.amount) installment.paid = true;

    sale.paid = (Number(sale.paid) || 0) + numAmount;
    sale.due = sale.grandTotal - sale.paid;

    await sale.save();
    const populated = await sale.populate([
      { path: 'project', select: 'name' },
      { path: 'flat', select: 'flatLandNo' },
      { path: 'customer', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await FlatSale.findById(req.params.id)
      .populate('project', 'name')
      .populate('site', 'name')
      .populate('flat')
      .populate('customer');
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, bookingNo, project, site, flat, customer, projectType,
      collectionOfficer, salesBy, ledger, attachment,
      rate, parking, utilityCharge, otherCost, discount,
      bookingMoney, paymentMethod, chequeReceiptNo, installments,
    } = req.body;

    if (!project || !flat || !customer) {
      return res.status(400).json({ message: 'Project, Flat/Land and Customer are required' });
    }

    const flatDoc = await Flat.findById(flat);
    const size = flatDoc ? flatDoc.size : 0;

    const numRate = Number(rate) || 0;
    const numParking = Number(parking) || 0;
    const numUtility = Number(utilityCharge) || 0;
    const numOther = Number(otherCost) || 0;
    const numDiscount = Number(discount) || 0;

    const subtotal = numRate * size;
    const grandTotal = subtotal + numParking + numUtility + numOther - numDiscount;
    const numBooking = Number(bookingMoney) || 0;
    const due = grandTotal - numBooking;

    const sale = await FlatSale.create({
      code: code || generateCode(),
      date, bookingNo, project, site, flat, customer, projectType,
      collectionOfficer, salesBy, ledger: ledger || 'Flat Sales', attachment,
      size,
      rate: numRate, parking: numParking, utilityCharge: numUtility,
      otherCost: numOther, discount: numDiscount,
      subtotal, grandTotal,
      bookingMoney: numBooking,
      paymentMethod: paymentMethod || 'Cash',
      chequeReceiptNo,
      installments: Array.isArray(installments) ? installments : [],
      paid: numBooking,
      due,
      status: 'Booked',
    });

    // Mark the flat as booked so it drops out of the "available" pool
    if (flatDoc) {
      flatDoc.status = 'Booked';
      await flatDoc.save();
    }

    const populated = await sale.populate([
      { path: 'project', select: 'name' },
      { path: 'site', select: 'name' },
      { path: 'flat', select: 'flatLandNo' },
      { path: 'customer', select: 'name' },
    ]);

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const sale = await FlatSale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'bookingNo', 'project', 'site', 'flat', 'customer', 'projectType',
      'collectionOfficer', 'salesBy', 'ledger', 'attachment', 'size',
      'rate', 'parking', 'utilityCharge', 'otherCost', 'discount',
      'bookingMoney', 'paymentMethod', 'chequeReceiptNo', 'installments',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) sale[key] = req.body[key];
    });

    sale.subtotal = (Number(sale.rate) || 0) * (Number(sale.size) || 0);
    sale.grandTotal = sale.subtotal + (Number(sale.parking) || 0) + (Number(sale.utilityCharge) || 0)
      + (Number(sale.otherCost) || 0) - (Number(sale.discount) || 0);
    if (req.body.bookingMoney !== undefined) sale.paid = Number(sale.bookingMoney) || 0;
    sale.due = sale.grandTotal - (Number(sale.paid) || 0);

    await sale.save();
    const populated = await sale.populate([
      { path: 'project', select: 'name' },
      { path: 'site', select: 'name' },
      { path: 'flat', select: 'flatLandNo' },
      { path: 'customer', select: 'name' },
    ]);

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await FlatSale.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });

    // Free up the flat again since the sale is being removed
    if (deleted.flat) {
      await Flat.findByIdAndUpdate(deleted.flat, { status: 'Available' });
    }

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;