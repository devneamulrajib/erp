const router = require('express').Router();
const multer = require('multer');
const XLSX = require('xlsx');
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');

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
  const count = await Lead.countDocuments({ leadId: { $regex: `^${prefix}` } });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${seq}`;
}

router.get('/next-code', auth, async (req, res) => {
  try {
    res.json({ code: await generateLeadId() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Flattened follow-up list across all leads (for the Call Center > Follow Up page) ---
router.get('/follow-ups/all', auth, async (req, res) => {
  try {
    const leads = await Lead.find({ 'followUps.0': { $exists: true } })
      .select('leadId name address mobile followUps')
      .sort({ createdAt: -1 });
    const rows = [];
    leads.forEach((lead) => {
      lead.followUps.forEach((f) => {
        rows.push({
          _id: f._id,
          leadObjectId: lead._id,
          leadCode: lead.leadId,
          name: lead.name,
          address: lead.address,
          mobile: lead.mobile,
          date: f.createdAt,
          followUpDate: f.followUpDate,
          note: f.note,
          comment: f.comment,
          assignUserName: f.assignUserName,
          status: f.status,
        });
      });
    });
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(rows);
  } catch (err) {
    console.error('GET /api/leads/follow-ups/all failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const items = await Lead.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('GET /api/leads failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// IMPORTANT: this must stay after '/next-code' and '/follow-ups/all' (literal
// paths) or it will intercept those requests and try to treat them as a lead _id.
router.get('/:id', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedFlats')
      .populate('requirements.area', 'name')
      .populate('dealNegotiations.flat')
      .populate('interestedProjectId', 'name')
      .populate('leadCategoryId', 'name');
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
    const item = await Lead.findById(req.params.id);
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
    const deleted = await Lead.findByIdAndDelete(req.params.id);
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
    await Lead.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: ids.length });
  } catch (err) {
    console.error('POST /api/leads/bulk-delete failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Call Assign: logs a note against each selected lead, doesn't reassign owner ---
router.post('/call-assign', auth, async (req, res) => {
  try {
    const { ids, date, userType, note } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'ids are required' });
    }
    const activity = {
      type: 'Call Assign',
      date: date ? new Date(date) : new Date(),
      status: userType || '',
      comment: note || '',
      addedBy: req.user?.name || 'Admin',
    };
    await Lead.updateMany(
      { _id: { $in: ids } },
      { $set: { lastActivity: activity }, $push: { activityLog: activity } },
    );
    res.json({ updated: ids.length });
  } catch (err) {
    console.error('POST /api/leads/call-assign failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Transfer: supports splitting selected leads across multiple users by quantity ---
router.post('/transfer', auth, async (req, res) => {
  try {
    const {
      ids, assignType, followup, manualSet, transfers, totalTransfer,
    } = req.body;

    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'ids are required' });
    }
    if (!Array.isArray(transfers) || !transfers.length) {
      return res.status(400).json({ message: 'At least one assign user row is required' });
    }

    const activity = {
      type: 'Transfer',
      date: new Date(),
      status: assignType || '',
      comment: followup ? 'Followup' : (manualSet ? 'Manual Set' : ''),
      addedBy: req.user?.name || 'Admin',
    };

    let cursor = 0;
    const remainingIds = [...ids];

    if (manualSet) {
      // Distribute ids across users according to each row's quantity
      for (const row of transfers) {
        const qty = Math.max(0, Number(row.quantity) || 0);
        const slice = remainingIds.splice(0, qty);
        if (!slice.length) continue;
        await Lead.updateMany(
          { _id: { $in: slice } },
          {
            $set: {
              assignUserId: row.userId || null,
              assignUserName: row.userName,
              srOfficer: row.userName,
            },
            $push: { activityLog: activity },
          },
        );
      }
      if (remainingIds.length) {
        // Leftover (quantities didn't cover everyone) goes to the first user
        const first = transfers[0];
        await Lead.updateMany(
          { _id: { $in: remainingIds } },
          {
            $set: {
              assignUserId: first.userId || null,
              assignUserName: first.userName,
              srOfficer: first.userName,
            },
            $push: { activityLog: activity },
          },
        );
      }
    } else {
      // No manual split — everyone selected goes to the first (only) user row
      const target = transfers[0];
      await Lead.updateMany(
        { _id: { $in: ids } },
        {
          $set: {
            assignUserId: target.userId || null,
            assignUserName: target.userName,
            srOfficer: target.userName,
          },
          $push: { activityLog: activity },
        },
      );
    }

    res.json({ transferred: ids.length });
  } catch (err) {
    console.error('POST /api/leads/transfer failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/send-sms', auth, async (req, res) => {
  // NOTE: no SMS gateway wired up yet — plug your provider in here.
  try {
    const { ids, message } = req.body;
    if (!Array.isArray(ids) || !ids.length || !message) {
      return res.status(400).json({ message: 'ids and message are required' });
    }
    res.json({ queued: ids.length, note: 'SMS gateway not configured — logged only' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/wish-sms', auth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ message: 'ids are required' });
    }
    res.json({ queued: ids.length, note: 'SMS gateway not configured — logged only' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/convert-to-customer', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (lead.isConverted) return res.status(400).json({ message: 'Lead already converted' });

    const customer = await Customer.create({
      name: lead.name,
      mobile: lead.mobile,
      address: lead.address,
      nid: req.body.nid || '0000000000',
    });

    lead.isConverted = true;
    lead.convertedCustomerId = customer._id;
    await lead.save();

    res.json({ lead, customer });
  } catch (err) {
    console.error('POST /api/leads/:id/convert-to-customer failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Bulk Import: real .xlsx/.csv parsing with fallback fields ---
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

// ============ Detail Modal Sub-resources ============

// --- Stage / Junk / Sold / Possibility ---
router.put('/:id/stage', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
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

// --- Requirements ---
router.post('/:id/requirements', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.requirements.push(req.body);
    await lead.save();
    await lead.populate('requirements.area', 'name');
    res.status(201).json(lead.requirements[lead.requirements.length - 1]);
  } catch (err) {
    console.error('POST /api/leads/:id/requirements failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/requirements/:reqId', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.requirements.id(req.params.reqId)?.deleteOne();
    await lead.save();
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/requirements/:reqId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Deal Negotiation ---
router.post('/:id/deal-negotiations', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.dealNegotiations.push({ ...req.body, createdBy: req.user?.name || 'Admin' });
    await lead.save();
    await lead.populate('dealNegotiations.flat');
    res.status(201).json(lead.dealNegotiations[lead.dealNegotiations.length - 1]);
  } catch (err) {
    console.error('POST /api/leads/:id/deal-negotiations failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/deal-negotiations/:dealId', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const deal = lead.dealNegotiations.id(req.params.dealId);
    if (!deal) return res.status(404).json({ message: 'Not found' });
    Object.assign(deal, req.body);
    await lead.save();
    res.json(deal);
  } catch (err) {
    console.error('PUT /api/leads/:id/deal-negotiations/:dealId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/deal-negotiations/:dealId', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.dealNegotiations.id(req.params.dealId)?.deleteOne();
    await lead.save();
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/deal-negotiations/:dealId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Property (assign existing Flat docs to this lead) ---
router.post('/:id/assign-flat', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    const { flatId } = req.body;
    if (!flatId) return res.status(400).json({ message: 'flatId is required' });
    if (!lead.assignedFlats.some((f) => f.toString() === flatId)) {
      lead.assignedFlats.push(flatId);
      await lead.save();
    }
    await lead.populate('assignedFlats');
    res.status(201).json(lead.assignedFlats);
  } catch (err) {
    console.error('POST /api/leads/:id/assign-flat failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/assign-flat/:flatId', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.assignedFlats = lead.assignedFlats.filter((f) => f.toString() !== req.params.flatId);
    await lead.save();
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/assign-flat/:flatId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Follow-up (also updates lastActivity/nextActivity for the list view) ---
router.post('/:id/follow-ups', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });

    const {
      status, comment, followUpDate, note, assignUserId, assignUserName,
    } = req.body;
    lead.followUps.push({
      status, comment, followUpDate, note, assignUserId, assignUserName,
    });

    lead.lastActivity = {
      type: 'Followup',
      date: new Date(),
      status: status || '',
      comment: comment || '',
      addedBy: req.user?.name || 'Admin',
    };
    lead.activityLog.push(lead.lastActivity);
    if (followUpDate) lead.nextActivity = followUpDate;

    await lead.save();
    res.status(201).json(lead.followUps[lead.followUps.length - 1]);
  } catch (err) {
    console.error('POST /api/leads/:id/follow-ups failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/follow-ups/:followUpId', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.followUps.id(req.params.followUpId)?.deleteOne();
    await lead.save();
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/follow-ups/:followUpId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Visits ---
router.post('/:id/visits', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.visits.push(req.body);

    lead.lastActivity = {
      type: 'Visit/Task',
      date: new Date(),
      status: req.body.status || '',
      comment: req.body.comment || '',
      addedBy: req.user?.name || 'Admin',
    };
    lead.activityLog.push(lead.lastActivity);
    if (req.body.date) lead.nextActivity = req.body.date;

    await lead.save();
    res.status(201).json(lead.visits[lead.visits.length - 1]);
  } catch (err) {
    console.error('POST /api/leads/:id/visits failed:', err);
    res.status(500).json({ message: err.message });
  }
});

// --- Notes ---
router.post('/:id/notes', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.notes.push({ note: req.body.note, addedBy: req.user?.name || 'Admin' });
    await lead.save();
    res.status(201).json(lead.notes[lead.notes.length - 1]);
  } catch (err) {
    console.error('POST /api/leads/:id/notes failed:', err);
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/notes/:noteId', auth, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: 'Not found' });
    lead.notes.id(req.params.noteId)?.deleteOne();
    await lead.save();
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE /api/leads/:id/notes/:noteId failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;