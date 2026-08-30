const router = require('express').Router();
const auth = require('../middleware/auth');
const ChartOfGroup = require('../models/ChartOfGroup');
const ChartOfAccount = require('../models/ChartOfAccount');

// Walk up the `under` chain to find the top-level section name.
async function resolveSection(underId) {
  if (!underId) return null;
  let current = await ChartOfGroup.findByPk(underId);
  if (!current) return null;
  while (current.underId) {
    // eslint-disable-next-line no-await-in-loop
    current = await ChartOfGroup.findByPk(current.underId);
    if (!current) break;
  }
  return current ? current.section || current.name : null;
}

router.get('/', auth, async (req, res) => {
  try {
    const groups = await ChartOfGroup.findAll({
      include: [{ model: ChartOfGroup, as: 'Under', attributes: ['name'] }],
      order: [['code', 'ASC']],
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Flat list for populating "Under" dropdowns.
router.get('/options', auth, async (req, res) => {
  try {
    const groups = await ChartOfGroup.findAll({
      attributes: ['id', 'code', 'name', 'underId'],
      order: [['code', 'ASC']],
    });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Nested tree of groups, each with its attached chart of accounts as leaves.
router.get('/hierarchy', auth, async (req, res) => {
  try {
    const groups = await ChartOfGroup.findAll({ order: [['code', 'ASC']], raw: true });
    const accounts = await ChartOfAccount.findAll({ order: [['code', 'ASC']], raw: true });

    const byParent = {};
    groups.forEach((g) => {
      const key = g.underId ? String(g.underId) : 'root';
      byParent[key] = byParent[key] || [];
      byParent[key].push(g);
    });

    const accountsByGroup = {};
    accounts.forEach((a) => {
      const key = String(a.chartOfGroupId);
      accountsByGroup[key] = accountsByGroup[key] || [];
      accountsByGroup[key].push(a);
    });

    function build(parentKey) {
      return (byParent[parentKey] || []).map((g) => ({
        id: g.id,
        code: g.code,
        name: g.name,
        type: 'group',
        children: build(String(g.id)),
        accounts: (accountsByGroup[String(g.id)] || []).map((a) => ({
          id: a.id,
          code: a.code,
          name: a.name,
          type: 'account',
        })),
      }));
    }

    res.json(build('root'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { code, name, under } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'Code and name are required' });

    const section = under ? await resolveSection(under) : name;

    const group = await ChartOfGroup.create({
      code,
      name,
      underId: under || null,
      section,
    });

    res.status(201).json(group);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Code already exists' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const group = await ChartOfGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });

    const { code, name, under } = req.body;
    if (code !== undefined) group.code = code;
    if (name !== undefined) group.name = name;
    if (under !== undefined) {
      group.underId = under || null;
      group.section = under ? await resolveSection(under) : group.name;
    }

    await group.save();
    res.json(group);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Code already exists' });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const hasChildGroups = await ChartOfGroup.findOne({ where: { underId: req.params.id } });
    if (hasChildGroups) {
      return res.status(400).json({ message: 'Cannot delete: this group has sub-groups under it' });
    }
    const hasAccounts = await ChartOfAccount.findOne({ where: { chartOfGroupId: req.params.id } });
    if (hasAccounts) {
      return res.status(400).json({ message: 'Cannot delete: this group has accounts under it' });
    }

    const deleted = await ChartOfGroup.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;