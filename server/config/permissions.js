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

// Every ERP section that can be granted to a user from Settings > Team Members.
// Keep in sync with client/src/config/permissions.js (ACCESS_MODULES).
const MODULE_KEYS = [
  'dashboards', // company-wide dashboards (All / Project / Inventory / Accounts)
  'accounts', // Accounting: vouchers, billing, assets, office budget, reports
  'hrm', // HRM & payroll
  'inventory', // Inventory & procurement
  'project', // Projects, sites, flats, share project
  'requisition', // Material / service / fund requisitions
  'investors', // Investor management
  'crm', // CRM & leads
  'tasks', // Tasks & work log
  'support', // Support ticket desk
  'settings', // Team members (user management)
];

// Users.modules (TEXT, JSON array) -> array of valid module keys, or null.
// null / empty  = no explicit list -> the user keeps the role-based access above.
function normalizeModules(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(list)) return null;
  const clean = Array.from(new Set(list.map((k) => String(k).trim()).filter((k) => MODULE_KEYS.includes(k))));
  return clean.length ? clean : null;
}

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

function isAdminUser(userOrRole) {
  const roles = getAllUserRoles(userOrRole);
  return roles.includes('superadmin') || roles.includes('admin');
}

// The user's explicit section list (array) or null when they use role defaults.
function getExplicitModules(userOrRole) {
  if (!userOrRole || typeof userOrRole !== 'object') return null;
  return normalizeModules(userOrRole.modules);
}

function hasExplicitModules(userOrRole) {
  return !isAdminUser(userOrRole) && Boolean(getExplicitModules(userOrRole));
}

function canAccessModule(userOrRole, moduleKey) {
  const roles = getAllUserRoles(userOrRole);
  
  // If user has superadmin or admin, grant unrestricted access
  if (roles.includes('superadmin') || roles.includes('admin')) return true;

  // A user with an explicit section list sees exactly those sections.
  const explicit = getExplicitModules(userOrRole);
  if (explicit) return explicit.includes(moduleKey);

  // Otherwise, check if ANY of their assigned roles grants access to this module
  return roles.some((r) => {
    const allowed = ROLE_PERMISSIONS[r];
    if (allowed === 'ALL') return true;
    return Array.isArray(allowed) && allowed.includes(moduleKey);
  });
}

function canAccessAnyModule(userOrRole, moduleKeys = []) {
  return moduleKeys.some((k) => canAccessModule(userOrRole, k));
}

module.exports = {
  ROLE_PERMISSIONS,
  MODULE_KEYS,
  normalizeModules,
  getAllUserRoles,
  isAdminUser,
  getExplicitModules,
  hasExplicitModules,
  canAccessModule,
  canAccessAnyModule,
};
