const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const MAX_SCREENSHOT_CHARS = 4 * 1024 * 1024; // ~3MB image as base64
const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const isNumericId = (v) => /^\d+$/.test(String(v));

// Works for real users (numeric id) and the built-in superadmin (text id)
async function resolveUserName(reqUser) {
  if (reqUser.name) return String(reqUser.name).slice(0, 150);
  if (isNumericId(reqUser.id)) {
    const u = await User.findByPk(reqUser.id);
    if (u) return String(u.get('name') || u.get('email') || `User #${reqUser.id}`).slice(0, 150);
  }
  return String(reqUser.id).includes('superadmin') ? 'Super Admin' : `User ${reqUser.id}`;
}

async function adminOnly(req, res, next) {
  try {
    let role = req.user.role;
    if (!role && isNumericId(req.user.id)) {
      const u = await User.findByPk(req.user.id);
      role = u ? u.get('role') : '';
    }
    if (String(role || '').toLowerCase().includes('admin')) return next();
    return res.status(403).json({ message: 'Admin access required' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Permission check failed' });
  }
}

/* ---------- Literal routes first ---------- */

// Reporter: my own tickets
router.get('/mine', auth, async (req, res) => {
  try {
    const rows = await SupportTicket.findAll({
      where: { reporterId: String(req.user.id) },
      attributes: { exclude: ['screenshot'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load your reports' });
  }
});

// Admin: all tickets (no screenshots, to keep the list light)
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const rows = await SupportTicket.findAll({
      attributes: { exclude: ['screenshot'] },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows.map((t) => ({ ...t.toJSON(), reporterName: t.reporterName || `User ${t.reporterId}` })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load tickets' });
  }
});

// Admin: one ticket with screenshot
router.get('/admin/:id', auth, adminOnly, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json({ ...ticket.toJSON(), reporterName: ticket.reporterName || `User ${ticket.reporterId}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load ticket' });
  }
});

// Admin: update status / resolution note
router.patch('/admin/:id', auth, adminOnly, async (req, res) => {
  try {
    const ticket = await SupportTicket.findByPk(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const { status, resolutionNote } = req.body;

    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const nextStatus = status !== undefined ? status : ticket.status;
    const nextNote =
      resolutionNote !== undefined ? String(resolutionNote).trim() : ticket.resolutionNote;

    if (nextStatus === 'resolved' && !nextNote) {
      return res.status(400).json({ message: 'Please add a resolution note before marking as resolved' });
    }

    ticket.status = nextStatus;
    ticket.resolutionNote = nextNote || null;

    if (nextStatus === 'resolved' || nextStatus === 'closed') {
      if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
      ticket.resolvedById = String(req.user.id);
    } else {
      ticket.resolvedAt = null;
      ticket.resolvedById = null;
    }

    await ticket.save();
    res.json({ id: ticket.id, status: ticket.status, resolutionNote: ticket.resolutionNote });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
});

/* ---------- Create ---------- */

router.post('/', auth, async (req, res) => {
  try {
    const { type, severity, title, description, pageUrl, screenshot } = req.body;

    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({ message: 'Title and description are required' });
    }
    if (screenshot && screenshot.length > MAX_SCREENSHOT_CHARS) {
      return res.status(400).json({ message: 'Screenshot is too large (max ~3MB)' });
    }

    const ticket = await SupportTicket.create({
      reporterId: String(req.user.id),
      reporterName: await resolveUserName(req.user),
      type: ['bug', 'difficulty', 'suggestion'].includes(type) ? type : 'bug',
      severity: ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium',
      title: title.trim().slice(0, 200),
      description: description.trim(),
      pageUrl: (pageUrl || '').slice(0, 500),
      userAgent: (req.headers['user-agent'] || '').slice(0, 500),
      screenshot: screenshot || null,
    });

    ticket.ticketNo = `SUP-${String(ticket.id).padStart(4, '0')}`;
    await ticket.save();

    res.status(201).json({ id: ticket.id, ticketNo: ticket.ticketNo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit report' });
  }
});

module.exports = router;