const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const {
  Lead, LeadRequirement, LeadDealNegotiation, LeadFollowUp, LeadVisit, LeadNote,
  LeadActivityLog, Flat, Area, Project, LeadCategory, Customer,
} = require('../models/associations');

const upload = multer({ storage: multer.memoryStorage() });

function todayPrefix() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `L${yy}${mm}${dd}`;
}

async function generateLeadId() {
  const prefix = todayPrefix();
  const count = await Lead.count({ where: { leadId: { [Op.like]: `${prefix}%` } } });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
}

const detailInclude = [
  { model: Flat, as: 'assignedFlats' },
  { model: LeadRequirement, as: 'requirements', include: [{ model: Area, attributes: ['name'] }] },
  { model: LeadDealNegotiation, as: 'dealNegotiations', include: [{ model: Flat }] },
  { model: Project, as: 'interestedProject', attributes: ['name'] },
  { model: LeadCategory, as: 'leadCategory', attributes: ['name'] },
];

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateLeadId() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Flattened follow-up list across all leads ---
router.get('/follow-ups/all', auth, async (req, res) => {
  try {
    const followUps = await LeadFollowUp.findAll({
      include: [{ model: Lead, attributes: ['leadId', 'name', 'address', 'mobile'] }],
      order: [['createdAt', 'DESC']],
    });
    const rows = followUps.map((f) => ({
      id: f.id,
      leadObjectId: f.leadId,
      leadCode: f.Lead?.leadId,
      name: f.Lead?.name,
      address: f.Lead?.address,
      mobile: f.Lead?.mobile,
      date: f.createdAt,
      followUpDate: f.followUpDate,
      note: f.note,
      comment: f.comment,
      assignUserName: f.assignUserName,
      status: f.status,
    }));
    res.json(rows);
  } catch (err) {
    console.error('GET /api/leads/follow-ups/all failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const items = await Lead.findAll({ order: [['createdAt', 'DESC']] });
    res.json(items);
  } catch (err) {
    console.error('GET /api/leads failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// IMPORTANT: must stay after '/next-code' and '/follow-ups/all'
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id, { include: detailInclude });
    if (!lead) return res.status(404).json({ message: 'Not found' });
    res.json(lead);
  } catch (err) {
    console.error('GET /api/leads/:id failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ message: 'Name and Phone/Mobile are required' });
    }
    const leadId = req.body.leadId || await generateLeadId();
    const item = await Lead.create({ ...req.body, leadId, addedBy: req.user?.name || 'Admin' });
    res.status(201).json(item);
  } catch (err) {
    console.error('POST /api/leads failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await Lead.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'date', 'name', 'phoneCountryCode', 'mobile', 'secondaryNumber',
      'assignUserId', 'assignUserName', 'crUserId', 'crUserName', 'leadStage',
      'leadSourceId', 'interestedProjectId', 'leadCategoryId', 'campaignId',
      'organization', 'designation', 'birthDate', 'anniversaryDate',
      'profession', 'address', 'email', 'status',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) item[key] = req.body[key];
    });
    if (req.body.assignUserName !== undefined) item.srOfficer = req.body.assignUserName;
    if (req.body.crUserName !== undefined) item.cr = req.body.crUserName;

    await item.save();
    res.json(item);
  } catch (err) {
    console.error('PUT /api/leads failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Lead.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk-delete', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'ids array required' });
    }
    const count = await Lead.destroy({ where: { id: { [Op.in]: ids } } });
    res.json({ deleted: count });
  } catch (err) {
    console.error('POST /api/leads/bulk-delete failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Call Assign ---
router.post('/call-assign', auth, async (req, res) => {
  try {
    const { ids, date, userType, note } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'ids are required' });
    }
    const activityDate = date ? new Date(date) : new Date();
    for (const id of ids) {
      await Lead.update({
        lastActivityType: 'Call Assign',
        lastActivityDate: activityDate,
        lastActivityStatus: userType || '',
        lastActivityComment: note || '',
        lastActivityAddedBy: req.user?.name || 'Admin',
      }, { where: { id } });
      await LeadActivityLog.create({
        type: 'Call Assign', date: activityDate, status: userType || '', comment: note || '',
        addedBy: req.user?.name || 'Admin', leadId: id,
      });
    }
    res.json({ updated: ids.length });
  } catch (err) {
    console.error('POST /api/leads/call-assign failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Transfer ---
router.post('/transfer', auth, async (req, res) => {
  try {
    const { ids, assignType, followup, manualSet, transfers } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'ids are required' });
    }
    if (!Array.isArray(transfers) || !transfers.length) {
      return res.status(400).json({ message: 'At least one assign user row is required' });
    }

    const activityDate = new Date();
    const activityStatus = assignType || '';
    const activityComment = followup ? 'Followup' : (manualSet ? 'Manual Set' : '');
    const addedBy = req.user?.name || 'Admin';

    async function assignAndLog(leadIds, userRow) {
      for (const id of leadIds) {
        await Lead.update({
          assignUserId: userRow.userId || null,
          assignUserName: userRow.userName,
          srOfficer: userRow.userName,
        }, { where: { id } });
        await LeadActivityLog.create({
          type: 'Transfer', date: activityDate, status: activityStatus, comment: activityComment, addedBy, leadId: id,
        });
      }
    }

    if (manualSet) {
      const remainingIds = [...ids];
      for (const row of transfers) {
        const qty = Math.max(0, Number(row.quantity) || 0);
        const slice = remainingIds.splice(0, qty);
        if (!slice.length) continue;
        await assignAndLog(slice, row);
      }
      if (remainingIds.length) {
        await assignAndLog(remainingIds, transfers[0]);
      }
    } else {
      await assignAndLog(ids, transfers[0]);
    }

    res.json({ transferred: ids.length });
  } catch (err) {
    console.error('POST /api/leads/transfer failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/send-sms', auth, async (req, res) => {
  const { ids, message } = req.body;
  if (!Array.isArray(ids) || !ids.length || !message) {
    return res.status(400).json({ message: 'ids and message are required' });
  }
  res.json({ queued: ids.length, note: 'SMS gateway not configured — logged only' });
});

router.post('/wish-sms', auth, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ message: 'ids are required' });
  }
  res.json({ queued: ids.length, note: 'SMS gateway not configured — logged only' });
});

router.post('/:id/convert-to-customer', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (lead.isConverted) return res.status(400).json({ message: 'Lead already converted' });

    const customer = await Customer.create({
      name: lead.name,
      mobile: lead.mobile,
      address: lead.address,
      nid: req.body.nid || '0000000000',
    });

    lead.isConverted = true;
    lead.convertedCustomerId = customer.id;
    await lead.save();

    res.json({ lead, customer });
  } catch (err) {
    console.error('POST /api/leads/:id/convert-to-customer failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/bulk-import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const fallback = {
      leadStage: req.body.leadStage || '',
      leadCategoryId: req.body.leadCategoryId || null,
      leadSourceId: req.body.leadSourceId || null,
      campaignId: req.body.campaignId || null,
      interestedProjectId: req.body.interestedProjectId || null,
    };

    const created = [];
    for (const row of rows) {
      const name = row.name || row.Name;
      const mobile = row.mobile || row.Mobile || row.phone || row.Phone;
      if (!name || !mobile) continue;

      const leadId = await generateLeadId();
      const item = await Lead.create({
        leadId,
        name,
        mobile: String(mobile),
        address: row.address || row.Address || '',
        organization: row.organization || row.Organization || '',
        leadStage: row.leadStage || row['Lead Stage'] || fallback.leadStage,
        leadCategoryId: row.leadCategoryId || fallback.leadCategoryId,
        leadSourceId: row.leadSourceId || fallback.leadSourceId,
        campaignId: row.campaignId || fallback.campaignId,
        interestedProjectId: row.interestedProjectId || fallback.interestedProjectId,
        addedBy: req.user?.name || 'Admin',
      });
      created.push(item);
    }

    res.status(201).json({ created: created.length, items: created });
  } catch (err) {
    console.error('POST /api/leads/bulk-import failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/stage', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });

    const { leadStage, isJunk, isSold, possibility } = req.body;
    if (leadStage !== undefined) lead.leadStage = leadStage;
    if (isJunk !== undefined) lead.isJunk = isJunk;
    if (isSold !== undefined) lead.isSold = isSold;
    if (possibility !== undefined) lead.possibility = possibility;

    await lead.save();
    res.json(lead);
  } catch (err) {
    console.error('PUT /api/leads/:id/stage failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/requirements', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const { area, ...rest } = req.body;
    const created = await LeadRequirement.create({ ...rest, areaId: area, leadId: lead.id });
    const populated = await LeadRequirement.findByPk(created.id, { include: [{ model: Area, attributes: ['name'] }] });
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/leads/:id/requirements failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/requirements/:reqId', auth, async (req, res) => {
  try {
    await LeadRequirement.destroy({ where: { id: req.params.reqId, leadId: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/requirements/:reqId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/deal-negotiations', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const { flat, ...rest } = req.body;
    const created = await LeadDealNegotiation.create({ ...rest, flatId: flat, leadId: lead.id, createdBy: req.user?.name || 'Admin' });
    const populated = await LeadDealNegotiation.findByPk(created.id, { include: [{ model: Flat }] });
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/leads/:id/deal-negotiations failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/deal-negotiations/:dealId', auth, async (req, res) => {
  try {
    const deal = await LeadDealNegotiation.findOne({ where: { id: req.params.dealId, leadId: req.params.id } });
    if (!deal) return res.status(404).json({ message: 'Not found' });
    const { flat, ...rest } = req.body;
    Object.assign(deal, rest);
    if (flat !== undefined) deal.flatId = flat;
    await deal.save();
    res.json(deal);
  } catch (err) {
    console.error('PUT /api/leads/:id/deal-negotiations/:dealId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/deal-negotiations/:dealId', auth, async (req, res) => {
  try {
    await LeadDealNegotiation.destroy({ where: { id: req.params.dealId, leadId: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/deal-negotiations/:dealId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/assign-flat', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const { flatId } = req.body;
    if (!flatId) return res.status(400).json({ message: 'flatId is required' });

    await lead.addAssignedFlat(flatId);
    const flats = await lead.getAssignedFlats();
    res.status(201).json(flats);
  } catch (err) {
    console.error('POST /api/leads/:id/assign-flat failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/assign-flat/:flatId', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    await lead.removeAssignedFlat(req.params.flatId);
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/assign-flat/:flatId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/follow-ups', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });

    const { status, comment, followUpDate, note, assignUserId, assignUserName } = req.body;
    const created = await LeadFollowUp.create({ status, comment, followUpDate, note, assignUserId, assignUserName, leadId: lead.id });

    lead.lastActivityType = 'Followup';
    lead.lastActivityDate = new Date();
    lead.lastActivityStatus = status || '';
    lead.lastActivityComment = comment || '';
    lead.lastActivityAddedBy = req.user?.name || 'Admin';
    await LeadActivityLog.create({
      type: 'Followup', date: lead.lastActivityDate, status: lead.lastActivityStatus,
      comment: lead.lastActivityComment, addedBy: lead.lastActivityAddedBy, leadId: lead.id,
    });
    if (followUpDate) lead.nextActivity = followUpDate;

    await lead.save();
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/leads/:id/follow-ups failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/follow-ups/:followUpId', auth, async (req, res) => {
  try {
    await LeadFollowUp.destroy({ where: { id: req.params.followUpId, leadId: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/follow-ups/:followUpId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/visits', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const created = await LeadVisit.create({ ...req.body, leadId: lead.id });

    lead.lastActivityType = 'Visit/Task';
    lead.lastActivityDate = new Date();
    lead.lastActivityStatus = req.body.status || '';
    lead.lastActivityComment = req.body.comment || '';
    lead.lastActivityAddedBy = req.user?.name || 'Admin';
    await LeadActivityLog.create({
      type: 'Visit/Task', date: lead.lastActivityDate, status: lead.lastActivityStatus,
      comment: lead.lastActivityComment, addedBy: lead.lastActivityAddedBy, leadId: lead.id,
    });
    if (req.body.date) lead.nextActivity = req.body.date;

    await lead.save();
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/leads/:id/visits failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/notes', auth, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const created = await LeadNote.create({ note: req.body.note, addedBy: req.user?.name || 'Admin', leadId: lead.id });
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/leads/:id/notes failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/notes/:noteId', auth, async (req, res) => {
  try {
    await LeadNote.destroy({ where: { id: req.params.noteId, leadId: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/notes/:noteId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;