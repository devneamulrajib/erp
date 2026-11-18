// Port of PortalInvestorInvestmentDetail.jsx
import { View } from 'react-native';
import { getInvestorInvestmentDetail } from '../../portal/api/portalInvestor';
import { Badge, Button, Card, ErrorBox, H1, H2, KV, Loading, Row, Screen, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { money, fmtDate } from '../../utils/format';
import { getReturnType, PAYOUT_TITLES, INVESTMENT_STATUS_LABEL } from '../../portal/investorHelpers';

export default function InvestmentDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => getInvestorInvestmentDetail(id).then((r) => r.data), [id]);
  if (loading) return <Loading />;
  if (!data) return <Screen><ErrorBox message={error ? 'Investment agreement could not be located.' : 'Unable to load investment details.'} onRetry={reload} /></Screen>;
  const m = data.metrics || {};
  const rt = getReturnType(data.investmentType);
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginBottom: 12 }}>
        <Row between><Sub>{data.agreementRef || `#${data.id}`}</Sub><Badge status={data.status} label={INVESTMENT_STATUS_LABEL[data.status] || data.status} /></Row>
        <H1 style={{ fontSize: 20, marginTop: 4 }}>{data.projectName}</H1>
        <T bold style={{ fontSize: 26, color: colors.indigo, marginTop: 8 }}>{money(data.amount)}</T>
        <View style={{ marginTop: 10, backgroundColor: colors.indigoSoft, borderRadius: 12, padding: 12 }}>
          <T bold style={{ color: colors.indigo }}>{rt.label}</T>
          {rt.description ? <Sub style={{ color: colors.text2, marginTop: 2 }}>{rt.description}</Sub> : null}
        </View>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <H2>Agreement</H2>
        <KV label="Invested on" value={fmtDate(data.investmentDate)} />
        <KV label="Maturity" value={fmtDate(data.maturityDate)} />
        <KV label="Expected profit" value={money(data.expectedProfit)} />
        <KV label="Expected return" value={money(data.expectedReturnAmount)} />
        <KV label="Total paid out" value={money(data.totalPaidOut)} strong last />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <H2>Returns so far</H2>
        <KV label="Capital returned" value={money(m.principalPaid)} />
        <KV label="Profit paid" value={money(m.profitPaid)} />
        <KV label="Capital remaining" value={money(m.remainingPrincipal)} />
        <KV label="Profit remaining" value={money(m.remainingProfit)} last />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <H2>Payouts</H2>
        {(data.payouts || []).length === 0 ? <Sub style={{ marginTop: 6 }}>No payouts yet.</Sub> : data.payouts.map((p, i) => (
          <Row key={p.id || i} between style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <View style={{ flex: 1 }}>
              <T bold>{PAYOUT_TITLES[p.paymentType] || 'Payout'}</T>
              <Sub>{fmtDate(p.paymentDate)} · {p.paymentMethod || '—'}</Sub>
            </View>
            <View style={{ alignItems: 'flex-end' }}><T bold style={{ color: colors.emerald }}>{money(p.amount)}</T>{p.status ? <Sub style={{ fontSize: 11 }}>{p.status}</Sub> : null}</View>
          </Row>
        ))}
      </Card>
      <Button variant="outline" title="See full history" onPress={() => navigation.navigate('InvestorHistoryPage', { investmentId: String(data.id) })} />
    </Screen>
  );
}
