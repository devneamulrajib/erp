// Port of PortalPurchaseOrderView.jsx
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { CheckCircle2, Truck, PackageCheck, Download, BadgeCheck } from 'lucide-react-native';
import { getPortalPurchaseOrder, confirmPurchaseOrder, updateDeliveryStatus, downloadInvoice, confirmPaymentReceived } from '../../portal/api/portalPurchaseOrders';
import { Badge, Button, Card, ErrorBox, H1, H2, KV, Loading, ProgressBar, Row, Screen, Sub, T, Notice, useAsync } from '../../components/ui';
import { billAmounts, DELIVERY_STEPS } from '../../portal/poHelpers';
import { money, fmtDate, errMsg } from '../../utils/format';
import { colors } from '../../theme';

export default function PurchaseOrderScreen({ route }) {
  const { id } = route.params;
  const { data: order, setData: setOrder, loading, error, refreshing, refresh, reload } = useAsync(() => getPortalPurchaseOrder(id), [id]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  async function run(fn, fallback, merge = true) {
    setBusy(true);
    setActionError('');
    try {
      const updated = await fn();
      if (merge && updated && typeof updated === 'object') setOrder((o) => ({ ...o, ...updated }));
    } catch (err) {
      setActionError(errMsg(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  if (!order) return <Screen><ErrorBox message={error || 'Order not found'} onRetry={reload} /></Screen>;

  const amt = billAmounts(order);
  const paidPct = amt.total > 0 ? Math.min(100, Math.round((amt.paid / amt.total) * 100)) : 0;
  const step = DELIVERY_STEPS.indexOf(order.deliveryStatus || 'Pending');
  const history = (order.bill?.BillPayments || []).reduce((rows, p) => {
    const prev = rows.length ? rows[rows.length - 1].remaining : amt.total;
    const remaining = prev - (Number(p.amount) || 0);
    return [...rows, { ...p, remaining, balance: Math.max(remaining, 0) }];
  }, []);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ErrorBox message={actionError} />
      <Row between style={{ alignItems: 'flex-start', marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          <Sub>{order.code}</Sub>
          <H1>{order.titleOfWork || 'Purchase Order'}</H1>
        </View>
        <Badge status={order.status} />
      </Row>

      <Card style={{ marginBottom: 12 }}>
        <H2>Confirmation</H2>
        {order.status !== 'Acknowledged' ? (
          <Button style={{ marginTop: 10 }} title="Confirm Order" icon={<CheckCircle2 size={16} color="#fff" />} loading={busy}
            onPress={() => run(() => confirmPurchaseOrder(id), 'Failed to confirm order')} />
        ) : (
          <T style={{ marginTop: 6, color: colors.emerald }}>Confirmed{order.supplierConfirmedAt ? ` on ${fmtDate(order.supplierConfirmedAt)}` : ''}</T>
        )}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <H2>Delivery</H2>
        <Row style={{ marginVertical: 12 }} gap={6}>
          {DELIVERY_STEPS.map((s, i) => (
            <View key={s} style={{ flex: 1 }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= step ? colors.primary : colors.border }} />
              <T small style={{ marginTop: 4, color: i <= step ? colors.text : colors.faint }}>{s}</T>
            </View>
          ))}
        </Row>
        {order.status === 'Acknowledged' && step < DELIVERY_STEPS.length - 1 && (
          <Button title={`Mark as ${DELIVERY_STEPS[step + 1]}`} variant="outline" loading={busy}
            icon={step === 0 ? <Truck size={16} color={colors.text2} /> : <PackageCheck size={16} color={colors.text2} />}
            onPress={() => run(() => updateDeliveryStatus(id, DELIVERY_STEPS[step + 1]), 'Failed to update delivery status')} />
        )}
        {order.deliveryStatus === 'Delivered' && !order.deliveryConfirmedAt && <Notice tone="warn" message="Waiting for admin to confirm delivery." />}
        {order.deliveryConfirmedAt && <Notice message={`Delivery confirmed by admin on ${fmtDate(order.deliveryConfirmedAt)}.`} />}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <Row between><H2>Payment</H2><Badge status={amt.state} /></Row>
        <View style={{ marginVertical: 10 }}><ProgressBar value={paidPct} color={colors.emerald} /></View>
        <KV label="Order total" value={money(amt.total)} />
        <KV label="Paid" value={money(amt.paid)} />
        <KV label="Due" value={money(amt.due)} strong last />
        {order.convertedToBillId ? (
          <Button style={{ marginTop: 10 }} variant="outline" title="Download Invoice" icon={<Download size={16} color={colors.text2} />} loading={busy}
            onPress={() => run(() => downloadInvoice(id), 'Failed to download invoice', false)} />
        ) : null}
        {order.paymentStatus === 'Paid' && !order.supplierPaymentConfirmedAt && (
          <Button style={{ marginTop: 10 }} variant="success" title="Confirm Payment Received" icon={<BadgeCheck size={16} color="#fff" />} loading={busy}
            onPress={() => Alert.alert('Confirm payment received?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => run(() => confirmPaymentReceived(id), 'Failed to confirm payment') }])} />
        )}
        {order.supplierPaymentConfirmedAt && <T small style={{ marginTop: 8, color: colors.emerald }}>Payment confirmed on {fmtDate(order.supplierPaymentConfirmedAt)}</T>}
      </Card>

      {history.length > 0 && (
        <Card>
          <H2>Payment history</H2>
          {history.map((p, i) => (
            <Row key={p.id} between style={{ paddingVertical: 10, borderBottomWidth: i === history.length - 1 ? 0 : 1, borderBottomColor: colors.borderLight }}>
              <View style={{ flex: 1 }}>
                <T bold>{money(p.amount)}</T>
                <Sub>{fmtDate(p.date)} · {p.paymentMethod || '—'}{p.chequeReceiptNo ? ` · ${p.chequeReceiptNo}` : ''}</Sub>
              </View>
              <Sub>Bal {money(p.balance)}</Sub>
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}
