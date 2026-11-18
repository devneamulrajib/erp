// Role-based navigation for the external portals, mirroring NAV_ITEMS in
// client/src/portal/components/PortalLayout.jsx and the investor layout.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  LayoutDashboard, Receipt, FileCheck2, MessageSquare, ShoppingCart, ClipboardList,
  CalendarCheck, ListChecks, TrendingUp, Briefcase, History, Mail, Menu,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import NotificationBell from '../components/NotificationBell';

import PortalDashboardScreen from '../screens/portal/PortalDashboardScreen';
import InvoicesScreen from '../screens/portal/InvoicesScreen';
import QuotesScreen from '../screens/portal/QuotesScreen';
import OrdersScreen from '../screens/portal/OrdersScreen';
import PurchaseOrderScreen from '../screens/portal/PurchaseOrderScreen';
import RequestsScreen from '../screens/portal/RequestsScreen';
import EarningsScreen from '../screens/portal/EarningsScreen';
import MaterialRequisitionsScreen from '../screens/portal/MaterialRequisitionsScreen';
import MaterialRequisitionScreen from '../screens/portal/MaterialRequisitionScreen';
import NotificationsScreen from '../screens/portal/NotificationsScreen';
import MoreScreen from '../screens/portal/MoreScreen';

import EmployeeDashboardScreen from '../screens/employee/EmployeeDashboardScreen';
import AttendanceScreen from '../screens/employee/AttendanceScreen';
import TasksScreen from '../screens/employee/TasksScreen';
import TaskDetailScreen from '../screens/employee/TaskDetailScreen';
import WorkLogScreen from '../screens/employee/WorkLogScreen';
import LeaveScreen from '../screens/employee/LeaveScreen';
import AdvanceScreen from '../screens/employee/AdvanceScreen';
import MyRequestsScreen from '../screens/employee/MyRequestsScreen';
import EmployeeProfileScreen from '../screens/employee/EmployeeProfileScreen';

import InvestorDashboardScreen from '../screens/investor/InvestorDashboardScreen';
import InvestmentsScreen from '../screens/investor/InvestmentsScreen';
import InvestmentDetailScreen from '../screens/investor/InvestmentDetailScreen';
import InvestorHistoryScreen from '../screens/investor/InvestorHistoryScreen';
import InvestorCompareScreen from '../screens/investor/InvestorCompareScreen';
import InvestorPaymentsScreen from '../screens/investor/InvestorPaymentsScreen';
import InvestorInboxScreen from '../screens/investor/InvestorInboxScreen';
import InvestorProfileScreen from '../screens/investor/InvestorProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Bottom tabs per role (max 5); everything else is reachable from "More".
const TABS = {
  employee: [
    ['Home', EmployeeDashboardScreen, LayoutDashboard, 'Dashboard'],
    ['Tasks', TasksScreen, ListChecks, 'My Tasks'],
    ['Attendance', AttendanceScreen, CalendarCheck, 'Attendance'],
    ['MyRequests', MyRequestsScreen, MessageSquare, 'My Requests', 'Requests'],
    ['More', MoreScreen, Menu, 'More'],
  ],
  customer: [
    ['Home', PortalDashboardScreen, LayoutDashboard, 'Dashboard'],
    ['Invoices', InvoicesScreen, Receipt, 'Invoices'],
    ['Quotes', QuotesScreen, FileCheck2, 'Quotes'],
    ['Requests', RequestsScreen, MessageSquare, 'Requests'],
    ['More', MoreScreen, Menu, 'More'],
  ],
  supplier: [
    ['Home', PortalDashboardScreen, LayoutDashboard, 'Dashboard'],
    ['Orders', OrdersScreen, ShoppingCart, 'Orders'],
    ['Requisitions', MaterialRequisitionsScreen, ClipboardList, 'Requisitions'],
    ['Earnings', EarningsScreen, TrendingUp, 'Earnings'],
    ['More', MoreScreen, Menu, 'More'],
  ],
  investor: [
    ['Home', InvestorDashboardScreen, LayoutDashboard, 'Overview'],
    ['Investments', InvestmentsScreen, Briefcase, 'Investments'],
    ['History', InvestorHistoryScreen, History, 'History'],
    ['Inbox', InvestorInboxScreen, Mail, 'Inbox'],
    ['More', MoreScreen, Menu, 'More'],
  ],
};
TABS.vendor = TABS.supplier;

function PortalTabs() {
  const { session } = useAuth();
  const role = session?.user?.role;
  const tabs = TABS[role] || TABS.customer;
  const accent = role === 'investor' ? colors.indigo : colors.primary;
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (role === 'investor' ? null : <NotificationBell />),
      }}
    >
      {tabs.map(([name, component, Icon, title, tabLabel]) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            title,
            tabBarLabel: tabLabel || title,
            tabBarIcon: ({ color, focused }) => <Icon size={21} color={color} strokeWidth={focused ? 2.4 : 2} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

export default function PortalNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false, headerTitleStyle: { fontWeight: '700' }, headerBackTitle: 'Back' }}>
      <Stack.Screen name="Tabs" component={PortalTabs} options={{ headerShown: false }} />
      {/* shared customer / supplier */}
      <Stack.Screen name="InvoicesPage" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="QuotesPage" component={QuotesScreen} options={{ title: 'Quotes' }} />
      <Stack.Screen name="RequestsPage" component={RequestsScreen} options={{ title: 'Requests' }} />
      <Stack.Screen name="OrdersPage" component={OrdersScreen} options={{ title: 'Purchase Orders' }} />
      <Stack.Screen name="EarningsPage" component={EarningsScreen} options={{ title: 'Earnings' }} />
      <Stack.Screen name="PurchaseOrder" component={PurchaseOrderScreen} options={{ title: 'Purchase Order' }} />
      <Stack.Screen name="RequisitionsPage" component={MaterialRequisitionsScreen} options={{ title: 'Material Requisitions' }} />
      <Stack.Screen name="MaterialRequisition" component={MaterialRequisitionScreen} options={{ title: 'Requisition' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      {/* employee */}
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: 'Task' }} />
      <Stack.Screen name="WorkLog" component={WorkLogScreen} options={{ title: 'Work Log' }} />
      <Stack.Screen name="Leave" component={LeaveScreen} options={{ title: 'Day Off / Leave' }} />
      <Stack.Screen name="Advance" component={AdvanceScreen} options={{ title: 'Advance / Loan' }} />
      <Stack.Screen name="MyRequestsPage" component={MyRequestsScreen} options={{ title: 'My Requests' }} />
      <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="AttendancePage" component={AttendanceScreen} options={{ title: 'Attendance' }} />
      {/* investor */}
      <Stack.Screen name="InvestmentDetail" component={InvestmentDetailScreen} options={{ title: 'Investment' }} />
      <Stack.Screen name="InvestorPayments" component={InvestorPaymentsScreen} options={{ title: 'Payouts' }} />
      <Stack.Screen name="InvestorCompare" component={InvestorCompareScreen} options={{ title: 'Projections' }} />
      <Stack.Screen name="InvestorProfile" component={InvestorProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="InvestorHistoryPage" component={InvestorHistoryScreen} options={{ title: 'History' }} />
    </Stack.Navigator>
  );
}
