const { Op } = require('sequelize');

// Finds which portal-username attribute a model actually defines.
// Returns null if the model has none.
function usernameAttr(Model) {
  const attrs = (Model && Model.rawAttributes) || {};
  return ['portal_username', 'portalUsername'].find((key) => key in attrs) || null;
}

// Finds a record by portal username on any model, safely.
async function findByPortalUsername(Model, username, options = {}) {
  const attr = usernameAttr(Model);
  if (!attr) return null;
  return Model.findOne({ where: { [attr]: username }, ...options });
}

// Finds a record by email OR portal username, using only the columns the
// model really has. Returns null if the model has neither column.
async function findForLogin(Model, identifier) {
  const attrs = (Model && Model.rawAttributes) || {};
  const conditions = [];

  if ('email' in attrs) conditions.push({ email: identifier });
  const userAttr = usernameAttr(Model);
  if (userAttr) conditions.push({ [userAttr]: identifier });

  if (conditions.length === 0) return null;
  return Model.findOne({ where: { [Op.or]: conditions } });
}

module.exports = { usernameAttr, findByPortalUsername, findForLogin };