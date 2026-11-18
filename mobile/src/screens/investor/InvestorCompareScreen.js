// Port of PortalInvestorCompare.jsx — projections per period. The web SVG chart is
// shown here as a compact bar list (same numbers from /investor/compare).
import { useState } from 'react';
import { View } from 'react-native';
import { getInvestorCompare } from '../../portal/api/portalInvestor';
import { Card, Empty, ErrorBox, H2, Loading, Row, Screen, Segmented, Stat, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { money, fmtDate } from '../../utils/format';

const PERIODS = [['6m', '6 months'], ['1y', '1 year'], ['3y', '3 years'], ['full', 'Till maturity']];

export default function InvestorCompareScreen() {
  const [period, setPeriod] = useState('1y');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => getInvestorCompare({ period }).then((r) => r.data), [period]);
  const s = data?.summary || {};
  const items = data?.items || [];
  const series = data?.series || [];
  const label = PERIODS.find(([k]) => k === period)?.[1];
  const maxV = Math.max(1, ...series.map((p) => Number(p.expectedValue) || 0));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented options={PERIODS} value={period} onChange={setPeriod} accent={colors.indigo} />
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : (
        <>
          <Row gap={10} style={{ marginBottom: 10 }}>
            <Stat label="Invested" value={money(s.invested)} tone={[colors.indigo, colors.indigoSoft]} />
            <Stat label="Received to date" value={money(s.receivedToDate)} tone={[colors.emerald, colors.emeraldSoft]} />
          </Row>
          <Card style={{ marginBottom: 14, backgroundColor: colors.indigo, borderColor: colors.indigo }}>
            <Sub style={{ color: '#c7d2fe' }}>{period === 'full' ? 'Expected at maturity' : `Expected in ${label}`}{data?.horizonDate ? ` · ${fmtDate(data.horizonDate)}` : ''}</Sub>
            <T bold style={{ color: '#fff', fontSize: 26, marginTop: 4 }}>{money(s.expectedValueAtHorizon)}</T>
            <Sub style={{ color: '#bbf7d0', marginTop: 2 }}>+{money(s.expectedProfitAtHorizon)} profit over this period{s.anyEstimated ? ' (some estimated)' : ''}</Sub>
          </Card>

          {series.length > 1 && (
            <Card style={{ marginBottom: 14 }}>
              <H2>Value over time</H2>
              <Row style={{ alignItems: 'flex-end', height: 120, marginTop: 12 }} gap={2}>
                {series.filter((_, i) => i % Math.ceil(series.length / 24) === 0).map((p, i) => (
                  <View key={i} style={{ flex: 1, height: Math.max(2, ((Number(p.expectedValue) || 0) / maxV) * 110), backgroundColor: colors.indigo, opacity: 0.35 + 0.65 * ((Number(p.expectedValue) || 0) / maxV), borderRadius: 3 }} />
                ))}
              </Row>
              <Row between style={{ marginTop: 4 }}><Sub style={{ fontSize: 10 }}>{fmtDate(series[0]?.date)}</Sub><Sub style={{ fontSize: 10 }}>{fmtDate(series[series.length - 1]?.date)}</Sub></Row>
            </Card>
          )}

          <H2 style={{ marginBottom: 8 }}>By investment</H2>
          {items.length === 0 ? <Empty text="No active investments to project." /> : items.map((it) => (
            <Card key={it.id} style={{ marginBottom: 10 }}>
              <Row between>
                <View style={{ flex: 1 }}><T bold numberOfLines={1}>{it.projectName}</T><Sub>{it.agreementRef || '—'}{it.maturityDate ? ` · matures ${fmtDate(it.maturityDate)}` : ''}</Sub></View>
                {it.estimated ? <Sub style={{ fontSize: 11, color: colors.amber }}>estimated</Sub> : null}
              </Row>
              <Row between style={{ marginTop: 8 }}>
                <View><Sub>Principal</Sub><T bold>{money(it.principal)}</T></View>
                <View><Sub>Received</Sub><T bold>{money(it.received)}</T></View>
                <View style={{ alignItems: 'flex-end' }}><Sub>Value</Sub><T bold style={{ color: colors.indigo }}>{money(it.valueAtHorizon)}</T></View>
              </Row>
              <Sub style={{ marginTop: 4, color: colors.emerald }}>+{money(it.profitAtHorizon)} profit</Sub>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
