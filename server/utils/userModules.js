// server/utils/userModules.js
// Read/write the optional Users.modules column (JSON list of ERP sections the
// user may open). Raw queries on purpose: if migrate-user-modules.js has not
// been run yet the column is missing, and then every user simply keeps the
// role-based access (reads return null) instead of login breaking.
const { QueryTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('../models/User');
const { normalizeModules } = require('../config/permissions');

const tableName = () => {
  const t = User.getTableName();
  return typeof t === 'string' ? t : t.tableName;
};

const MISSING_COLUMN = /unknown column|no such column/i;
let warned = false;
function warnMissing(err) {
  if (!warned && MISSING_COLUMN.test(err.message)) {
    warned = true;
    console.warn('Users.modules column not found - section access uses role defaults. Run: node migrate-user-modules.js');
  }
}

async function getModulesFor(id) {
  try {
    const rows = await sequelize.query(`SELECT modules FROM \`${tableName()}\` WHERE id = ? LIMIT 1`, {
      replacements: [id],
      type: QueryTypes.SELECT,
    });
    return rows.length ? normalizeModules(rows[0].modules) : null;
  } catch (err) {
    warnMissing(err);
    return null;
  }
}

// { [userId]: modules[] } for users that have an explicit list.
async function getModulesMap() {
  try {
    const rows = await sequelize.query(`SELECT id, modules FROM \`${tableName()}\``, {
      type: QueryTypes.SELECT,
    });
    const map = {};
    rows.forEach((r) => {
      const m = normalizeModules(r.modules);
      if (m) map[r.id] = m;
    });
    return map;
  } catch (err) {
    warnMissing(err);
    return {};
  }
}

// modules: array (explicit list) or null (role defaults).
async function setModulesFor(id, modules) {
  const value = modules && modules.length ? JSON.stringify(modules) : null;
  try {
    await sequelize.query(`UPDATE \`${tableName()}\` SET modules = ? WHERE id = ?`, {
      replacements: [value, id],
    });
  } catch (err) {
    if (MISSING_COLUMN.test(err.message)) {
      const e = new Error('Section access is not set up on this server yet. Run "node migrate-user-modules.js" in the server folder, then try again.');
      e.status = 503;
      throw e;
    }
    throw err;
  }
}

module.exports = { getModulesFor, getModulesMap, setModulesFor };
