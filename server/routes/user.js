const router = require('express').Router();
const auth = require('../middleware/auth');
const { User } = require('../models/associations');

router.get('/', auth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'role', 'email'],
      order: [['name', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;