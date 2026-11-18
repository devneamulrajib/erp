// Port of PortalInvestorHistory.jsx — deposits, payouts and maturity events grouped by month.
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { getInvestorHistory } from '../../portal/api/portalInvestor';
import { Badge, Button, Card, DateField, Empty, ErrorBox, Loading, Row, Screen, Segmented, Select, Stat, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { money, fmtDate } from '../../utils/format';

const TYPE_TABS = [['all', 'All'], ['investment', 'Investments'], ['payment', 'Payouts'], ['maturity', 'Maturity']];
const TYPE_LABEL = { investment: ['Deposit', [colors.indigo, colors.indigoSoft]], payment: ['Payout', [colors.emerald, colors.emeraldSoft]], maturity: ['Maturity', [colors.amber, colors.amberSoft]] };

export default function InvestorHistoryScreen({ route }) {
  const [type, setType] = useState('all');
  const [investmentId, setInvestmentId] = useState(route.params?.investmentId || 'all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => {
    const params = { type };
    if (investmentId !== 'all') params.investmentId = investmentId;
    if (from) params.from = from;
    if (to) params.to = to;
    return getInvestorHistory(params).then((r) => r.data);
  }, [type, investmentId, from, to]);

  const grouped = useMemo(() => {
    const g = [];
    (data?.events || []).forEach((ev) => {
      const d = new Date(ev.date);
      const label = Number.isNaN(d.getTime()) ? 'Undated' : d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const last = g[g.length - 1];
      if (last && last.label === label) last.items.push(ev); else g.push({ label, items: [ev] });
    });
    return g;
  }, [data]);
  const invOptions = [{ value: 'all', label: 'All investments' }, ...(data?.investments || []).map((i) => ({ value: String(i.id), label: i.label }))];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented options={TYPE_TABS} value={type} onChange={setType} accent={colors.indigo} />
      <Select value={investmentId} onChange={(v) => setInvestmentId(String(v))} options={invOptions} />
      <Row gap={10}>
        <DateField label="From" value={from} onChange={setFrom} placeholder="Any" />
        <DateField label="To" value={to} onChange={setTo} placeholder="Any" />
      </Row>
      {(from || to || investmentId !== 'all' || type !== 'all') ? (
        <Button small variant="ghost" title="Reset filters" onPress={() => { setType('all'); setInvestmentId('all'); setFrom(''); setTo(''); }} style={{ alignSelf: 'flex-start', marginBottom: 8 }} />
      ) : null}
      <ErrorBox message={error && 'We could not load your history. Please try again.'} onRetry={reload} />
      {data?.summary && (
        <Row gap={10} style={{ marginBottom: 14 }}>
          <Stat label="Invested" value={money(data.summary.totalInvested)} tone={[colors.indigo, colors.indigoSoft]} />
          <Stat label="Received" value={money(data.summary.totalReceived)} tone={[colors.emerald, colors.emeraldSoft]} />
        </Row>
      )}
      {loading && !data ? <Loading /> : grouped.length === 0 ? <Empty text="No activity for these filters." /> : grouped.map((group) => (
        <View key={group.label} style={{ marginBottom: 14 }}>
          <Sub style={{ fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', fontSize: 11 }}>{group.label}</Sub>
          <Card style={{ paddingVertical: 4 }}>
            {group.items.map((ev, i) => {
              const [lbl, tone] = TYPE_LABEL[ev.type] || [ev.type, undefined];
              return (
                <View key={ev.key || i} style={{ paddingVertical: 10, borderBottomWidth: i === group.items.length - 1 ? 0 : 1, borderBottomColor: colors.borderLight }}>
                  <Row between>
                    <View style={{ flex: 1 }}>
                      <Row gap={6}><Badge label={lbl} tone={tone} />{ev.upcoming ? <Badge label="Upcoming" status="Pending" /> : null}</Row>
                      <T bold style={{ marginTop: 4 }} numberOfLines={1}>{ev.title}</T>
                      <Sub>{ev.projectName}{ev.agreementRef ? ` · ${ev.agreementRef}` : ''} · {fmtDate(ev.date)}</Sub>
                      {ev.type === 'payment' && (Number(ev.principalPaid) || Number(ev.profitPaid)) ? (
                        <Sub style={{ fontSize: 11 }}>Capital {money(ev.principalPaid)} · Profit {money(ev.profitPaid)}{ev.method ? ` · ${ev.method}` : ''}</Sub>
                      ) : null}
                      {ev.referenceNo ? <Sub style={{ fontSize: 11 }}>Ref {ev.referenceNo}</Sub> : null}
                    </View>
                    <T bold style={{ color: ev.type === 'payment' ? colors.emerald : colors.text }}>{money(ev.amount)}</T>
                  </Row>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </Screen>
  );
}
