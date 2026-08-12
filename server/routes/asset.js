const router = require('express').Router();
const auth = require('../middleware/auth');
const Asset = require('../models/Asset');

function recalcValues(asset) {
  const totalDepreciation = asset.depreciationEntries.reduce((sum, e) => sum + (e.depreciation || 0), 0);
  asset.bookValue = asset.originalValue - totalDepreciation;
  asset.depreciableValue = asset.originalValue - asset.notDepreciableValue - totalDepreciation;
}

router.get('/', auth, async (req, res) => {
  try {
    const assets = await Asset.find()
      .populate('item', 'name')
      .populate('project', 'name')
      .sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id)
      .populate('item', 'name')
      .populate('project', 'name')
      .populate('expenseAccount', 'name');
    if (!asset) return res.status(404).json({ message: 'Not found' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const {
      item, location, originalValue, acquisitionDate, project,
      method, duration, durationUnit, computation,
      notDepreciableValue, expenseAccount, voucherNo,
    } = req.body;

    if (!originalValue || !acquisitionDate) {
      return res.status(400).json({ message: 'Original Value and Acquisition Date are required' });
    }

    const asset = new Asset({
      item: item || null,
      location: location || '',
      originalValue,
      acquisitionDate,
      project: project || null,
      method: method || 'Straight Line',
      duration: duration || 0,
      durationUnit: durationUnit || 'Year',
      computation: computation || 'Yearly',
      notDepreciableValue: notDepreciableValue || 0,
      expenseAccount: expenseAccount || null,
      voucherNo: voucherNo || '',
    });

    recalcValues(asset);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const fields = [
      'item', 'location', 'originalValue', 'acquisitionDate', 'project',
      'method', 'duration', 'durationUnit', 'computation',
      'notDepreciableValue', 'expenseAccount', 'voucherNo', 'status',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) asset[key] = req.body[key] || null;
    });

    recalcValues(asset);
    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Asset.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Depreciation Board ---
router.post('/:id/depreciation', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const { date, reference, depreciation, journalEntry } = req.body;
    const priorCumulative = asset.depreciationEntries.reduce((sum, e) => sum + (e.depreciation || 0), 0);
    const cumulativeDepreciation = priorCumulative + Number(depreciation || 0);

    asset.depreciationEntries.push({
      date,
      reference: reference || '',
      depreciation: Number(depreciation || 0),
      cumulativeDepreciation,
      depreciableValue: asset.originalValue - asset.notDepreciableValue - cumulativeDepreciation,
      journalEntry: journalEntry || '',
    });

    recalcValues(asset);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Movement History ---
router.post('/:id/movement', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const { date, from, to } = req.body;
    asset.movementEntries.push({ date, from: from || '', to: to || '' });
    if (to) asset.location = to;

    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Revaluations History ---
router.post('/:id/revaluation', auth, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const { date, newValue, note } = req.body;
    const oldValue = asset.originalValue;
    const change = Number(newValue || 0) - oldValue;

    asset.revaluationEntries.push({ date, oldValue, newValue: Number(newValue || 0), change, note: note || '' });
    asset.originalValue = Number(newValue || 0);
    recalcValues(asset);

    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;