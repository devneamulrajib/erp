// Port of client/src/portal/pages/PortalDashboard.jsx (customer / supplier / vendor).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Wallet, ArrowRight, ShoppingCart, Clock, FileCheck2, MessageSquarePlus, CreditCard, FileBarChart, LifeBuoy, Receipt, CheckCircle2 } from 'lucide-react-native';
import { getPortalDashboard } from '../../portal/api/portalDashboard';
import { useAuth } from '../../context/AuthContext';
import { Badge, Card, ErrorBox, H1, Loading, Row, Screen, Sub, T, useAsync } from '../../components/ui';
import { colors, radius } from '../../theme';
import { money, fmtDate } from '../../utils/format';
import { navTo } from '../../utils/nav';

function invoiceStatus(inv) {
  const due = Number(inv.due || 0);
  const paid = Number(inv.paid || 0);
  if (due === 0 && paid > 0) return { label: 'Settled', Icon: CheckCircle2 };
  if (paid > 0) return { label: 'Partial', Icon: Receipt };
  return { label: 'Unpaid', Icon: Receipt };
}

export default function PortalDashboardScreen({ navigation }) {
  const { session } = useAuth();
  const user = session?.user;
  const role = user?.role;
  const { data, loading, error, refreshing, refresh, reload } = useAsync(getPortalDashboard);
  const isSupplier = role === 'supplier' || role === 'vendor';
  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const go = (key, params) => navTo(navigation, role, key, params);

  if (loading) return <Loading text="Loading your dashboard…" />;

  const cards = data?.cards || {};
  const quick = isSupplier
    ? [['Orders', ShoppingCart, 'Orders'], ['Requisitions', FileBarChart, 'Requisitions'], ['Invoices', CreditCard, 'Invoices'], ['Support', LifeBuoy, 'Requests']]
    : [['New Req', MessageSquarePlus, 'Requests'], ['Invoices', CreditCard, 'Invoices'], ['Quotes', FileBarChart, 'Quotes'], ['Support', LifeBuoy, 'Requests']];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ErrorBox message={error && 'Could not load your dashboard right now.'} onRetry={reload} />
      {data && (
        <>
          <Sub>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Sub>
          <H1>Welcome back, {firstName}</H1>
          <Sub style={{ marginBottom: 16 }}>{"Here's your account overview"}</Sub>

          <Card dark style={{ marginBottom: 14 }}>
            <Row><Wallet size={13} color="#cbd5e1" /><Text style={st.darkLabel}>Outstanding Balance</Text></Row>
            <Text style={st.big}>{money(cards.outstandingBalance)}</Text>
            {isSupplier && (
              <Pressable onPress={() => go('Earnings')} style={st.received}>
                <View>
                  <Text style={st.darkLabel}>Total Received</Text>
                  <Text style={{ color: '#6ee7b7', fontWeight: '700', fontSize: 16 }}>{money(cards.paidAmount)}</Text>
                </View>
                <ArrowRight size={16} color="#cbd5e1" />
              </Pressable>
            )}
            <Row style={{ marginTop: 16, justifyContent: 'space-between' }}>
              {quick.map(([label, Icon, key]) => (
                <Pressable key={label} onPress={() => go(key)} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
                  <View style={st.quickIcon}><Icon size={17} color={colors.white} /></View>
                  <Text style={{ color: '#e2e8f0', fontSize: 11 }}>{label}</Text>
                </Pressable>
              ))}
            </Row>
          </Card>

          <Text style={st.section}>Account Activity</Text>
          <Row style={{ marginBottom: 16 }} gap={10}>
            <Velocity label="Orders" value={cards.totalOrders} Icon={ShoppingCart} onPress={() => go(isSupplier ? 'Orders' : 'Invoices')} />
            <Velocity label="Requests" value={cards.pendingRequests} Icon={Clock} onPress={() => go(isSupplier ? 'Requisitions' : 'Requests')} pending={cards.pendingRequests > 0} />
            <Velocity label="Quotes" value={cards.pendingQuotations} Icon={FileCheck2} onPress={() => go(isSupplier ? 'Orders' : 'Quotes')} />
          </Row>

          <Row between style={{ marginBottom: 8 }}>
            <Text style={st.section}>Recent Invoices · {(data.recentInvoices || []).length}</Text>
            <Pressable onPress={() => go('Invoices')}><Text style={st.link}>View all</Text></Pressable>
          </Row>
          {(data.recentInvoices || []).length === 0 ? (
            <Card style={{ marginBottom: 16 }}><Sub>No invoices yet</Sub></Card>
          ) : (
            <Card style={{ marginBottom: 16, paddingVertical: 4 }}>
              {(data.recentInvoices || []).map((inv, i) => {
                const s = invoiceStatus(inv);
                return (
                  <Row key={inv.id} style={[st.listRow, i === data.recentInvoices.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={st.iconBox}><s.Icon size={16} color={colors.muted} /></View>
                    <View style={{ flex: 1 }}>
                      <Row gap={6}><T bold>{inv.code}</T><Badge status={s.label} /></Row>
                      <Sub>{fmtDate(inv.date)} · Paid {money(inv.paid)}</Sub>
                    </View>
                    <T bold>{money(inv.due)}</T>
                  </Row>
                );
              })}
            </Card>
          )}

          <Text style={[st.section, { marginBottom: 8 }]}>Recent Requests · {(data.recentRequests || []).length}</Text>
          {(data.recentRequests || []).length === 0 ? (
            <Card><Sub>No requests yet</Sub></Card>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {data.recentRequests.map((r, i) => (
                <Pressable key={r.id} onPress={() => (isSupplier ? navigation.navigate('MaterialRequisition', { id: r.id }) : go('Requests'))}>
                  <Row style={[st.listRow, i === data.recentRequests.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <T bold numberOfLines={1}>{r.subject || r.titleOfWork || 'Material Requisition'}</T>
                      <Sub>{r.code}</Sub>
                    </View>
                    <Badge status={r.status} />
                  </Row>
                </Pressable>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

function Velocity({ label, value, Icon, onPress, pending }) {
  return (
    <Pressable onPress={onPress} style={st.velocity}>
      <Row between><Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>{label}</Text><Icon size={14} color={colors.faint} /></Row>
      <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 6 }}>{value ?? 0}</Text>
      {pending ? <Text style={{ fontSize: 10, color: colors.amber, fontWeight: '700' }}>Pending</Text> : null}
    </Pressable>
  );
}

const st = StyleSheet.create({
  darkLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '500' },
  big: { color: colors.white, fontSize: 30, fontWeight: '700', marginTop: 6 },
  received: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  link: { fontSize: 12, fontWeight: '600', color: colors.muted },
  velocity: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 },
  listRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
