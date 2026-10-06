// server/routes/notifications.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const { Notification } = require('../models/associations');

// Build query condition based on the user's role and user ID
function getAudienceFilter(user) {
  const role = user?.role || 'user';
  const userId = user?.id || null;

  if (['superadmin', 'admin'].includes(role)) {
    return {
      [Op.or]: [
        { audience: 'admin' },
        ...(userId ? [{ audience: 'user', audienceId: userId }] : []),
      ],
    };
  }

  if (role === 'accountant') {
    return {
      [Op.or]: [
        { audience: 'accountant' },
        ...(userId ? [{ audience: 'user', audienceId: userId }] : []),
      ],
    };
  }

  return {
    [Op.or]: [
      { audience: role },
      ...(userId ? [{ audience: 'user', audienceId: userId }] : []),
    ],
  };
}

router.get('/', auth, async (req, res) => {
  try {
    const where = getAudienceFilter(req.user);
    const items = await Notification.findAll({
      where,
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
    const where = { ...getAudienceFilter(req.user), read: false };
    const count = await Notification.count({ where });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/unread-count-by-type', auth, async (req, res) => {
  try {
    const where = { ...getAudienceFilter(req.user), read: false };
    const items = await Notification.findAll({ where, attributes: ['type'] });
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
    const where = { ...getAudienceFilter(req.user), read: false };
    await Notification.update({ read: true }, { where });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;