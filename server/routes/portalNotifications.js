const router = require('express').Router();
const { portalAuth } = require('../middleware/portalAuth');
const { Notification } = require('../models/associations');

// supplier + vendor share the 'supplier' audience; customer / employee use their own.
const audienceOf = (role) => (role === 'supplier' || role === 'vendor' ? 'supplier' : role);
const scope = (req) => ({
  audience: audienceOf(req.portalUser.role),
  audienceId: req.portalUser.customerId,
});

router.use(portalAuth);

router.get('/', async (req, res) => {
  try {
    const items = await Notification.findAll({
      where: scope(req),
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.count({ where: { ...scope(req), read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await Notification.update({ read: true }, { where: { ...scope(req), read: false } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const n = await Notification.findOne({ where: { id: req.params.id, ...scope(req) } });
    if (!n) return res.status(404).json({ message: 'Not found' });
    n.read = true;
    await n.save();
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;