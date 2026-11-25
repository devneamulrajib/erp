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

// Every ERP section that can be granted in Settings > Team Members.
// Keep the keys in sync with server/config/permissions.js (MODULE_KEYS).
export const ACCESS_MODULES = [
  { key: 'accounts', label: 'Accounting', description: 'Vouchers, billing, assets, office budget, bank & reports' },
  { key: 'hrm', label: 'HRM & Payroll', description: 'Employees, salary, attendance, leave, pay slips, bonus' },
  { key: 'inventory', label: 'Inventory & Procurement', description: 'Products, purchases, purchase orders, stock, sales' },
  { key: 'project', label: 'Projects', description: 'Projects, sites, flats/land, agreements, share project' },
  { key: 'requisition', label: 'Requisition', description: 'Material, service/work and fund requisitions' },
  { key: 'investors', label: 'Investors', description: 'Investor list, investments, portfolio reports' },
  { key: 'crm', label: 'CRM', description: 'Leads, call center, visits, CRM setup' },
  { key: 'tasks', label: 'Tasks & Work Log', description: 'Live overview, all tasks, work log report' },
  { key: 'dashboards', label: 'Company Dashboards', description: 'All / Project / Inventory / Accounts overview dashboards' },
  { key: 'support', label: 'Support Desk', description: 'Handle support tickets from all users' },
  { key: 'settings', label: 'Settings', description: 'Team members & access (not admin accounts)' },
];
export const MODULE_KEYS = ACCESS_MODULES.map((m) => m.key);
export const MODULE_LABELS = Object.fromEntries(ACCESS_MODULES.map((m) => [m.key, m.label]));

export function normalizeModules(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let list = raw;
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(list)) return null;
  const clean = Array.from(new Set(list.filter((k) => MODULE_KEYS.includes(k))));
  return clean.length ? clean : null;
}

export function isAdminUser(userOrRole) {
  const roles = getAllUserRoles(userOrRole);
  return roles.includes('superadmin') || roles.includes('admin');
}

// Explicit section list for a (non-admin) user object, or null = role defaults.
export function getExplicitModules(userOrRole) {
  if (!userOrRole || typeof userOrRole !== 'object' || isAdminUser(userOrRole)) return null;
  return normalizeModules(userOrRole.modules);
}

export function hasExplicitModules(userOrRole) {
  return Boolean(getExplicitModules(userOrRole));
}

export function canAccessModule(userOrRole, moduleKey) {
  const roles = getAllUserRoles(userOrRole);
  if (roles.includes('superadmin') || roles.includes('admin')) return true;
  const explicit = getExplicitModules(userOrRole);
  if (explicit) return explicit.includes(moduleKey);
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
  // Section dashboards follow their section (the main /dashboard stays open).
  ['/dashboard/accountant', 'accounts'],
  ['/dashboard/accounts', 'accounts'],
  ['/dashboard/project', 'project'],
  ['/dashboard/inventory', 'inventory'],
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

export function canAccessAnyModule(userOrRole, moduleKeys = []) {
  return moduleKeys.some((k) => canAccessModule(userOrRole, k));
}

// Full route -> section map used for users with an explicit section list.
// First match wins, so specific prefixes come before general ones. A page
// passes when the user holds ANY of the listed sections.
const SECTION_ROUTE_MAP = [
  ['/dashboard/accountant', ['accounts']],
  ['/dashboard/accounts', ['dashboards', 'accounts']],
  ['/dashboard/project', ['dashboards', 'project']],
  ['/dashboard/inventory', ['dashboards', 'inventory']],
  ['/dashboard', ['dashboards']],
  ['/accounts-module/agreement_list', ['project', 'accounts']],
  ['/accounts-module/party_list', ['project', 'accounts']],
  ['/accounts-module/investor-accounts', ['accounts', 'investors']],
  ['/accounts-module/approval-center', ['accounts']],
  ['/inventory-module/flat', ['project', 'inventory']],
  ['/inventory-module/installment-report', ['project', 'inventory']],
  ['/inventory-module/bill-item', ['accounts', 'inventory']],
  ['/billing/item_sale_list', ['inventory', 'accounts']],
  ['/billing/item-sale-create', ['inventory', 'accounts']],
  ['/project-module', ['project']],
  ['/inventory-module', ['inventory']],
  ['/procurement-module', ['inventory']],
  ['/billing', ['accounts']],
  ['/service', ['accounts']],
  ['/item/service-view', ['accounts']],
  ['/accounts-settings', ['accounts']],
  ['/accounts-module', ['accounts']],
  ['/requisition-module', ['requisition']],
  ['/crm-module', ['crm']],
  ['/hrm-module/tasks', ['tasks', 'hrm']],
  ['/hrm-module/work-log', ['tasks', 'hrm']],
  ['/hrm-module', ['hrm']],
  ['/investors', ['investors']],
  ['/investments', ['investors']],
  ['/investor-reports', ['investors']],
  ['/settings', ['settings']],
  ['/support-tickets', ['support']],
];

export function getSectionsForPath(pathname) {
  const match = SECTION_ROUTE_MAP.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix));
  return match ? match[1] : null;
}

// Route guard decision for a staff user.
// - Users with an explicit section list: full section map above.
// - Everyone else: exactly the old behaviour (primary role, old prefix map).
export function canOpenPath(user, pathname) {
  if (!user) return true;
  if (hasExplicitModules(user)) {
    const sections = getSectionsForPath(pathname);
    return !sections || canAccessAnyModule(user, sections);
  }
  // Role defaults: primary role plus any extra roles (same as the server).
  const moduleKey = getModuleForPath(pathname);
  return !moduleKey || canAccessModule(user, moduleKey);
}

// Where a user lands after login / when a page is not allowed.
export function homePathFor(user) {
  if (hasExplicitModules(user) && !canAccessModule(user, 'dashboards')) return '/workspace';
  return '/dashboard';
}

// Admin-only pages that a section grant can also open (Team Members, Tickets).
export function canOpenAdminPage(user, sectionKey) {
  if (!user) return false;
  if (['superadmin', 'admin'].includes(user.role)) return true; // unchanged admin check
  return Boolean(sectionKey) && (getExplicitModules(user) || []).includes(sectionKey);
}

// Pages behind AdminOnlyRoute and the section that can also open them.
const ADMIN_PAGES = [
  ['/accounts-module/approval-center', null],
  ['/settings/users', 'settings'],
  ['/support-tickets', 'support'],
];

// Can this user open a link (button, card, quick action) to `path`?
// Same answer the route guards give, so we can hide what would bounce.
export function canOpenLink(user, path) {
  if (!path) return false;
  const pathname = String(path).split('?')[0];
  const admin = ADMIN_PAGES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  if (admin) return canOpenAdminPage(user, admin[1]);
  return canOpenPath(user, pathname);
}

// Stored staff user (localStorage), or null.
export function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}