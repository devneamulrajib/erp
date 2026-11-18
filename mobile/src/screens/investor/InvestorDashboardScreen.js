// Port of PortalInvestorDashboard.jsx ("Quiet Wealth" investor overview).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react-native';
import { getInvestorSummary, getInvestorAllocation, getInvestorHistory, getInvestorCompare } from '../../portal/api/portalInvestor';
import { Badge, Card, ErrorBox, H2, Loading, ProgressBar, Row, Screen, Stat, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { money, fmtDate } from '../../utils/format';
import { getReturnType, INVESTMENT_STATUS_LABEL } from '../../portal/investorHelpers';

export default function InvestorDashboardScreen({ navigation }) {
  const [hidden, setHidden] = useState(false);
  const amt = (n) => (hidden ? '৳ •••••' : money(n));
  const { data, loading, error, refreshing, refresh, reload } = useAsync(async () => {
    const [sumRes, allocRes, histRes, cmpRes] = await Promise.allSettled([getInvestorSummary(), getInvestorAllocation(), getInvestorHistory({ limit: 6 }), getInvestorCompare({ period: '1y' })]);
    if (sumRes.status === 'rejected') throw sumRes.reason;
    return {
      summary: sumRes.value.data,
      allocation: allocRes.status === 'fulfilled' ? allocRes.value.data?.allocation || [] : [],
      activity: histRes.status === 'fulfilled' ? histRes.value.data?.events || [] : [],
      horizons: cmpRes.status === 'fulfilled' ? cmpRes.value.data?.horizons || [] : [],
    };
  });

  if (loading) return <Loading />;
  if (!data) return <Screen><ErrorBox message={error || 'Could not load your portfolio.'} onRetry={reload} /></Screen>;
  const { summary: s, allocation, activity, horizons } = data;
  const firstName = (s?.investorName || '').split(' ')[0] || 'Investor';
  const nextDue = s?.nextDue;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row between style={{ marginBottom: 12 }}>
        <View>
          <Sub>Welcome back</Sub>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.text }}>{firstName}</Text>
        </View>
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>{hidden ? <EyeOff size={20} color={colors.muted} /> : <Eye size={20} color={colors.muted} />}</Pressable>
      </Row>

      <Card style={{ marginBottom: 12, backgroundColor: colors.indigo, borderColor: colors.indigo }}>
        <Text style={{ color: '#c7d2fe', fontSize: 12 }}>Current portfolio value</Text>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '700', marginTop: 4 }}>{amt(s?.currentValue)}</Text>
        <Row style={{ marginTop: 10 }} gap={14}>
          <View><Text style={{ color: '#c7d2fe', fontSize: 11 }}>Invested</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{amt(s?.totalInvested)}</Text></View>
          <View><Text style={{ color: '#c7d2fe', fontSize: 11 }}>Profit earned</Text><Text style={{ color: '#bbf7d0', fontWeight: '700' }}>{amt(s?.profitEarned)}</Text></View>
          <View><Text style={{ color: '#c7d2fe', fontSize: 11 }}>ROI</Text><Text style={{ color: '#fff', fontWeight: '700' }}>{Number(s?.roiPercentage || 0).toFixed(1)}%</Text></View>
        </Row>
      </Card>

      <Row gap={10} style={{ marginBottom: 10 }}>
        <Stat label="Payouts received" value={amt(s?.payoutsReceived)} tone={[colors.emerald, colors.emeraldSoft]} />
        <Stat label="Pending" value={amt(s?.pendingAmount)} tone={[colors.amber, colors.amberSoft]} />
      </Row>
      <Row gap={10} style={{ marginBottom: 14 }}>
        <Stat label="Active projects" value={s?.activeProjectsCount ?? 0} />
        <Stat label="Investments" value={s?.totalInvestmentsCount ?? 0} />
      </Row>

      {nextDue && (
        <Card style={{ marginBottom: 14, borderColor: nextDue.overdue ? '#fecaca' : colors.border }}>
          <Row gap={8}><AlertCircle size={16} color={nextDue.overdue ? colors.red : colors.amber} /><T bold>{nextDue.overdue ? 'Payment overdue' : 'Next payment due'}</T></Row>
          <T style={{ marginTop: 6 }}>{nextDue.projectName}: <T bold>{amt(nextDue.dueAmount)}</T></T>
          <Sub>{fmtDate(nextDue.dueDate)}{nextDue.daysLeft != null ? ` · ${nextDue.overdue ? `${Math.abs(nextDue.daysLeft)} days late` : `${nextDue.daysLeft} days left`}` : ''}</Sub>
        </Card>
      )}

      {horizons.length > 0 && (
        <Card style={{ marginBottom: 14 }} onPress={() => navigation.navigate('InvestorCompare')}>
          <Row between><H2>Projected value</H2><ArrowRight size={16} color={colors.muted} /></Row>
          {horizons.map((h) => (
            <Row key={h.key || h.label} between style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <View><T bold>{h.label}</T>{h.date ? <Sub>{fmtDate(h.date)}</Sub> : null}</View>
              <View style={{ alignItems: 'flex-end' }}><T bold>{amt(h.expectedValue)}</T><Sub style={{ color: colors.emerald }}>+{amt(h.expectedProfit)}</Sub></View>
            </Row>
          ))}
        </Card>
      )}

      {allocation.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <H2>Capital allocation</H2>
          {allocation.map((row) => {
            const pct = row.totalAmount > 0 ? Math.min(Math.round((row.paidAmount / row.totalAmount) * 100), 100) : 0;
            return (
              <View key={row.project} style={{ marginTop: 12 }}>
                <Row between><T bold numberOfLines={1} style={{ flex: 1 }}>{row.project}</T><Sub>{pct}%</Sub></Row>
                <View style={{ marginVertical: 6 }}><ProgressBar value={pct} color={colors.indigo} /></View>
                <Sub style={{ fontSize: 11 }}>Paid {amt(row.paidAmount)} of {amt(row.totalAmount)}</Sub>
              </View>
            );
          })}
        </Card>
      )}

      <Row between style={{ marginBottom: 8 }}>
        <H2>Recent investments</H2>
        <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'Investments' })}><Sub>View all</Sub></Pressable>
      </Row>
      {(s?.recentInvestments || []).map((inv) => (
        <Card key={inv.id} style={{ marginBottom: 10 }} onPress={() => navigation.navigate('InvestmentDetail', { id: inv.id })}>
          <Row between>
            <View style={{ flex: 1 }}><T bold numberOfLines={1}>{inv.projectName}</T><Sub>{getReturnType(inv.investmentType).label} · {fmtDate(inv.investmentDate)}</Sub></View>
            <Badge status={inv.status} label={INVESTMENT_STATUS_LABEL[inv.status] || inv.status} />
          </Row>
          <Row between style={{ marginTop: 8 }}><T bold>{amt(inv.amount)}</T>{Number(inv.dueAmount) > 0 ? <Sub style={{ color: colors.amber }}>Due {amt(inv.dueAmount)}</Sub> : null}</Row>
        </Card>
      ))}

      {activity.length > 0 && (
        <>
          <Row between style={{ marginTop: 6, marginBottom: 8 }}>
            <H2>Recent activity</H2>
            <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'History' })}><Sub>History</Sub></Pressable>
          </Row>
          <Card style={{ paddingVertical: 4 }}>
            {activity.map((ev, i) => (
              <Row key={ev.key || i} between style={{ paddingVertical: 10, borderBottomWidth: i === activity.length - 1 ? 0 : 1, borderBottomColor: colors.borderLight }}>
                <View style={{ flex: 1 }}><T bold numberOfLines={1}>{ev.title}</T><Sub>{ev.projectName} · {fmtDate(ev.date)}{ev.upcoming ? ' · upcoming' : ''}</Sub></View>
                <T bold style={{ color: ev.type === 'payment' ? colors.emerald : colors.text }}>{amt(ev.amount)}</T>
              </Row>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
