// Central place mapping each fixed role to the modules it can access.
// Module keys match the `key` values in client/src/components/navConfig.js.
// 'ALL' = unrestricted, including user management.

const ROLE_PERMISSIONS = {
  superadmin: 'ALL',
  admin: 'ALL',
  manager: ['dashboards', 'project', 'inventory', 'requisition', 'accounts', 'hrm', 'crm'],
  accountant: ['dashboards', 'accounts', 'requisition'],
  storekeeper: ['dashboards', 'inventory', 'requisition'],
  sales: ['dashboards', 'crm'],
  hr: ['dashboards', 'hrm'],
  user: ['dashboards'],
};

function canAccessModule(role, moduleKey) {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  if (allowed === 'ALL') return true;
  return allowed.includes(moduleKey);
}

module.exports = { ROLE_PERMISSIONS, canAccessModule };