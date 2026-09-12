const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { AssignShare, Project, ProjectType, Site, Flat, Customer } = require('../models/associations');

function generateShareCode() {
  return 'SHR-' + Math.floor(100000 + Math.random() * 900000);
}

const includes = [
  { model: Project, as: 'project', attributes: ['id', 'name'] },
  { model: ProjectType, as: 'projectType', attributes: ['id', 'name'] },
  { model: Site, as: 'site', attributes: ['id', 'name'] },
  { model: Flat, as: 'flat', attributes: ['id', 'flatLandNo'] },
  { model: Customer, as: 'customer', attributes: ['id', 'name', 'code'] },
];

function serialize(row) {
  const j = row.toJSON();
  return {
    id: j.id,
    project: j.project ? j.project.name : '',
    projectId: j.projectId,
    projectType: j.projectTypeId,
    code: j.customer ? j.customer.code : '',
    shareCode: j.shareCode,
    name: j.customer ? j.customer.name : '',
    customerId: j.customerId,
    site: j.siteId,
    flatLandNo: j.flatId,
    flatLand: j.flat ? j.flat.flatLandNo : '',
    noOfShare: j.noOfShare,
    shareAmount: Number(j.shareAmount) || 0,
    paidAmount: Number(j.paidAmount) || 0,
    note: j.note,
    createdAt: j.createdAt,
  };
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateShareCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { project } = req.query;
    const where = {};
    if (project) where.projectId = project;

    const rows = await AssignShare.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });
    res.json(rows.map(serialize));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Report used by Share Report page
router.get('/report', auth, async (req, res) => {
  try {
    const { project, startDate, endDate } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(new Date(endDate).setHours(23, 59, 59, 999))] };
    }

    const rows = await AssignShare.findAll({ where, include: includes, order: [['createdAt', 'DESC']] });

    const result = rows.map((row) => {
      const j = row.toJSON();
      const shareAmount = Number(j.shareAmount) || 0;
      const paidAmount = Number(j.paidAmount) || 0;
      const due = shareAmount - paidAmount;
      return {
        id: j.id,
        shareholderName: j.customer ? j.customer.name : '',
        noOfShare: j.noOfShare,
        shareAmount,
        paidAmount,
        totalCost: shareAmount,
        balance: due,
        due,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      projectType, project, shareCode, site, flatLandNo, customer,
      noOfShare, note, shareAmount, paidAmount,
    } = req.body;

    if (!project) return res.status(400).json({ message: 'Project is required' });
    if (!customer) return res.status(400).json({ message: 'Customer is required' });

    const row = await AssignShare.create({
      projectId: project,
      projectTypeId: projectType || null,
      siteId: site || null,
      flatId: flatLandNo || null,
      customerId: customer,
      shareCode: shareCode || generateShareCode(),
      noOfShare: noOfShare || 0,
      shareAmount: shareAmount || 0,
      paidAmount: paidAmount || 0,
      note: note || '',
    });

    const populated = await AssignShare.findByPk(row.id, { include: includes });
    res.status(201).json(serialize(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const row = await AssignShare.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: 'Not found' });

    const map = {
      projectType: 'projectTypeId', project: 'projectId', site: 'siteId',
      flatLandNo: 'flatId', customer: 'customerId', shareCode: 'shareCode',
      noOfShare: 'noOfShare', note: 'note', shareAmount: 'shareAmount', paidAmount: 'paidAmount',
    };
    Object.entries(map).forEach(([bodyKey, modelKey]) => {
      if (req.body[bodyKey] !== undefined) row[modelKey] = req.body[bodyKey];
    });

    await row.save();
    const populated = await AssignShare.findByPk(row.id, { include: includes });
    res.json(serialize(populated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await AssignShare.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;