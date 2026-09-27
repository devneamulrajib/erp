const router = require('express').Router();
const auth = require('../middleware/auth');
const { Notification } = require('../models/associations');

router.get('/', auth, async (req, res) => {
  try {
    const items = await Notification.findAll({
      where: { audience: 'admin' },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.count({ where: { audience: 'admin', read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread-count-by-type', auth, async (req, res) => {
  try {
    const items = await Notification.findAll({ where: { audience: 'admin', read: false }, attributes: ['type'] });
    const counts = {};
    items.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/read', auth, async (req, res) => {
  try {
    const n = await Notification.findByPk(req.params.id);
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.read = true;
    await n.save();
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/read-all', auth, async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { audience: 'admin', read: false } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;