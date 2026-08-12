const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find().select('name role email').sort({ name: 1 });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users failed:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;