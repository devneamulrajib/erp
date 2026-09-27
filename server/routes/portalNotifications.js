const router = require('express').Router();
const { portalAuth, requireRole } = require('../middleware/portalAuth');
const { Notification } = require('../models/associations');

router.get('/', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const items = await Notification.findAll({
      where: { audience: 'supplier', audienceId: req.portalUser.customerId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread-count', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const count = await Notification.count({
      where: { audience: 'supplier', audienceId: req.portalUser.customerId, read: false },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/read', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    const n = await Notification.findOne({
      where: { id: req.params.id, audience: 'supplier', audienceId: req.portalUser.customerId },
    });
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.read = true;
    await n.save();
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/read-all', portalAuth, requireRole('supplier', 'vendor'), async (req, res) => {
  try {
    await Notification.update(
      { read: true },
      { where: { audience: 'supplier', audienceId: req.portalUser.customerId, read: false } },
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;