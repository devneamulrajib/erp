const router = require('express').Router();
const { portalAuth } = require('../middleware/portalAuth');
const { PortalRequest } = require('../models/associations');

function generateCode() {
  return 'PRQ' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/', portalAuth, async (req, res) => {
  try {
    const items = await PortalRequest.findAll({
      where: { customerId: req.portalUser.customerId },
      order: [['createdAt', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', portalAuth, async (req, res) => {
  try {
    const item = await PortalRequest.findOne({
      where: { id: req.params.id, customerId: req.portalUser.customerId },
    });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', portalAuth, async (req, res) => {
  try {
    const { subject, details } = req.body;
    if (!subject || !details) {
      return res.status(400).json({ message: 'Subject and details are required' });
    }
    const created = await PortalRequest.create({
      code: generateCode(),
      customerId: req.portalUser.customerId,
      subject,
      details,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;