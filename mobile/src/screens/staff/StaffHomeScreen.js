// Native home for ERP staff. The full admin ERP (~150 screens) opens inside an
// authenticated WebView (ErpWebViewScreen); tiles are filtered by role with the
// same permission map as the web app (src/utils/permissions.js).
import { Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import {
  LayoutDashboard, FolderKanban, Package, ShoppingCart, ClipboardList, Calculator, Receipt,
  Users, Contact, CheckSquare, LifeBuoy, PiggyBank, Settings, LogOut, Globe, BarChart3,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { canAccessModule } from '../../utils/permissions';
import { colors, radius } from '../../theme';
import { Card, Screen, Sub, Row, T } from '../../components/ui';
import { initials } from '../../utils/format';

const SECTIONS = [
  { title: 'Dashboards', module: 'dashboards', items: [
    ['Main Dashboard', '/dashboard', LayoutDashboard],
    ['Project Dashboard', '/dashboard/project', BarChart3, 'project'],
    ['Inventory Dashboard', '/dashboard/inventory', Package, 'inventory'],
    ['Accounts Dashboard', '/dashboard/accounts', Calculator, 'accounts'],
  ] },
  { title: 'Approvals', module: 'accounts', items: [['Approval Center', '/accounts-module/approval-center', CheckSquare]] },
  { title: 'Projects', module: 'project', items: [
    ['Projects', '/project-module/projects', FolderKanban],
    ['Sites', '/project-module/site', FolderKanban],
    ['Project Summary', '/project-module/reports/project-summary', BarChart3],
  ] },
  { title: 'Inventory & Procurement', module: 'inventory', items: [
    ['Flats', '/inventory-module/flat', Package],
    ['Flat Sales', '/inventory-module/flat-sale', Receipt],
    ['Purchases', '/inventory-module/purchase-list', ShoppingCart],
    ['Purchase Orders', '/procurement-module/purchase-order-list', ShoppingCart],
    ['Stock Report', '/inventory-module/reports/stock', BarChart3],
  ] },
  { title: 'Requisitions', module: 'requisition', items: [
    ['Material Requisitions', '/requisition-module/material-requisition-list', ClipboardList],
    ['Service Requisitions', '/requisition-module/service-work-requisition-list', ClipboardList],
    ['Fund Requisition', '/requisition-module/fund-requisition', PiggyBank],
  ] },
  { title: 'Accounts & Billing', module: 'accounts', items: [
    ['Chart of Accounts', '/accounts-module/chart-accounts', Calculator],
    ['Bills', '/billing/bill_list', Receipt],
    ['Expenses', '/accounts-module/expense_list', Receipt],
    ['Receipts', '/accounts-module/receipt-list', Receipt],
    ['Payments', '/accounts-module/payment-list', Receipt],
    ['Journal', '/accounts-module/journal_list', Calculator],
    ['Office Expense', '/accounts-module/office-expense-list', Receipt],
    ['Day Book', '/accounts-module/reports/day-book', BarChart3],
    ['Balance Sheet', '/accounts-module/reports/balance-sheet', BarChart3],
  ] },
  { title: 'HR', module: 'hrm', items: [
    ['Employees', '/hrm-module/employee', Users],
    ['Attendance Log', '/hrm-module/attendance-log', CheckSquare],
    ['Tasks', '/hrm-module/tasks', CheckSquare],
    ['Work Log', '/hrm-module/work-log', CheckSquare],
    ['Pay Slips', '/hrm-module/pay-slip', Receipt],
  ] },
  { title: 'CRM', module: 'crm', items: [
    ['Leads', '/crm-module/lead', Contact],
    ['Follow-ups', '/crm-module/call-center/follow-up', Contact],
  ] },
  { title: 'Investors', module: 'accounts', items: [
    ['Investor Dashboard', '/investors/dashboard', PiggyBank],
    ['Investors', '/investors', Users],
    ['Investments', '/investments', PiggyBank],
  ] },
  { title: 'Support', module: 'dashboards', items: [['Support Tickets', '/support-tickets', LifeBuoy]] },
];

export default function StaffHomeScreen({ navigation }) {
  const { session, logout } = useAuth();
  const user = session?.user;
  const open = (title, path) => navigation.navigate('ErpWeb', { title, path });

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen>
      <Card dark style={{ marginBottom: 16 }}>
        <Row gap={12}>
          <View style={st.avatar}><Text style={{ color: colors.text, fontWeight: '700' }}>{initials(user?.name)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>{user?.name || 'Team member'}</Text>
            <Text style={{ color: '#cbd5e1', fontSize: 12 }}>{user?.email} · {String(user?.role || '').toUpperCase()}</Text>
          </View>
        </Row>
        <Pressable style={st.fullBtn} onPress={() => open('Trikon ERP', '/dashboard')}>
          <Globe size={16} color={colors.text} />
          <Text style={{ fontWeight: '700', color: colors.text }}>Open full ERP</Text>
        </Pressable>
      </Card>

      {SECTIONS.filter((sec) => canAccessModule(user, sec.module)).map((sec) => {
        const items = sec.items.filter(([, , , mod]) => !mod || canAccessModule(user, mod));
        if (!items.length) return null;
        return (
          <View key={sec.title} style={{ marginBottom: 18 }}>
            <Text style={st.section}>{sec.title}</Text>
            <View style={st.grid}>
              {items.map(([label, path, Icon]) => (
                <Pressable key={path} style={({ pressed }) => [st.tile, pressed && { opacity: 0.7 }]} onPress={() => open(label, path)}>
                  <View style={st.tileIcon}><Icon size={18} color={colors.text} /></View>
                  <Text style={st.tileText} numberOfLines={2}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}

      {['superadmin', 'admin'].includes(user?.role) && (
        <Card onPress={() => open('Users', '/settings/users')} style={{ marginBottom: 12 }}>
          <Row><Settings size={18} color={colors.text} /><T bold>User management</T></Row>
        </Card>
      )}
      <Card onPress={confirmLogout}>
        <Row><LogOut size={18} color={colors.red} /><T bold style={{ color: colors.red }}>Log out</T></Row>
      </Card>
      <Sub style={{ textAlign: 'center', marginTop: 16 }}>ERP screens load from erp.mwm247.com inside the app.</Sub>
    </Screen>
  );
}

const st = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  fullBtn: { marginTop: 14, backgroundColor: colors.white, borderRadius: radius.md, paddingVertical: 11, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', flexGrow: 1, maxWidth: '32%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, minHeight: 86 },
  tileIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileText: { fontSize: 12, fontWeight: '600', color: colors.text2 },
});
