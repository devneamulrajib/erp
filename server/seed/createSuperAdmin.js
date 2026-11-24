const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function createSuperAdmin() {
  const { SUPERADMIN_NAME, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;

  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.log('No SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD set in .env — skipping superadmin seed.');
    return;
  }

  const existing = await User.findOne({ where: { email: SUPERADMIN_EMAIL } });

  if (existing) {
    // .env is the source of truth for this one account: after SUPERADMIN_PASSWORD
    // is rotated in .env, the next restart updates the stored hash (this replaced
    // the old login shortcut that compared the .env password directly).
    const updates = {};
    if (!(await bcrypt.compare(SUPERADMIN_PASSWORD, existing.password || ''))) {
      updates.password = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
    }
    if (existing.role !== 'superadmin') updates.role = 'superadmin';
    if (existing.isActive === false) updates.isActive = true;
    if (Object.keys(updates).length) {
      await existing.update(updates);
      console.log(`Superadmin synced from .env (${Object.keys(updates).join(', ')}): ${SUPERADMIN_EMAIL}`);
    } else {
      console.log(`Superadmin already exists: ${SUPERADMIN_EMAIL}`);
    }
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