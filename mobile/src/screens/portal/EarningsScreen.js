// Port of PortalEarnings.jsx (supplier payment track record).
import { useState } from 'react';
import { View } from 'react-native';
import { getPortalEarnings } from '../../portal/api/portalPurchaseOrders';
import { Card, DateField, Empty, ErrorBox, H2, Loading, PageHeader, Row, Screen, Stat, Sub, T, Button, useAsync } from '../../components/ui';
import { money, fmtDate } from '../../utils/format';
import { colors } from '../../theme';

export default function EarningsScreen({ navigation }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return getPortalEarnings(params);
  }, [from, to]);

  const s = data?.summary || {};
  const monthly = data?.monthly || [];
  const payments = data?.payments || [];
  const maxMonth = Math.max(1, ...monthly.map((m) => Number(m.received ?? m.value) || 0));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Earnings" subtitle="Everything we have paid you, month by month" />
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : (
        <>
          <Row gap={10} style={{ marginBottom: 10 }}>
            <Stat label="Total received" value={money(s.totalReceived)} tone={[colors.emerald, colors.emeraldSoft]} />
            <Stat label="Outstanding" value={money(s.outstanding)} tone={[colors.amber, colors.amberSoft]} />
          </Row>
          <Row gap={10} style={{ marginBottom: 16 }}>
            <Stat label="Total invoiced" value={money(s.totalInvoiced)} />
            <Stat label="Last payment" value={s.lastPaymentDate ? fmtDate(s.lastPaymentDate) : '—'} />
          </Row>

          {monthly.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <H2>Monthly received</H2>
              <Row style={{ alignItems: 'flex-end', height: 120, marginTop: 12 }} gap={4}>
                {monthly.map((m) => {
                  const v = Number(m.received ?? m.value) || 0;
                  return (
                    <View key={m.key || m.label} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: '70%', height: Math.max(2, (v / maxMonth) * 96), backgroundColor: v ? colors.emerald : colors.border, borderRadius: 4 }} />
                      <Sub style={{ fontSize: 9, marginTop: 4 }} numberOfLines={1}>{String(m.label || m.month || '').slice(0, 3)}</Sub>
                    </View>
                  );
                })}
              </Row>
            </Card>
          )}

          <H2 style={{ marginBottom: 8 }}>Payments received</H2>
          <Row gap={10}>
            <DateField label="From" value={from} onChange={setFrom} placeholder="Any" />
            <DateField label="To" value={to} onChange={setTo} placeholder="Any" />
          </Row>
          {(from || to) ? (
            <Row between style={{ marginBottom: 10 }}>
              <Sub>{s.rangeCount ?? payments.length} payments · {money(s.rangeTotal)}</Sub>
              <Button small variant="ghost" title="Clear" onPress={() => { setFrom(''); setTo(''); }} />
            </Row>
          ) : null}
          {payments.length === 0 ? <Empty text="No payments in this range" /> : payments.map((p) => (
            <Card key={p.id} style={{ marginBottom: 10 }} onPress={p.purchaseOrderId ? () => navigation.navigate('PurchaseOrder', { id: p.purchaseOrderId }) : undefined}>
              <Row between>
                <View style={{ flex: 1 }}>
                  <T bold style={{ color: colors.emerald }}>{money(p.amount)}</T>
                  <Sub>{fmtDate(p.date)} · {p.method || '—'}{p.chequeReceiptNo ? ` · ${p.chequeReceiptNo}` : ''}</Sub>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {p.purchaseOrderCode ? <Sub>PO {p.purchaseOrderCode}</Sub> : null}
                  {p.billCode ? <Sub>Bill {p.billCode}</Sub> : null}
                </View>
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
