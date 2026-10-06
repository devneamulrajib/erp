const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const {
  FundRequisition, FundRequisitionPayment, FundRequisitionApproval, Project, Site, User,
} = require('../models/associations');

const CATEGORIES = ['Site Expense', 'Labour', 'Supplier Advance', 'Material', 'Office', 'Utility', 'Transport', 'Other'];
const PRIORITIES = ['Normal', 'Urgent'];
const METHODS = ['Cash', 'Cheque', 'Bank'];

const num = (v) => Number(v) || 0;
const round2 = (n) => Math.round(n * 100) / 100;
const toId = (v) => (v === '' || v === undefined || v === null ? null : Number(v) || null);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));

const includeList = [
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: Site, as: 'site', attributes: ['id', 'name'] },
  { model: User, as: 'from', attributes: ['id', 'name'] },
  { model: FundRequisitionPayment, as: 'payments' },
  { model: FundRequisitionApproval, as: 'approvals' },
];

// Adds derived fields so the client never has to re-implement the rules.
function decorate(instance) {
  const r = instance.toJSON ? instance.toJSON() : instance;
  const approvals = r.approvals || [];
  const amount = num(r.amount);
  const paid = num(r.paidAmount);
  const allApproved = approvals.length > 0 && approvals.every((a) => a.approved);
  const anyApproved = approvals.some((a) => a.approved);
  const done = r.paymentStatus === 'Done';
  const closed = !!(r.cancelled || r.rejected);

  // What can actually be paid out: the approved amount, or the requested amount
  // when every layer approved but no separate approved amount was recorded.
  const payable = allApproved && !closed ? (num(r.approvedAmount) > 0 ? num(r.approvedAmount) : amount) : 0;
  const balance = done || closed ? 0 : round2(Math.max(0, payable - paid));

  let approvalStatus = 'Pending Approval';
  if (r.cancelled) approvalStatus = 'Cancelled';
  else if (r.rejected) approvalStatus = 'Rejected';
  else if (allApproved) approvalStatus = 'Approved';

  let paymentState = 'Unpaid';
  if (paid > 0) paymentState = done || (payable > 0 && paid >= payable) ? 'Paid' : 'Partial';
  else if (done) paymentState = 'Paid';

  const untouched = !closed && !anyApproved && paid <= 0;

  return {
    ...r,
    payable,
    balance,
    approvalStatus,
    paymentState,
    canApprove: !closed && !allApproved,
    canEdit: untouched,
    canDelete: !r.cancelled && !anyApproved && paid <= 0, // rejected requisitions can be deleted too
    canCancel: !closed && anyApproved && paid <= 0,
    canPay: !closed && allApproved && !done && balance > 0,
  };
}

async function loadOne(id) {
  const row = await FundRequisition.findByPk(id, { include: includeList });
  return row ? decorate(row) : null;
}

// ---------- List ----------
router.get('/', auth, async (req, res) => {
  try {
    const { from, approveStatus, paymentState, projectId, dateFrom, dateTo } = req.query;
    const where = {};
    if (from) where.fromUserId = from;
    if (projectId) where.projectId = projectId;
    if (dateFrom && dateTo) where.date = { [Op.between]: [dateFrom, dateTo] };
    else if (dateFrom) where.date = { [Op.gte]: dateFrom };
    else if (dateTo) where.date = { [Op.lte]: dateTo };

    const found = await FundRequisition.findAll({ where, include: includeList, order: [['createdAt', 'DESC']] });
    let list = found.map(decorate);

    // Cancelled requisitions are hidden unless explicitly requested.
    list = approveStatus === 'Cancelled' ? list.filter((r) => r.cancelled) : list.filter((r) => !r.cancelled);
    if (['Approved', 'Pending Approval', 'Rejected'].includes(approveStatus)) {
      list = list.filter((r) => r.approvalStatus === approveStatus);
    }
    if (['Unpaid', 'Partial', 'Paid'].includes(paymentState)) {
      list = list.filter((r) => r.paymentState === paymentState);
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const row = await loadOne(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Create ----------
router.post('/', auth, async (req, res) => {
  try {
    const {
      date, project, site, from, category, payTo, amount, priority,
      requiredBy, purpose, remarks, linkedReference,
    } = req.body;

    if (!isDate(date)) return res.status(400).json({ message: 'A valid date is required' });
    if (num(amount) <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    if (!String(purpose || '').trim()) return res.status(400).json({ message: 'Purpose is required' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ message: 'Please choose a category' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });
    if (requiredBy && (!isDate(requiredBy) || requiredBy < date)) {
      return res.status(400).json({ message: 'Required By cannot be before the requisition date' });
    }

    const requisition = await FundRequisition.create({
      date,
      projectId: toId(project),
      siteId: toId(site),
      fromUserId: toId(from) || req.user?.id || null,
      category,
      payTo: String(payTo || '').trim() || null,
      amount: round2(num(amount)),
      approvedAmount: 0,
      paidAmount: 0,
      priority: priority || 'Normal',
      requiredBy: requiredBy || null,
      purpose: String(purpose).trim(),
      remarks: String(remarks || '').trim() || null,
      linkedReference: String(linkedReference || '').trim() || null,
      paymentStatus: 'Payment Left',
      addedBy: req.user?.name || 'Admin',
    });

    // Sequential, collision-free number (the old random REQ-### could repeat).
    requisition.reference = 'REQ-' + String(requisition.id).padStart(4, '0');
    await requisition.save();

    await FundRequisitionApproval.create({ name: 'Admin', approved: false, fundRequisitionId: requisition.id });

    res.status(201).json(await loadOne(requisition.id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Edit (only before any approval / payment) ----------
router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await loadOne(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (!existing.canEdit) {
      return res.status(409).json({ message: 'This requisition is already approved, paid, rejected or cancelled and can no longer be edited' });
    }

    const b = req.body;
    if (b.date !== undefined && !isDate(b.date)) return res.status(400).json({ message: 'A valid date is required' });
    if (b.amount !== undefined && num(b.amount) <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' });
    if (b.purpose !== undefined && !String(b.purpose).trim()) return res.status(400).json({ message: 'Purpose is required' });
    if (b.category !== undefined && !CATEGORIES.includes(b.category)) return res.status(400).json({ message: 'Please choose a category' });
    if (b.priority !== undefined && !PRIORITIES.includes(b.priority)) return res.status(400).json({ message: 'Invalid priority' });

    const requisition = await FundRequisition.findByPk(req.params.id);
    const idFields = { project: 'projectId', site: 'siteId', from: 'fromUserId' };
    Object.entries(idFields).forEach(([key, col]) => {
      if (b[key] !== undefined) requisition[col] = toId(b[key]);
    });
    ['date', 'category', 'priority', 'requiredBy'].forEach((k) => {
      if (b[k] !== undefined) requisition[k] = b[k] || null;
    });
    ['payTo', 'remarks', 'linkedReference'].forEach((k) => {
      if (b[k] !== undefined) requisition[k] = String(b[k] || '').trim() || null;
    });
    if (b.purpose !== undefined) requisition.purpose = String(b.purpose).trim();
    if (b.amount !== undefined) requisition.amount = round2(num(b.amount));
    // approvedAmount / paymentStatus are intentionally NOT editable here;
    // they change only through approvals and payments.

    await requisition.save();
    res.json(await loadOne(requisition.id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Approve (next pending layer) ----------
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const existing = await loadOne(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (!existing.canApprove) {
      return res.status(409).json({ message: 'This requisition is not waiting for approval' });
    }

    const amt = round2(num(req.body.approvedAmount));
    if (amt <= 0) return res.status(400).json({ message: 'Approved amount must be greater than 0' });
    if (amt > num(existing.amount)) {
      return res.status(400).json({ message: `Approved amount cannot exceed the requested amount (${num(existing.amount).toLocaleString()})` });
    }

    const pending = (existing.approvals || [])
      .filter((a) => !a.approved)
      .sort((a, b) => a.id - b.id);

    if (pending.length > 0) {
      await FundRequisitionApproval.update({ approved: true }, { where: { id: pending[0].id } });
    } else {
      // Older rows with no approval layer at all: record a single approved layer.
      await FundRequisitionApproval.create({ name: 'Admin', approved: true, fundRequisitionId: existing.id });
    }

    await FundRequisition.update(
      { approvedAmount: amt, approvalNote: String(req.body.note || '').trim() || null },
      { where: { id: existing.id } },
    );

    res.json(await loadOne(existing.id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Reject ----------
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const existing = await loadOne(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (!existing.canApprove) {
      return res.status(409).json({ message: 'This requisition is not waiting for approval' });
    }

    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A rejection reason is required' });

    await FundRequisition.update({ rejected: true, rejectReason: reason }, { where: { id: existing.id } });
    res.json(await loadOne(existing.id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Payments ----------
router.post('/:id/payments', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const requisition = await FundRequisition.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
    if (!requisition) { await t.rollback(); return res.status(404).json({ message: 'Not found' }); }

    const approvals = await FundRequisitionApproval.findAll({ where: { fundRequisitionId: requisition.id }, transaction: t });
    const allApproved = approvals.length > 0 && approvals.every((a) => a.approved);

    if (requisition.cancelled) { await t.rollback(); return res.status(409).json({ message: 'This requisition is cancelled' }); }
    if (requisition.rejected) { await t.rollback(); return res.status(409).json({ message: 'This requisition was rejected' }); }
    if (!allApproved) { await t.rollback(); return res.status(409).json({ message: 'All approvals must be completed before payment' }); }
    if (requisition.paymentStatus === 'Done') { await t.rollback(); return res.status(409).json({ message: 'This requisition is already closed' }); }

    const { method, amount, date, reference, note, markDone } = req.body;
    const amt = round2(num(amount));
    const payable = num(requisition.approvedAmount) > 0 ? num(requisition.approvedAmount) : num(requisition.amount);
    const balance = round2(payable - num(requisition.paidAmount));

    if (amt <= 0) { await t.rollback(); return res.status(400).json({ message: 'Payment amount must be greater than 0' }); }
    if (amt > balance) {
      await t.rollback();
      return res.status(400).json({ message: `Payment exceeds the remaining balance (${balance.toLocaleString()})` });
    }
    if (method && !METHODS.includes(method)) { await t.rollback(); return res.status(400).json({ message: 'Invalid payment method' }); }
    if (date && !isDate(date)) { await t.rollback(); return res.status(400).json({ message: 'Invalid payment date' }); }

    await FundRequisitionPayment.create({
      transactionId: 'TXN' + Date.now().toString().slice(-8) + String(Math.floor(10 + Math.random() * 90)),
      method: method || 'Cash',
      amount: amt,
      date: date || new Date().toISOString().slice(0, 10),
      reference: String(reference || '').trim() || null,
      note: String(note || '').trim() || null,
      fundRequisitionId: requisition.id,
    }, { transaction: t });

    requisition.paidAmount = round2(num(requisition.paidAmount) + amt);
    // Closes automatically when fully paid; "markDone" lets a user close early on a partial payment.
    if (markDone || requisition.paidAmount >= payable) requisition.paymentStatus = 'Done';
    await requisition.save({ transaction: t });

    await t.commit();
    res.json(await loadOne(requisition.id));
  } catch (err) {
    await t.rollback().catch(() => {});
    res.status(500).json({ message: err.message });
  }
});

// ---------- Cancel (approved but unpaid) ----------
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const existing = await loadOne(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (existing.cancelled) return res.status(409).json({ message: 'Already cancelled' });
    if (num(existing.paidAmount) > 0) return res.status(409).json({ message: 'Payments exist on this requisition and it cannot be cancelled' });

    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A cancellation reason is required' });

    await FundRequisition.update({ cancelled: true, cancelReason: reason }, { where: { id: req.params.id } });
    res.json(await loadOne(req.params.id));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ---------- Delete (only untouched requisitions; rejected ones included) ----------
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await loadOne(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });
    if (!existing.canDelete) {
      return res.status(409).json({ message: 'Approved or paid requisitions cannot be deleted. Cancel it instead.' });
    }
    await FundRequisitionApproval.destroy({ where: { fundRequisitionId: existing.id } });
    await FundRequisition.destroy({ where: { id: existing.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;