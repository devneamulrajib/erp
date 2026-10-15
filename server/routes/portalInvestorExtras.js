// server/routes/portalInvestorExtras.js
// Investor-facing Inbox: messages, documents, shared notes and activity.
// Mounted from routes/portalInvestor.js, so paths are /api/portal/investor/inbox/...
const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { portalAuth } = require('../middleware/portalAuth');
const { Investor, Investment, InvestorPayment, Project } = require('../models/associations');
const InvestorDocument = require('../models/InvestorDocument');
const InvestorMessage = require('../models/InvestorMessage');
const InvestorNote = require('../models/InvestorNote');
const logActivity = require('../utils/activityLog');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'investor-docs');
const num = (v) => Number(v) || 0;

// Authenticate once. When mounted behind portalInvestor.js, portalUser is already set.
router.use('/inbox', (req, res, next) => (req.portalUser ? next() : portalAuth(req, res, next)));
router.use('/inbox', (req, res, next) => {
  if (req.portalUser?.role !== 'investor') {
    return res.status(403).json({ message: 'Access denied: investor portal authorization required.' });
  }
  next();
});

const portalMessages = (investorId, extra = {}) => ({ investorId, channel: 'portal', ...extra });

/* ------------------------------- Summary ------------------------------- */

// GET /inbox/summary  (unread badge + tab counts)
router.get('/inbox/summary', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const [unreadMessages, documents, notes] = await Promise.all([
      InvestorMessage.count({
        where: portalMessages(investorId, { direction: 'outbound', readAt: null }),
      }),
      InvestorDocument.count({ where: { investorId, visibleToInvestor: true } }),
      InvestorNote.count({ where: { investorId, visibility: 'shared' } }),
    ]);
    res.json({ unreadMessages, documents, notes });
  } catch (err) {
    console.error('Inbox summary error:', err);
    res.status(500).json({ message: 'Failed to load inbox.' });
  }
});

/* ------------------------------- Messages ------------------------------- */

// GET /inbox/messages
router.get('/inbox/messages', async (req, res) => {
  try {
    const rows = await InvestorMessage.findAll({
      where: portalMessages(req.portalUser.id),
      order: [['createdAt', 'ASC']],
      limit: 300,
    });
    res.json(
      rows.map((m) => ({
        id: m.id,
        direction: m.direction, // outbound = from the Trikon team, inbound = from the investor
        subject: m.subject,
        body: m.body,
        createdAt: m.createdAt,
        readAt: m.readAt,
      }))
    );
  } catch (err) {
    console.error('Inbox messages error:', err);
    res.status(500).json({ message: 'Failed to load messages.' });
  }
});

// POST /inbox/messages  (investor writes to the team)
router.post('/inbox/messages', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const body = String(req.body.body || '').trim();
    const subject = String(req.body.subject || '').trim().slice(0, 120);

    if (!body) return res.status(400).json({ message: 'Please write your message first.' });
    if (body.length > 2000) {
      return res.status(400).json({ message: 'Your message is too long (2000 characters max).' });
    }

    // Simple spam guard: 10 messages per hour
    const recent = await InvestorMessage.count({
      where: portalMessages(investorId, {
        direction: 'inbound',
        createdAt: { [Op.gte]: new Date(Date.now() - 60 * 60 * 1000) },
      }),
    });
    if (recent >= 10) {
      return res.status(429).json({ message: 'You have sent several messages recently. Please try again in a while.' });
    }

    const investor = await Investor.findByPk(investorId);
    const message = await InvestorMessage.create({
      investorId,
      channel: 'portal',
      direction: 'inbound',
      subject: subject || null,
      body,
      sentBy: investor?.name || 'Investor',
    });

    logActivity({
      module: 'Investor',
      action: 'Message Received',
      message: 'Investor sent a portal message',
      relatedType: 'Investor',
      relatedId: investorId,
      performedBy: investor?.name || 'Investor',
    });

    res.status(201).json({
      id: message.id,
      direction: message.direction,
      subject: message.subject,
      body: message.body,
      createdAt: message.createdAt,
      readAt: message.readAt,
    });
  } catch (err) {
    console.error('Inbox send error:', err);
    res.status(500).json({ message: 'Failed to send your message.' });
  }
});

// POST /inbox/messages/read  (marks the team's messages as read)
router.post('/inbox/messages/read', async (req, res) => {
  try {
    const [updated] = await InvestorMessage.update(
      { readAt: new Date() },
      { where: portalMessages(req.portalUser.id, { direction: 'outbound', readAt: null }) }
    );
    res.json({ updated });
  } catch (err) {
    console.error('Inbox mark-read error:', err);
    res.status(500).json({ message: 'Failed to update messages.' });
  }
});

/* ------------------------------- Documents ------------------------------- */

// GET /inbox/documents  (only documents staff made visible)
router.get('/inbox/documents', async (req, res) => {
  try {
    const investorId = req.portalUser.id;
    const docs = await InvestorDocument.findAll({
      where: { investorId, visibleToInvestor: true },
      order: [['createdAt', 'DESC']],
    });

    const investmentIds = [...new Set(docs.map((d) => d.investmentId).filter(Boolean))];
    const investments = investmentIds.length
      ? await Investment.findAll({ where: { id: investmentIds, investorId } })
      : [];
    const projectIds = [...new Set(investments.map((i) => i.projectId).filter(Boolean))];
    const projects = projectIds.length ? await Project.findAll({ where: { id: projectIds } }) : [];

    const projectMap = {};
    projects.forEach((p) => { projectMap[p.id] = p.name; });
    const investmentMap = {};
    investments.forEach((i) => {
      investmentMap[i.id] = {
        ref: i.investmentCode || `AGR-${i.id}`,
        projectName: projectMap[i.projectId] || 'General Business',
      };
    });

    res.json(
      docs.map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        originalName: d.originalName,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        createdAt: d.createdAt,
        agreementRef: investmentMap[d.investmentId]?.ref || null,
        projectName: investmentMap[d.investmentId]?.projectName || null,
      }))
    );
  } catch (err) {
    console.error('Inbox documents error:', err);
    res.status(500).json({ message: 'Failed to load documents.' });
  }
});

// GET /inbox/documents/:id/file
router.get('/inbox/documents/:id/file', async (req, res) => {
  try {
    const doc = await InvestorDocument.findOne({
      where: { id: req.params.id, investorId: req.portalUser.id, visibleToInvestor: true },
    });
    if (!doc) return res.status(404).json({ message: 'Document not found.' });

    const filePath = path.join(UPLOAD_DIR, path.basename(doc.fileName));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'This file is no longer available. Please contact us.' });
    }
    res.download(filePath, doc.originalName);
  } catch (err) {
    console.error('Inbox download error:', err);
    res.status(500).json({ message: 'Failed to download the document.' });
  }
});

/* --------------------------------- Notes --------------------------------- */

// GET /inbox/notes  (only notes shared by staff)
router.get('/inbox/notes', async (req, res) => {
  try {
    const rows = await InvestorNote.findAll({
      where: { investorId: req.portalUser.id, visibility: 'shared' },
      order: [['createdAt', 'DESC']],
    });
    res.json(rows.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt })));
  } catch (err) {
    console.error('Inbox notes error:', err);
    res.status(500).json({ message: 'Failed to load notes.' });
  }
});

/* -------------------------------- Activity -------------------------------- */

// GET /inbox/activity
// Built from the investor's own records instead of the staff log, so internal
// notes, hidden documents and call logs can never leak into this feed.
router.get('/inbox/activity', async (req, res) => {
  try {
    const investorId = req.portalUser.id;

    const [investments, payments, docs, messages, notes] = await Promise.all([
      Investment.findAll({ where: { investorId } }),
      InvestorPayment.findAll({ where: { investorId } }),
      InvestorDocument.findAll({ where: { investorId, visibleToInvestor: true } }),
      InvestorMessage.findAll({ where: portalMessages(investorId, { direction: 'outbound' }) }),
      InvestorNote.findAll({ where: { investorId, visibility: 'shared' } }),
    ]);

    const projectIds = [...new Set(investments.map((i) => i.projectId).filter(Boolean))];
    const projects = projectIds.length ? await Project.findAll({ where: { id: projectIds } }) : [];
    const projectMap = {};
    projects.forEach((p) => { projectMap[p.id] = p.name; });
    const investmentMap = {};
    investments.forEach((i) => { investmentMap[i.id] = i; });

    const projectNameOf = (inv) => (inv ? projectMap[inv.projectId] || 'General Business' : 'your investment');

    const events = [];

    investments.forEach((i) => {
      events.push({
        key: `inv-${i.id}`,
        type: 'investment',
        title: 'Investment recorded',
        detail: `${i.investmentCode || `AGR-${i.id}`} · ${projectNameOf(i)}`,
        amount: num(i.principalAmount),
        date: i.createdAt,
      });
    });

    payments.forEach((p) => {
      const inv = investmentMap[p.investmentId];
      const title =
        p.paymentType === 'principal_return'
          ? 'Capital returned'
          : p.paymentType === 'combined'
            ? 'Capital and profit paid'
            : 'Profit payout received';
      events.push({
        key: `pay-${p.id}`,
        type: 'payment',
        title,
        detail: `${projectNameOf(inv)} · ${p.paymentMethod || 'Bank'}`,
        amount: num(p.amount),
        date: p.createdAt,
      });
    });

    docs.forEach((d) => {
      events.push({
        key: `doc-${d.id}`,
        type: 'document',
        title: 'Document added',
        detail: d.title,
        amount: null,
        date: d.createdAt,
      });
    });

    messages.forEach((m) => {
      events.push({
        key: `msg-${m.id}`,
        type: 'message',
        title: 'New message from the Trikon team',
        detail: m.subject || null,
        amount: null,
        date: m.createdAt,
      });
    });

    notes.forEach((n) => {
      events.push({
        key: `note-${n.id}`,
        type: 'note',
        title: 'Note shared with you',
        detail: null,
        amount: null,
        date: n.createdAt,
      });
    });

    events.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(events.slice(0, 100));
  } catch (err) {
    console.error('Inbox activity error:', err);
    res.status(500).json({ message: 'Failed to load activity.' });
  }
});

module.exports = router;