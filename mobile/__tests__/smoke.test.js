/* global jest, describe, test, expect, afterAll */
// Render smoke test: every native screen mounts with realistic API data without crashing.
import { render, screen, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import portalApi from '../src/portal/api/portalAxios';
import api from '../src/api/axios';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-community/datetimepicker', () => ({ __esModule: true, default: () => null, DateTimePickerAndroid: { open: jest.fn() } }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => {}), deleteItemAsync: jest.fn(async () => {}) }));
jest.mock('expo-file-system', () => ({ File: function File() {}, Paths: { cache: '/tmp' } }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn() }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true })) }));

const inv = { id: 1, code: 'INV-1', date: '2026-11-01', due: 500, paid: 100, grandTotal: 600, status: 'Partial', purchaseOrderCode: 'PO-1', purchaseOrderId: 3 };
const po = { id: 3, code: 'PO-1', date: '2026-11-01', status: 'Acknowledged', deliveryStatus: 'Shipped', paymentStatus: 'Unpaid', grandTotal: 1000, titleOfWork: 'Cement', bill: { grandTotal: 1000, paid: 400, due: 600, BillPayments: [{ id: 1, amount: 400, date: '2026-11-02', paymentMethod: 'Cash' }] }, convertedToBillId: 9 };
const mr = { id: 4, code: 'MR-1', date: '2026-11-01', demandDate: '2026-11-10', status: 'Open', titleOfWork: 'Rods', project: { name: 'P' }, site: { name: 'S' }, items: [{ id: 11, itemName: 'Rod', demandQty: 5, unit: 'ton' }], quotations: [{ status: 'Submitted', subtotal: 50, items: [{ id: 1, materialRequisitionItemId: 11, itemName: 'Rod', offeredQty: 5, quotedRate: 10, available: true }] }] };
const task = { id: 7, title: 'Fix roof', status: 'In Progress', priority: 'High', confirmedAt: '2026-11-01', running: true, runningSince: new Date().toISOString(), priorWorkedSeconds: 60, estimatedMinutes: 30, progress: 40, subtasks: [{ id: 1, title: 'a', isCompleted: true, createdByType: 'employee' }], progressUpdates: [{ id: 1, percent: 40, note: 'n', createdAt: '2026-11-01' }], logs: [{ id: 1, startedAt: '2026-11-01T03:00:00Z', endedAt: null, source: 'timer' }], subtasksTotal: 1, subtasksDone: 1 };
const investment = { id: 5, projectName: 'Tower', amount: 100000, paidAmount: 50000, dueAmount: 50000, investmentDate: '2025-01-01', maturityDate: '2027-01-01', investmentType: 'fixed_return', status: 'active', agreementRef: 'AG-1' };

const ROUTES = [
  [/\/dashboard$/, { cards: { outstandingBalance: 1, paidAmount: 2, pendingQuotations: 1, pendingRequests: 1, totalOrders: 3 }, recentInvoices: [inv], recentRequests: [{ id: 1, code: 'R1', status: 'Open', subject: 'Hi' }] }],
  [/\/bills$|invoices\/list/, [inv]],
  [/\/quotes$/, [{ id: 1, code: 'Q1', date: '2026-11-01', grandTotal: 10, status: 'Submitted' }]],
  [/\/requests$/, [{ id: 1, code: 'R1', status: 'Open', subject: 'Hi', adminNote: 'ok' }]],
  [/purchase-orders\/earnings/, { summary: { totalReceived: 5, outstanding: 1 }, monthly: [{ key: 'a', label: 'Jan', received: 5 }], payments: [{ id: 1, amount: 5, date: '2026-11-01', method: 'Cash', purchaseOrderId: 3 }] }],
  [/purchase-orders\/\d+$/, po],
  [/purchase-orders$/, [po]],
  [/material-requisitions\/\d+$/, mr],
  [/material-requisitions$/, [mr]],
  [/notifications\/unread-count/, { count: 2 }],
  [/notifications$/, [{ id: 1, message: 'Hello', createdAt: '2026-11-01' }]],
  [/employee\/profile/, { name: 'Rahim Uddin', designation: 'Engineer', department: 'Civil', joiningDate: '2025-03-01', code: 'E1' }],
  [/attendance\/today/, { date: '2026-11-18', checkInAt: '2026-11-18T03:00:00Z', status: 'Present' }],
  [/attendance\/summary/, (cfg) => (cfg.params?.view === 'year' ? { view: 'year', counts: {}, months: [{ month: 1, present: 20 }] } : { view: 'month', today: '2026-11-18', counts: { present: 10, absent: 1, leave: 0 }, days: [{ date: '2026-11-10', status: 'Absent' }, { date: '2026-11-11', status: 'Present' }] })],
  [/salary\/months/, { year: 2026, currentYear: 2026, currentMonth: 11, months: [{ month: 10, status: 'Paid', slipId: 2 }] }],
  [/employee\/advances/, [{ id: 1, type: 'Loan', amount: 100, status: 'Pending', repaymentMonths: 2, createdAt: '2026-11-01' }]],
  [/leave-requests/, [{ id: 1, fromDate: '2026-11-01', toDate: '2026-11-02', days: 2, status: 'Approved', createdAt: '2026-11-01' }]],
  [/attendance-corrections/, [{ id: 1, date: '2026-11-10', reason: 'x', status: 'Pending', createdAt: '2026-11-11' }]],
  [/tasks\/running/, { taskId: 7, startedAt: new Date().toISOString(), priorWorkedSeconds: 0, task: { title: 'Fix roof', estimatedMinutes: 30 } }],
  [/tasks\/worklog/, { workedMinutes: 120, idleMinutes: 10, logs: [{ id: 1, taskTitle: 'Fix roof', startedAt: '2026-11-18T03:00:00Z', endedAt: '2026-11-18T04:00:00Z', source: 'manual' }] }],
  [/tasks\/\d+\/messages/, [{ id: 1, senderType: 'admin', senderName: 'Boss', message: 'hi', createdAt: '2026-11-01', attachments: [{ id: 1, fileName: 'a.pdf', filePath: '/uploads/a.pdf', mimeType: 'application/pdf' }] }]],
  [/tasks\/\d+$/, task],
  [/employee\/tasks$/, [task]],
  [/investor\/summary/, { investorName: 'Karim', totalInvested: 1, currentValue: 2, nextDue: { projectName: 'Tower', dueAmount: 5, dueDate: '2026-12-01', daysLeft: 13 }, recentInvestments: [investment] }],
  [/investor\/allocation/, { allocation: [{ project: 'Tower', totalAmount: 10, paidAmount: 5 }] }],
  [/investor\/history/, { events: [{ key: 'a', type: 'payment', title: 'Payout', amount: 5, date: '2026-10-01', projectName: 'Tower' }], investments: [{ id: 5, label: 'Tower' }], summary: { totalInvested: 1, totalReceived: 2 } }],
  [/investor\/compare/, { summary: { invested: 1 }, items: [{ id: 5, projectName: 'Tower', principal: 1 }], series: [{ date: '2026-01-01', expectedValue: 1 }, { date: '2027-01-01', expectedValue: 2 }], horizons: [{ key: '1y', label: '1 year', expectedValue: 2, expectedProfit: 1 }] }],
  [/investor\/investments\/\d+/, { ...investment, metrics: { principalPaid: 1 }, payouts: [{ id: 1, amount: 5, paymentDate: '2026-10-01', paymentType: 'profit_distribution' }] }],
  [/investor\/investments/, [investment]],
  [/investor\/payments/, { payments: [{ id: 1, projectName: 'Tower', amount: 5, paymentDate: '2026-10-01', paymentType: 'profit_distribution' }], totalAmount: 5 }],
  [/investor\/profile/, { name: 'Karim', email: 'k@x.com' }],
  [/inbox\/summary/, { unreadMessages: 1, documents: 1 }],
  [/inbox\/messages/, [{ id: 1, direction: 'outbound', body: 'Welcome', createdAt: '2026-11-01' }]],
];
const adapter = async (config) => {
  const url = config.url || '';
  const hit = ROUTES.find(([re]) => re.test(url));
  const data = hit ? (typeof hit[1] === 'function' ? hit[1](config) : hit[1]) : [];
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
portalApi.defaults.adapter = adapter;
api.defaults.adapter = adapter;

const Stack = createNativeStackNavigator();
function Harness({ component, params }) {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="S" component={component} initialParams={params} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const SCREENS = {
  'auth/LoginScreen': {}, 'staff/StaffHomeScreen': {}, 'staff/ErpWebViewScreen': { path: '/dashboard' },
  'portal/PortalDashboardScreen': {}, 'portal/InvoicesScreen': {}, 'portal/QuotesScreen': {}, 'portal/RequestsScreen': {},
  'portal/OrdersScreen': {}, 'portal/PurchaseOrderScreen': { id: 3 }, 'portal/EarningsScreen': {}, 'portal/MaterialRequisitionsScreen': {},
  'portal/MaterialRequisitionScreen': { id: 4 }, 'portal/NotificationsScreen': {}, 'portal/MoreScreen': {},
  'employee/EmployeeDashboardScreen': {}, 'employee/AttendanceScreen': {}, 'employee/TasksScreen': {}, 'employee/TaskDetailScreen': { id: 7 },
  'employee/WorkLogScreen': {}, 'employee/LeaveScreen': {}, 'employee/AdvanceScreen': {}, 'employee/MyRequestsScreen': {}, 'employee/EmployeeProfileScreen': {},
  'investor/InvestorDashboardScreen': {}, 'investor/InvestmentsScreen': {}, 'investor/InvestmentDetailScreen': { id: 5 }, 'investor/InvestorHistoryScreen': {},
  'investor/InvestorCompareScreen': {}, 'investor/InvestorPaymentsScreen': {}, 'investor/InvestorInboxScreen': {}, 'investor/InvestorProfileScreen': {},
};

const EXPECT = {
  'portal/PortalDashboardScreen': /INV-1/, 'portal/InvoicesScreen': /INV-1/, 'portal/OrdersScreen': /PO-1/, 'portal/PurchaseOrderScreen': /PO-1/,
  'portal/MaterialRequisitionScreen': /Rod/, 'employee/TasksScreen': /Fix roof/, 'employee/TaskDetailScreen': /Fix roof/,
  'employee/EmployeeDashboardScreen': /Rahim/, 'investor/InvestmentsScreen': /Tower/, 'investor/InvestmentDetailScreen': /Tower/,
  'investor/InvestorDashboardScreen': /Karim|Tower/, 'investor/InvestorInboxScreen': /Welcome/, 'portal/NotificationsScreen': /Hello/,
};

describe('screens render with API data', () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => errors.mockRestore());
  test.each(Object.entries(SCREENS))('%s', async (name, params) => {
    errors.mockClear();
    const Comp = require(`../src/screens/${name}`).default;
    const view = await render(<Harness component={Comp} params={params} />);
    await waitFor(() => expect(screen.queryByText(/^Loading/)).toBeNull(), { timeout: 3000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 50));
    const real = errors.mock.calls.filter((c) => !String(c[0]).includes('act(') && !String(c[0]).includes('not wrapped'));
    expect(real.map((c) => String(c[0]).slice(0, 300))).toEqual([]);
    expect(screen.root).toBeTruthy();
    if (EXPECT[name]) expect(screen.getAllByText(EXPECT[name]).length).toBeGreaterThan(0);
    await view.unmount();
  }, 30000);
});
