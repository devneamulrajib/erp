const router = require('express').Router();
const auth = require('../middleware/auth');
const { Flat, Project, Site } = require('../models/associations');

function generateCode() {
  return 'F' + Math.floor(1000000 + Math.random() * 9000000);
}

router.get('/next-code', auth, async (req, res) => {
  res.json({ code: generateCode() });
});

router.get('/', auth, async (req, res) => {
  try {
    const { project, site, status } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (site) where.siteId = site;
    if (status) where.status = status;

    const flats = await Flat.findAll({
      where,
      include: [
        { model: Project, attributes: ['name'] },
        { model: Site, attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(flats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      project, site, flatLandNo, unit, bedroom, bathroom, size,
      price, parkingCost, utilityCharge, customer, status,
      drawing, dining, kitchen, balcony, parking, basement,
      facing, amenities, code,
    } = req.body;

    if (!project || !status) {
      return res.status(400).json({ message: 'Project and Status are required' });
    }

    const numPrice = Number(price) || 0;
    const numSize = Number(size) || 0;
    const subtotal = numPrice * numSize;
    const numParkingCost = Number(parkingCost) || 0;
    const numUtilityCharge = Number(utilityCharge) || 0;
    const grandTotal = subtotal + numParkingCost + numUtilityCharge;

    const flat = await Flat.create({
      code: code || generateCode(),
      projectId: project,
      siteId: site,
      flatLandNo, unit,
      bedroom: Number(bedroom) || 0,
      bathroom: Number(bathroom) || 0,
      size: numSize,
      price: numPrice,
      parkingCost: numParkingCost,
      utilityCharge: numUtilityCharge,
      subtotal,
      grandTotal,
      customer: customer || '',
      status,
      drawing, dining, kitchen, balcony, parking, basement, facing, amenities,
    });

    const populated = await Flat.findByPk(flat.id, {
      include: [
        { model: Project, attributes: ['name'] },
        { model: Site, attributes: ['name'] },
      ],
    });

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const flat = await Flat.findByPk(req.params.id);
    if (!flat) return res.status(404).json({ message: 'Not found' });

    if (req.body.project !== undefined) flat.projectId = req.body.project;
    if (req.body.site !== undefined) flat.siteId = req.body.site;

    const fields = [
      'flatLandNo', 'unit', 'bedroom', 'bathroom', 'size',
      'price', 'parkingCost', 'utilityCharge', 'customer', 'status',
      'drawing', 'dining', 'kitchen', 'balcony', 'parking', 'basement',
      'facing', 'amenities',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) flat[key] = req.body[key];
    });

    flat.subtotal = (Number(flat.price) || 0) * (Number(flat.size) || 0);
    flat.grandTotal = flat.subtotal + (Number(flat.parkingCost) || 0) + (Number(flat.utilityCharge) || 0);

    await flat.save();
    const populated = await Flat.findByPk(flat.id, {
      include: [
        { model: Project, attributes: ['name'] },
        { model: Site, attributes: ['name'] },
      ],
    });

    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Flat.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;