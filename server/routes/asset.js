const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  Asset, AssetDepreciationEntry, AssetMovementEntry, AssetRevaluationEntry,
  Item, Project, ChartOfAccount,
} = require('../models/associations');

async function recalcValues(asset) {
  const entries = await AssetDepreciationEntry.findAll({ where: { assetId: asset.id } });
  const totalDepreciation = entries.reduce((sum, e) => sum + (e.depreciation || 0), 0);
  asset.bookValue = asset.originalValue - totalDepreciation;
  asset.depreciableValue = asset.originalValue - asset.notDepreciableValue - totalDepreciation;
}

const includeAll = [
  { model: AssetDepreciationEntry, as: 'depreciationEntries' },
  { model: AssetMovementEntry, as: 'movementEntries' },
  { model: AssetRevaluationEntry, as: 'revaluationEntries' },
];

router.get('/', auth, async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { model: Item, as: 'item', attributes: ['name'] },
        { model: Project, as: 'project', attributes: ['name'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: [
        { model: Item, as: 'item', attributes: ['name'] },
        { model: Project, as: 'project', attributes: ['name'] },
        { model: ChartOfAccount, as: 'expenseAccount', attributes: ['name'] },
        ...includeAll,
      ],
    });
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

    const asset = await Asset.create({
      itemId: item || null,
      location: location || '',
      originalValue,
      acquisitionDate,
      projectId: project || null,
      method: method || 'Straight Line',
      duration: duration || 0,
      durationUnit: durationUnit || 'Year',
      computation: computation || 'Yearly',
      notDepreciableValue: notDepreciableValue || 0,
      expenseAccountId: expenseAccount || null,
      voucherNo: voucherNo || '',
    });

    await recalcValues(asset);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const map = {
      item: 'itemId', project: 'projectId', expenseAccount: 'expenseAccountId',
    };
    const fields = [
      'item', 'location', 'originalValue', 'acquisitionDate', 'project',
      'method', 'duration', 'durationUnit', 'computation',
      'notDepreciableValue', 'expenseAccount', 'voucherNo', 'status',
    ];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) {
        const target = map[key] || key;
        asset[target] = req.body[key] || null;
      }
    });

    await recalcValues(asset);
    await asset.save();
    res.json(asset);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Asset.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Depreciation Board ---
router.post('/:id/depreciation', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const { date, reference, depreciation, journalEntry } = req.body;
    const priorEntries = await AssetDepreciationEntry.findAll({ where: { assetId: asset.id } });
    const priorCumulative = priorEntries.reduce((sum, e) => sum + (e.depreciation || 0), 0);
    const cumulativeDepreciation = priorCumulative + Number(depreciation || 0);

    await AssetDepreciationEntry.create({
      date,
      reference: reference || '',
      depreciation: Number(depreciation || 0),
      cumulativeDepreciation,
      depreciableValue: asset.originalValue - asset.notDepreciableValue - cumulativeDepreciation,
      journalEntry: journalEntry || '',
      assetId: asset.id,
    });

    await recalcValues(asset);
    await asset.save();

    const populated = await Asset.findByPk(asset.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Movement History ---
router.post('/:id/movement', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const { date, from, to } = req.body;
    await AssetMovementEntry.create({ date, from: from || '', to: to || '', assetId: asset.id });
    if (to) asset.location = to;

    await asset.save();
    const populated = await Asset.findByPk(asset.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Revaluations History ---
router.post('/:id/revaluation', auth, async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Not found' });

    const { date, newValue, note, revaluationType } = req.body;
    const oldValue = asset.originalValue;
    const change = Number(newValue || 0) - oldValue;

    await AssetRevaluationEntry.create({
      date, oldValue, newValue: Number(newValue || 0), change,
      revaluationType: revaluationType || '', note: note || '', assetId: asset.id,
    });
    asset.originalValue = Number(newValue || 0);
    await recalcValues(asset);

    await asset.save();
    const populated = await Asset.findByPk(asset.id, { include: includeAll });
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;