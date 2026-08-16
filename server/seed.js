const ProjectType = require('./models/ProjectType');

const seed = [
  { code: 'P4773027', name: 'Office' },
  { code: 'P7566761', name: 'Real Estate' },
  { code: 'P9579440', name: 'Construction' },
  { code: 'P2596945', name: "Architechtural & Interior Design" },
  { code: 'P1554959', name: 'Land Share' },
  { code: 'P7784999', name: 'Share Project' },
  { code: 'P1718818', name: 'Land Sell' },
];

ProjectType.bulkCreate(seed).then(() => console.log('Seeded ProjectType')).catch(console.error);