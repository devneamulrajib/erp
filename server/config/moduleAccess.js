// server/config/moduleAccess.js
// Which ERP sections may call each /api/<mount>. Used by middleware/moduleGate.js
// for users that have an explicit section list (Users.modules). A request passes
// when the user holds ANY of the listed sections.
//
// The lists were built from the client: for every page, the API mounts that page
// (and the components it imports) calls, grouped by the section the page lives
// in. Shared lookups (projects, chart of accounts, items ...) therefore list
// several sections, so e.g. an Accounting-only user can still load the project
// dropdown on a voucher page.
//
// Mounts NOT listed here are open to every logged-in user (the router's own
// auth / role checks still apply): /auth, /users (own guard), /notifications,
// /support-tickets (everyone can raise a ticket), and all /portal/* routes.
const API_MODULES = {
  '/dashboard': ['dashboards', 'accounts', 'project', 'inventory'],
  '/activity-log': ['accounts'],
  '/approvals': ['accounts'],

  '/projects': ['accounts', 'crm', 'inventory', 'investors', 'project', 'requisition'],
  '/project-managers': ['project'],
  '/sites': ['accounts', 'inventory', 'project', 'requisition'],
  '/flats': ['crm', 'inventory', 'project'],
  '/flat-sales': ['inventory', 'project'],
  '/agreements': ['accounts', 'project'],
  '/sales': ['accounts', 'inventory'],
  '/quote': ['accounts'],
  '/customers': ['accounts', 'inventory', 'project'],

  '/leads': ['crm'],
  '/lead-category': ['crm'],
  '/lead-source': ['crm'],
  '/lead-stage': ['crm'],
  '/offer': ['crm'],
  '/campaign': ['crm'],
  '/communication-status': ['crm'],
  '/profession': ['crm'],
  '/area': ['crm', 'project'],

  '/category': ['accounts', 'inventory', 'requisition'],
  '/brand': ['accounts', 'inventory', 'requisition'],
  '/unit': ['accounts', 'inventory', 'requisition'],
  '/item': ['accounts', 'inventory', 'project', 'requisition'],
  '/bill-items': ['accounts', 'inventory'],
  '/service-items': ['accounts', 'requisition'],
  '/boq-titles': ['accounts'],
  '/assets': ['accounts'],
  '/purchase': ['inventory'],
  '/purchase-order': ['inventory'],
  '/material-usage': ['inventory'],
  '/stock-transfer': ['inventory'],
  '/material-requisitions': ['requisition'],
  '/service-requisitions': ['requisition'],
  '/fund-requisitions': ['requisition'],

  '/party': ['accounts'],
  '/party-list': ['accounts', 'project'],
  '/bill': ['accounts', 'inventory'],
  '/period-bill': ['accounts'],
  '/adjustment-bill': ['accounts'],
  '/labour-bill': ['accounts'],
  '/contractor-bill': ['accounts'],
  '/contractor-bill-report': ['accounts'],
  '/workorder': ['accounts'],
  '/contractor-workorder': ['accounts'],
  '/chart-of-group': ['accounts', 'inventory', 'investors'],
  '/chart-of-accounts': ['accounts', 'hrm', 'inventory', 'investors', 'requisition'],
  '/expenses': ['accounts'],
  '/office-expenses': ['accounts'],
  '/budget-categories': ['accounts', 'hrm', 'requisition'],
  '/monthly-budgets': ['accounts', 'hrm'],
  '/bank-accounts': ['accounts'],
  '/vouchers': ['accounts', 'dashboards'],
  '/journal-vouchers': ['accounts'],
  '/contra-vouchers': ['accounts'],
  '/accounting-reports': ['accounts'],
  '/deposit-withdrawals': ['accounts'],

  '/employee': ['hrm', 'inventory', 'tasks'],
  '/payslip': ['accounts', 'hrm'],
  '/attendance-corrections': ['hrm'],
  '/tasks': ['hrm', 'tasks'],
  '/assign-share': ['project'],
  '/investor-management': ['investors'],
};

module.exports = { API_MODULES };
