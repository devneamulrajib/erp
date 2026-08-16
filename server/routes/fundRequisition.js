const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  FundRequisition, FundRequisitionPayment, FundRequisitionApproval, Project, Site, User,
} = require('../models/associations');

function generateReference() {
  return 'REQ-' + Math.floor(100 + Math.random() * 900);
}

const includeList = [
  { model: Project, attributes: ['name'] },
  { model: Site, attributes: ['name'] },
  { model: User, as: 'From', attributes: ['name', 'code'] },
  { model: FundRequisitionPayment },
  { model: FundRequisitionApproval },
];

router.get('/', auth, async (req, res) => {
  try {
    const { from, approveStatus } = req.query;
    const where = {};
    if (from) where.fromUserId = from;

    let requisitions = await FundRequisition.findAll({ where, include: includeList, order: [['createdAt', 'DESC']] });

    if (approveStatus === 'Approved') {
      requisitions = requisitions.filter((r) => r.FundRequisitionApprovals.length > 0 && r.FundRequisitionApprovals.every((a) => a.approved));
    } else if (approveStatus === 'Pending Approval') {
      requisitions = requisitions.filter((r) => r.FundRequisitionApprovals.length === 0 || r.FundRequisitionApprovals.some((a) => !a.approved));
    }

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await FundRequisition.findByPk(req.params.id, { include: includeList });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      date, projectType, project, task, subTask, site, from,
      amount, purpose, reference,
    } = req.body;

    if (!date || !amount || !purpose) {
      return res.status(400).json({ message: 'Date, Amount and Purpose are required' });
    }

    const requisition = await FundRequisition.create({
      date, projectType, projectId: project, task, subTask, siteId: site, fromUserId: from,
      amount: Number(amount) || 0,
      approvedAmount: 0,
      paidAmount: 0,
      purpose,
      reference: reference || generateReference(),
      paymentStatus: 'Payment Left',
      addedBy: req.user?.name || 'Admin',
    });

    await FundRequisitionApproval.create({ name: 'Admin', approved: false, fundRequisitionId: requisition.id });

    const populated = await FundRequisition.findByPk(requisition.id, { include: includeList });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const requisition = await FundRequisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const map = { project: 'projectId', site: 'siteId', from: 'fromUserId' };
    const fields = ['date', 'projectType', 'project', 'task', 'subTask', 'site', 'from', 'purpose', 'reference', 'approvedAmount', 'paymentStatus'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[map[key] || key] = req.body[key];
    });
    if (req.body.amount !== undefined) requisition.amount = Number(req.body.amount) || 0;

    await requisition.save();
    const populated = await FundRequisition.findByPk(requisition.id, { include: includeList });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/payments', auth, async (req, res) => {
  try {
    const requisition = await FundRequisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const { method, amount, date, markDone } = req.body;
    const amt = Number(amount) || 0;

    await FundRequisitionPayment.create({
      transactionId: 'TXN' + Math.floor(100000 + Math.random() * 900000),
      method: method || 'Cash',
      amount: amt,
      date: date || new Date().toISOString().slice(0, 10),
      fundRequisitionId: requisition.id,
    });
    requisition.paidAmount = (Number(requisition.paidAmount) || 0) + amt;
    if (markDone) requisition.paymentStatus = 'Done';

    await requisition.save();
    const populated = await FundRequisition.findByPk(requisition.id, { include: includeList });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await FundRequisition.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;