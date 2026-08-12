const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createSuperAdmin() {
  const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.log('No SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD set in .env — skipping superadmin seed.');
    return;
  }

  const existing = await User.findOne({ email: SUPERADMIN_EMAIL });

  if (existing) {
    console.log(`Superadmin already exists: ${SUPERADMIN_EMAIL}`);
    return;
  }

  const hashed = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

  await User.create({
    name: SUPERADMIN_NAME || 'Super Admin',
    email: SUPERADMIN_EMAIL,
    password: hashed,
    role: 'superadmin',
  });

  console.log(`Superadmin created: ${SUPERADMIN_EMAIL}`);
}

module.exports = createSuperAdmin;