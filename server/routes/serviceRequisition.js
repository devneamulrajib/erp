const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  ServiceRequisition, ServiceRequisitionItem, ServiceRequisitionApproval,
  Project, Site, ChartOfAccount,
} = require('../models/associations');

function generateCode() {
  return 'SR' + Math.floor(1000000 + Math.random() * 9000000);
}

function cleanItems(items, headerDate) {
  return (Array.isArray(items) ? items : []).map((it) => ({
    serviceItemId: it.serviceItem || it.serviceItemId || null,
    boqItem: it.boqItem,
    // The row date always follows the requisition date (the form no longer asks for it per row).
    date: headerDate || it.date,
    code: it.code,
    name: it.name,
    unit: it.unit,
    qtyDays: Number(it.qtyDays) || 0,
    rate: Number(it.rate) || 0,
    details: it.details,
    amount: (Number(it.rate) || 0) * (Number(it.qtyDays) || 0),
  }));
}

function computeSubtotal(items) {
  return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
}

// grand total = (subtotal - discount) + VAT on the discounted amount
function computeTotals(subtotal, discount, vatPercent) {
  const sub = Number(subtotal) || 0;
  const disc = Math.min(Math.max(Number(discount) || 0, 0), sub);
  const vat = Math.max(Number(vatPercent) || 0, 0);
  const taxable = sub - disc;
  const grandTotal = Math.round((taxable + (taxable * vat) / 100) * 100) / 100;
  return { subtotal: sub, discount: disc, vatPercent: vat, grandTotal };
}

function normalizeStatus(status) {
  return status === 'draft' ? 'draft' : 'submitted';
}

// Drafts may be incomplete. A submitted requisition must be usable by an approver.
function validateForSubmit(body, items) {
  if (!body.project) return 'Please select a project.';
  if (!body.titleOfWork || !String(body.titleOfWork).trim()) return 'Please enter the title/name of work.';
  if (!body.requiredByDate) return 'Please set the required-by date.';
  if (!items.length) return 'Add at least one service/work item.';
  if (!items.some((it) => it.qtyDays > 0)) return 'At least one item needs a quantity greater than zero.';
  return null;
}

function attachmentList(value) {
  if (Array.isArray(value)) return value;
  return value ? [String(value)] : [];
}

const listInclude = [
  { model: Project, as: 'project', attributes: ['name'] },
  { model: Site, as: 'site', attributes: ['name'] },
];

const detailInclude = [
  ...listInclude,
  { model: ServiceRequisitionItem, as: 'items' },
  { model: ServiceRequisitionApproval, as: 'approvals' },
  { model: ChartOfAccount, as: 'supplier', required: false },
];

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, titleOfWork, status, priority } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (titleOfWork) where.titleOfWork = titleOfWork;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const requisitions = await ServiceRequisition.findAll({
      where,
      // approvals are included so the list can show the approval layer column
      include: [...listInclude, { model: ServiceRequisitionApproval, as: 'approvals' }],
      order: [['createdAt', 'DESC']],
    });

    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const requisition = await ServiceRequisition.findByPk(req.params.id, { include: detailInclude });
    if (!requisition) return res.status(404).json({ message: 'Not found' });
    res.json(requisition);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      code, date, project, titleOfWork, task, site, items, attachment,
      supplier, requiredByDate, priority, budgetCategory, remarks,
      discount, vatPercent,
    } = req.body;

    const status = normalizeStatus(req.body.status);
    const reqItems = cleanItems(items, date);

    if (status === 'submitted') {
      const problem = validateForSubmit(req.body, reqItems);
      if (problem) return res.status(400).json({ message: problem });
    }

    const totals = computeTotals(computeSubtotal(reqItems), discount, vatPercent);

    // Project type always follows the chosen project on the form, so we keep
    // whatever the form sent (it is read-only there) instead of trusting a free-typed value.
    const requisition = await ServiceRequisition.create({
      code: code || generateCode(),
      date,
      projectType: req.body.projectType,
      projectId: project || null,
      titleOfWork,
      task,
      siteId: site || null,
      supplierId: supplier || null,
      requiredByDate: requiredByDate || null,
      priority: priority === 'urgent' ? 'urgent' : 'normal',
      budgetCategoryId: budgetCategory || null,
      remarks,
      ...totals,
      status,
      attachment: attachmentList(attachment),
      addedBy: req.user?.name || 'Admin',
    });

    if (reqItems.length) {
      await ServiceRequisitionItem.bulkCreate(
        reqItems.map((it) => ({ ...it, serviceRequisitionId: requisition.id })),
      );
    }

    // Only a submitted requisition enters the approval flow.
    if (status === 'submitted') {
      await ServiceRequisitionApproval.create({
        name: 'Admin', approved: false, serviceRequisitionId: requisition.id,
      });
    }

    const populated = await ServiceRequisition.findByPk(requisition.id, { include: detailInclude });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const requisition = await ServiceRequisition.findByPk(req.params.id);
    if (!requisition) return res.status(404).json({ message: 'Not found' });

    const wasDraft = requisition.status === 'draft';
    const nextStatus = req.body.status !== undefined ? normalizeStatus(req.body.status) : requisition.status;

    const fkMap = {
      project: 'projectId',
      site: 'siteId',
      supplier: 'supplierId',
      budgetCategory: 'budgetCategoryId',
    };
    const fields = ['date', 'projectType', 'titleOfWork', 'task', 'requiredByDate', 'remarks'];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) requisition[key] = req.body[key] || null;
    });
    Object.entries(fkMap).forEach(([bodyKey, col]) => {
      if (req.body[bodyKey] !== undefined) requisition[col] = req.body[bodyKey] || null;
    });
    if (req.body.priority !== undefined) {
      requisition.priority = req.body.priority === 'urgent' ? 'urgent' : 'normal';
    }
    if (req.body.attachment !== undefined) {
      requisition.attachment = attachmentList(req.body.attachment);
    }

    let items;
    if (req.body.items !== undefined) {
      items = cleanItems(req.body.items, req.body.date || requisition.date);
    } else {
      items = (await ServiceRequisitionItem.findAll({
        where: { serviceRequisitionId: requisition.id },
      })).map((it) => ({ qtyDays: Number(it.qtyDays) || 0, amount: Number(it.amount) || 0 }));
    }

    // A requisition moving to "submitted" must pass the same checks as a new submit.
    if (nextStatus === 'submitted') {
      const merged = {
        project: req.body.project !== undefined ? req.body.project : requisition.projectId,
        titleOfWork: req.body.titleOfWork !== undefined ? req.body.titleOfWork : requisition.titleOfWork,
        requiredByDate: req.body.requiredByDate !== undefined ? req.body.requiredByDate : requisition.requiredByDate,
      };
      const problem = validateForSubmit(merged, items);
      if (problem) return res.status(400).json({ message: problem });
    }

    const totals = computeTotals(
      computeSubtotal(items),
      req.body.discount !== undefined ? req.body.discount : requisition.discount,
      req.body.vatPercent !== undefined ? req.body.vatPercent : requisition.vatPercent,
    );
    Object.assign(requisition, totals);
    requisition.status = nextStatus;

    if (req.body.items !== undefined) {
      await ServiceRequisitionItem.destroy({ where: { serviceRequisitionId: requisition.id } });
      if (items.length) {
        await ServiceRequisitionItem.bulkCreate(
          items.map((it) => ({ ...it, serviceRequisitionId: requisition.id })),
        );
      }
    }

    await requisition.save();

    // Draft -> Submitted: start the approval flow now (once).
    if (wasDraft && nextStatus === 'submitted') {
      const already = await ServiceRequisitionApproval.count({ where: { serviceRequisitionId: requisition.id } });
      if (!already) {
        await ServiceRequisitionApproval.create({
          name: 'Admin', approved: false, serviceRequisitionId: requisition.id,
        });
      }
    }

    const populated = await ServiceRequisition.findByPk(requisition.id, { include: detailInclude });
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ServiceRequisition.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;