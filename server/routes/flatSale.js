const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const {
  FlatSale, FlatSaleInstallment, FlatSaleInstallmentPayment,
  Flat, Project, Site, ChartOfAccount,
} = require('../models/associations');

function generateCode() {
  return 'Sale' + Math.floor(1000000 + Math.random() * 9000000);
}

const includeAll = [
  { model: Project, attributes: ['name'] },
  { model: Site, attributes: ['name'] },
  { model: Flat },
  { model: ChartOfAccount },
  { model: FlatSaleInstallment, include: [{ model: FlatSaleInstallmentPayment }] },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, salesBy, project, customer } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (customer) where.customerId = customer;
    if (salesBy) where.salesBy = salesBy;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const sales = await FlatSale.findAll({
      where,
      include: [
        { model: Project, attributes: ['name'] },
        { model: Site, attributes: ['name'] },
        { model: Flat, attributes: ['flatLandNo'] },
        { model: ChartOfAccount, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Must stay ABOVE GET /:id
router.get('/installment-report', auth, async (req, res) => {
  try {
    const { from, to, salesBy, project } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (salesBy) where.salesBy = salesBy;

    const sales = await FlatSale.findAll({
      where,
      include: [
        { model: Project, attributes: ['name'] },
        { model: Flat, attributes: ['flatLandNo'] },
        { model: ChartOfAccount, attributes: ['name'] },
        { model: FlatSaleInstallment },
      ],
    });

    const rows = [];
    sales.forEach((sale) => {
      (sale.FlatSaleInstallments || []).forEach((inst) => {
        if (from && inst.date && inst.date < from) return;
        if (to && inst.date && inst.date > to) return;
        rows.push({
          saleId: sale.id,
          installmentId: inst.id,
          project: sale.Project,
          flat: sale.Flat,
          customerName: sale.ChartOfAccount?.name || '-',
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

router.put('/:saleId/installments/:installmentId/pay', auth, async (req, res) => {
  try {
    const { saleId, installmentId } = req.params;
    const { amount, method, receiptNo, comment } = req.body;
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }

    const sale = await FlatSale.findByPk(saleId);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const installment = await FlatSaleInstallment.findOne({ where: { id: installmentId, flatSaleId: sale.id } });
    if (!installment) return res.status(404).json({ message: 'Installment not found' });

    installment.recovered = (installment.recovered || 0) + numAmount;
    await FlatSaleInstallmentPayment.create({
      amount: numAmount,
      method: method || 'Cash',
      receiptNo,
      comment,
      date: new Date(),
      installmentId: installment.id,
    });
    if (installment.recovered >= installment.amount) installment.paid = true;
    await installment.save();

    sale.paid = (Number(sale.paid) || 0) + numAmount;
    sale.due = sale.grandTotal - sale.paid;
    await sale.save();

    const populated = await FlatSale.findByPk(sale.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await FlatSale.findByPk(req.params.id, { include: includeAll });
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

    const flatDoc = await Flat.findByPk(flat);
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
      date, bookingNo,
      projectId: project,
      siteId: site,
      flatId: flat,
      customerId: customer,
      projectType,
      collectionOfficer, salesBy,
      ledger: ledger || 'Flat Sales',
      attachment,
      size,
      rate: numRate, parking: numParking, utilityCharge: numUtility,
      otherCost: numOther, discount: numDiscount,
      subtotal, grandTotal,
      bookingMoney: numBooking,
      paymentMethod: paymentMethod || 'Cash',
      chequeReceiptNo,
      paid: numBooking,
      due,
      status: 'Booked',
    });

    if (Array.isArray(installments)) {
      for (const inst of installments) {
        await FlatSaleInstallment.create({ ...inst, flatSaleId: sale.id });
      }
    }

    if (flatDoc) {
      flatDoc.status = 'Booked';
      await flatDoc.save();
    }

    const populated = await FlatSale.findByPk(sale.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const sale = await FlatSale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });

    const map = { project: 'projectId', site: 'siteId', flat: 'flatId', customer: 'customerId' };
    const fields = [
      'date', 'bookingNo', 'project', 'site', 'flat', 'customer', 'projectType',
      'collectionOfficer', 'salesBy', 'ledger', 'attachment', 'size',
      'rate', 'parking', 'utilityCharge', 'otherCost', 'discount',
      'bookingMoney', 'paymentMethod', 'chequeReceiptNo',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) {
        const target = map[key] || key;
        sale[target] = req.body[key];
      }
    });

    if (req.body.installments !== undefined) {
      await FlatSaleInstallment.destroy({ where: { flatSaleId: sale.id } });
      for (const inst of req.body.installments) {
        await FlatSaleInstallment.create({ ...inst, flatSaleId: sale.id });
      }
    }

    sale.subtotal = (Number(sale.rate) || 0) * (Number(sale.size) || 0);
    sale.grandTotal = sale.subtotal + (Number(sale.parking) || 0) + (Number(sale.utilityCharge) || 0)
      + (Number(sale.otherCost) || 0) - (Number(sale.discount) || 0);
    if (req.body.bookingMoney !== undefined) sale.paid = Number(sale.bookingMoney) || 0;
    sale.due = sale.grandTotal - (Number(sale.paid) || 0);

    await sale.save();
    const populated = await FlatSale.findByPk(sale.id, { include: includeAll });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const sale = await FlatSale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });

    const flatId = sale.flatId;
    await sale.destroy();

    if (flatId) {
      await Flat.update({ status: 'Available' }, { where: { id: flatId } });
    }

    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;