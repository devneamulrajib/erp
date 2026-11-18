// Navigate to a portal page whether it is a bottom tab for this role or a stacked screen.
const TAB_KEYS = {
  employee: ['Home', 'Tasks', 'Attendance', 'MyRequests', 'More'],
  customer: ['Home', 'Invoices', 'Quotes', 'Requests', 'More'],
  supplier: ['Home', 'Orders', 'Requisitions', 'Earnings', 'More'],
  vendor: ['Home', 'Orders', 'Requisitions', 'Earnings', 'More'],
  investor: ['Home', 'Investments', 'History', 'Inbox', 'More'],
};
const STACK_ALIAS = {
  Invoices: 'InvoicesPage', Quotes: 'QuotesPage', Requests: 'RequestsPage', Orders: 'OrdersPage',
  Requisitions: 'RequisitionsPage', Earnings: 'EarningsPage', MyRequests: 'MyRequestsPage',
  Attendance: 'AttendancePage', History: 'InvestorHistoryPage',
};

export function navTo(navigation, role, key, params) {
  if ((TAB_KEYS[role] || []).includes(key)) navigation.navigate('Tabs', { screen: key, params });
  else navigation.navigate(STACK_ALIAS[key] || key, params);
}
