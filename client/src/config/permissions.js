export const ROLE_PERMISSIONS = {
  superadmin: 'ALL',
  admin: 'ALL',
  manager: ['dashboards', 'project', 'inventory', 'requisition', 'accounts', 'hrm', 'crm'],
  accountant: ['dashboards', 'accounts', 'requisition'],
  storekeeper: ['dashboards', 'inventory', 'requisition'],
  sales: ['dashboards', 'crm'],
  hr: ['dashboards', 'hrm'],
  user: ['dashboards'],
};

export const ALL_ROLES = Object.keys(ROLE_PERMISSIONS);

export function canAccessModule(role, moduleKey) {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  if (allowed === 'ALL') return true;
  return allowed.includes(moduleKey);
}

// Maps a route's path prefix to the module key it belongs to.
// Order matters — most specific prefixes first.
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
  return match ? match[1] : null; // null = unmapped/dashboard route, allowed by default
}