const ChartOfGroup = require('../models/ChartOfGroup');

const ROOTS = [
  { code: '100', name: 'Assets' },
  { code: '200', name: 'Liability' },
  { code: '300', name: "Owner's Equity" },
  { code: '400', name: 'Income' },
  { code: '500', name: 'Expense' },
];

async function seedChartOfGroupRoots() {
  for (const root of ROOTS) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await ChartOfGroup.findOne({ code: root.code });
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await ChartOfGroup.create({ ...root, under: null, section: root.name });
      console.log(`Seeded root group: ${root.name}`);
    }
  }
}

module.exports = seedChartOfGroupRoots;