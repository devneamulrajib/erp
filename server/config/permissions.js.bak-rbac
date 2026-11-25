// server/config/permissions.js
const ROLE_PERMISSIONS = {
  superadmin: 'ALL',
  admin: 'ALL',
  manager: ['dashboards', 'project', 'inventory', 'requisition', 'accounts', 'hrm', 'crm'],
  accountant: ['dashboards', 'accounts', 'requisition', 'hrm'], // added hrm for payroll & salary
  storekeeper: ['dashboards', 'inventory', 'requisition'],
  sales: ['dashboards', 'crm'],
  hr: ['dashboards', 'hrm'],
  user: ['dashboards'],
};

// Extracts all active roles from either a role string or a user object
function getAllUserRoles(userOrRole) {
  if (!userOrRole) return ['user'];
  if (typeof userOrRole === 'string') return [userOrRole];
  
  const primary = userOrRole.role || 'user';
  let secondary = [];
  if (Array.isArray(userOrRole.roles)) {
    secondary = userOrRole.roles;
  } else if (typeof userOrRole.roles === 'string') {
    try { secondary = JSON.parse(userOrRole.roles); } catch { secondary = []; }
  }
  return Array.from(new Set([primary, ...secondary]));
}

function canAccessModule(userOrRole, moduleKey) {
  const roles = getAllUserRoles(userOrRole);
  
  // If user has superadmin or admin, grant unrestricted access
  if (roles.includes('superadmin') || roles.includes('admin')) return true;

  // Otherwise, check if ANY of their assigned roles grants access to this module
  return roles.some((r) => {
    const allowed = ROLE_PERMISSIONS[r];
    if (allowed === 'ALL') return true;
    return Array.isArray(allowed) && allowed.includes(moduleKey);
  });
}

module.exports = { ROLE_PERMISSIONS, canAccessModule, getAllUserRoles };