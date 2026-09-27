const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const notifyAdmin = require('../utils/notify');
const {
  MaterialRequisition, MaterialRequisitionItem, Project, Site,
  MaterialRequisitionQuotation, MaterialRequisitionQuotationItem,
  PurchaseOrder,
} = require('../models/associations');

const includes = [
  { model: MaterialRequisitionItem, as: 'items' },
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
  {
    model: MaterialRequisitionQuotation,
    as: 'quotations',
    include: [{ model: MaterialRequisitionQuotationItem, as: 'items' }],
  },
  {
    model: PurchaseOrder,
    as: 'convertedToPurchaseOrder',
    attributes: ['id', 'code', 'status', 'deliveryStatus'],
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
    const reqs = await MaterialRequisition.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
    res.json(reqs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const item = await MaterialRequisition.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
      include: includes,
    });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Supplier reviews the requested items and responds per item: can they
// deliver it, at what qty, and at what rate. Unavailable items are kept in
// the quotation with available=false, quotedRate=0, offeredQty=0 so admin
// can see what was declined.
router.post('/:id/quotation', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const requisition = await MaterialRequisition.findOne({
      where: { id: req.params.id, supplierId: req.portalUser.customerId },
      include: [{ model: MaterialRequisitionItem, as: 'items' }],
    });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    if (requisition.status !== 'Open') {
      return res.status(400).json({ message: 'This requisition is no longer open for quotations' });
    }

    const existing = await MaterialRequisitionQuotation.findOne({
      where: { materialRequisitionId: requisition.id, supplierId: req.portalUser.customerId },
    });
    if (existing && existing.status !== 'NeedsCorrection') {
      return res.status(409).json({ message: 'You have already submitted a quotation for this requisition' });
    }

    const { validUntil, notes, items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Respond to every requested item before submitting' });
    }

    const itemsById = Object.fromEntries(requisition.items.map((it) => [it.id, it]));
    let subtotal = 0;
    let anyAvailable = false;
    const rows = items.map((row) => {
      const original = itemsById[row.materialRequisitionItemId];
      if (!original) throw new Error('Item does not belong to this requisition');

      const available = row.available !== false;
      if (!available) {
        return {
          materialRequisitionItemId: original.id,
          itemName: original.itemName,
          unit: original.unit,
          demandQty: original.demandQty,
          available: false,
          offeredQty: 0,
          quotedRate: 0,
          quotedAmount: 0,
        };
      }

      anyAvailable = true;
      const offeredQty = Number(row.offeredQty) || 0;
      const quotedRate = Number(row.quotedRate) || 0;
      if (offeredQty <= 0 || quotedRate <= 0) {
        throw new Error(`Enter a valid quantity and rate for ${original.itemName}`);
      }
      const quotedAmount = quotedRate * offeredQty;
      subtotal += quotedAmount;
      return {
        materialRequisitionItemId: original.id,
        itemName: original.itemName,
        unit: original.unit,
        demandQty: original.demandQty,
        available: true,
        offeredQty,
        quotedRate,
        quotedAmount,
      };
    });

    if (!anyAvailable) {
      return res.status(400).json({ message: 'Mark at least one item as available before submitting' });
    }

    let quotation;
    if (existing) {
      await MaterialRequisitionQuotationItem.destroy({
        where: { materialRequisitionQuotationId: existing.id },
      });
      existing.validUntil = validUntil || null;
      existing.notes = notes || null;
      existing.subtotal = subtotal;
      existing.status = 'Submitted';
      existing.correctionNote = null;
      await existing.save();
      quotation = existing;
    } else {
      quotation = await MaterialRequisitionQuotation.create({
        materialRequisitionId: requisition.id,
        supplierId: req.portalUser.customerId,
        validUntil: validUntil || null,
        notes: notes || null,
        subtotal,
        status: 'Submitted',
      });
    }

    await MaterialRequisitionQuotationItem.bulkCreate(
      rows.map((r) => ({ ...r, materialRequisitionQuotationId: quotation.id }))
    );

    await notifyAdmin(
      'MaterialRequisitionQuotation',
      `Quotation submitted for requisition ${requisition.code}`,
      'MaterialRequisition',
      requisition.id
    );

    const full = await MaterialRequisitionQuotation.findByPk(quotation.id, {
      include: [{ model: MaterialRequisitionQuotationItem, as: 'items' }],
    });
    res.status(201).json(full);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;