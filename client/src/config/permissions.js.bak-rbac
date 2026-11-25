// client/src/config/permissions.js
export const ROLE_PERMISSIONS = {
  superadmin: 'ALL',
  admin: 'ALL',
  manager: ['dashboards', 'project', 'inventory', 'requisition', 'accounts', 'hrm', 'crm'],
  accountant: ['dashboards', 'accounts', 'requisition', 'hrm'],
  storekeeper: ['dashboards', 'inventory', 'requisition'],
  sales: ['dashboards', 'crm'],
  hr: ['dashboards', 'hrm'],
  user: ['dashboards'],
};

export const ALL_ROLES = Object.keys(ROLE_PERMISSIONS);

export function getAllUserRoles(userOrRole) {
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

export function canAccessModule(userOrRole, moduleKey) {
  const roles = getAllUserRoles(userOrRole);
  if (roles.includes('superadmin') || roles.includes('admin')) return true;
  return roles.some((r) => {
    const allowed = ROLE_PERMISSIONS[r];
    if (allowed === 'ALL') return true;
    return Array.isArray(allowed) && allowed.includes(moduleKey);
  });
}

export function isApproverRole(userOrRole) {
  const roles = getAllUserRoles(userOrRole);
  return roles.includes('superadmin') || roles.includes('admin');
}

export function isAccountantRole(userOrRole) {
  const roles = getAllUserRoles(userOrRole);
  return roles.includes('accountant');
}

const ROUTE_MODULE_MAP = [
  ['/hrm-module', 'hrm'],
  ['/crm-module', 'crm'],
  ['/requisition-module', 'requisition'],
  ['/procurement-module', 'inventory'],
  ['/inventory-module', 'inventory'],
  ['/project-module', 'project'],
  ['/accounts-settings', 'accounts'],
  ['/accounts-module', 'accounts'],
  ['/billing', 'accounts'],
  ['/service', 'accounts'],
  ['/item/service-view', 'accounts'],
];

export function getModuleForPath(pathname) {
  const match = ROUTE_MODULE_MAP.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : null;
}