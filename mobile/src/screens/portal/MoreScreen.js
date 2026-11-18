// "More" tab: the remaining portal pages for the signed-in role + logout.
import { Alert, View, Text } from 'react-native';
import {
  Bell, Receipt, MessageSquare, CalendarDays, Banknote, Clock, ClipboardList, User, LogOut,
  ChevronRight, Wallet, LineChart,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { Card, Row, Screen, T, Sub } from '../../components/ui';
import { colors } from '../../theme';
import { initials } from '../../utils/format';

const ITEMS = {
  employee: [
    ['Leave', 'Request day off / leave', CalendarDays],
    ['Advance', 'Advance salary / loan', Banknote],
    ['WorkLog', 'Work log & manual time', Clock],
    ['RequisitionsPage', 'Material requisitions', ClipboardList],
    ['Notifications', 'Notifications', Bell],
    ['EmployeeProfile', 'My profile & password', User],
  ],
  customer: [
    ['Notifications', 'Notifications', Bell],
  ],
  supplier: [
    ['InvoicesPage', 'Invoices', Receipt],
    ['RequestsPage', 'Requests', MessageSquare],
    ['Notifications', 'Notifications', Bell],
  ],
  investor: [
    ['InvestorPayments', 'Payouts received', Wallet],
    ['InvestorCompare', 'Projections', LineChart],
    ['InvestorProfile', 'Profile & password', User],
  ],
};
ITEMS.vendor = ITEMS.supplier;

export default function MoreScreen({ navigation }) {
  const { session, logout } = useAuth();
  const user = session?.user;
  const items = ITEMS[user?.role] || ITEMS.customer;

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);

  return (
    <Screen>
      <Card style={{ marginBottom: 16 }}>
        <Row gap={12}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.white, fontWeight: '700' }}>{initials(user?.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <T bold numberOfLines={1}>{user?.name}</T>
            <Sub>{user?.email || user?.username} · {String(user?.role || '').toUpperCase()}</Sub>
          </View>
        </Row>
      </Card>
      {items.map(([screen, label, Icon]) => (
        <Card key={screen} onPress={() => navigation.navigate(screen)} style={{ marginBottom: 10, paddingVertical: 14 }}>
          <Row>
            <Icon size={18} color={colors.text} />
            <T bold style={{ flex: 1 }}>{label}</T>
            <ChevronRight size={16} color={colors.faint} />
          </Row>
        </Card>
      ))}
      <Card onPress={confirmLogout} style={{ marginTop: 6, paddingVertical: 14 }}>
        <Row><LogOut size={18} color={colors.red} /><T bold style={{ color: colors.red }}>Log out</T></Row>
      </Card>
    </Screen>
  );
}
