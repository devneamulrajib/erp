// Port of PortalOrdersPage.jsx (supplier / vendor purchase orders).
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { getPortalPurchaseOrders } from '../../portal/api/portalPurchaseOrders';
import { Badge, Card, Empty, ErrorBox, List, Loading, PageHeader, Row, Sub, T, useAsync } from '../../components/ui';
import { billAmounts, poActions } from '../../portal/poHelpers';
import { money, fmtDate } from '../../utils/format';
import { colors } from '../../theme';

export default function OrdersScreen({ navigation }) {
  const { data, loading, error, refreshing, refresh, reload } = useAsync(getPortalPurchaseOrders);
  if (loading) return <Loading />;
  const orders = Array.isArray(data) ? data : [];
  return (
    <List
      data={orders}
      refreshing={refreshing}
      onRefresh={refresh}
      header={<View><PageHeader title="Purchase Orders" subtitle="Acknowledge, ship and track payment" /><ErrorBox message={error} onRetry={reload} /></View>}
      empty={<Empty text="No purchase orders yet" />}
      renderItem={({ item: o }) => {
        const amt = billAmounts(o);
        const a = poActions(o);
        const action = a.needsAck ? 'Needs acknowledgement' : a.canShip ? 'Ready to ship' : a.canDeliver ? 'Mark delivered' : a.canConfirmPayment ? 'Confirm payment' : null;
        return (
          <Card onPress={() => navigation.navigate('PurchaseOrder', { id: o.id })}>
            <Row between>
              <View style={{ flex: 1 }}><T bold>{o.code}</T><Sub>{fmtDate(o.date)}</Sub></View>
              <Badge status={o.status} />
              <ChevronRight size={16} color={colors.faint} />
            </Row>
            <Row style={{ marginTop: 10, flexWrap: 'wrap' }} gap={6}>
              <Badge status={o.deliveryStatus || 'Pending'} label={`Delivery: ${o.deliveryStatus || 'Pending'}`} />
              <Badge status={amt.state} label={`${amt.state}${amt.state === 'Paid' && o.supplierPaymentConfirmedAt ? ' · Confirmed' : ''}`} />
            </Row>
            <Row between style={{ marginTop: 10 }}>
              <View><Sub>Total</Sub><T bold>{money(o.grandTotal)}</T></View>
              <View><Sub>Paid</Sub><T bold>{o.bill ? money(amt.paid) : '—'}</T></View>
              <View><Sub>Due</Sub><T bold>{o.bill ? money(amt.due) : '—'}</T></View>
            </Row>
            {action ? <T small style={{ color: colors.amber, marginTop: 8, fontWeight: '700' }}>Action: {action}</T> : null}
          </Card>
        );
      }}
    />
  );
}
