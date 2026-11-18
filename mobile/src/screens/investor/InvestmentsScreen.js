// Port of PortalInvestorInvestments.jsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { getInvestorInvestments } from '../../portal/api/portalInvestor';
import { Badge, Card, Empty, ErrorBox, List, Loading, ProgressBar, Row, Segmented, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { money, fmtDate } from '../../utils/format';
import { getReturnType, INVESTMENT_STATUS_LABEL } from '../../portal/investorHelpers';

const FILTERS = [['all', 'All'], ['active', 'Active'], ['matured', 'Matured'], ['fully_returned', 'Returned']];

export default function InvestmentsScreen({ navigation }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [q, setQ] = useState('');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => getInvestorInvestments({ status: filterStatus }).then((r) => r.data), [filterStatus]);
  const list = (Array.isArray(data) ? data : data?.investments || []).filter((inv) => {
    const s = q.trim().toLowerCase();
    return !s || inv.projectName?.toLowerCase().includes(s) || inv.agreementRef?.toLowerCase().includes(s);
  });

  return (
    <List
      data={loading ? [] : list}
      refreshing={refreshing}
      onRefresh={refresh}
      header={
        <View>
          <TextInput value={q} onChangeText={setQ} placeholder="Search project or agreement" placeholderTextColor={colors.faint}
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, color: colors.text }} />
          <Segmented options={FILTERS} value={filterStatus} onChange={setFilterStatus} accent={colors.indigo} />
          <ErrorBox message={error} onRetry={reload} />
          {loading ? <Loading /> : null}
        </View>
      }
      empty={loading ? null : <Empty text="No investments found" />}
      renderItem={({ item: inv }) => {
        const pct = Number(inv.amount) > 0 ? Math.min(100, Math.round((Number(inv.paidAmount || 0) / Number(inv.amount)) * 100)) : 0;
        return (
          <Card onPress={() => navigation.navigate('InvestmentDetail', { id: inv.id })}>
            <Row between>
              <View style={{ flex: 1 }}><T bold numberOfLines={1}>{inv.projectName}</T><Sub>{inv.agreementRef || '—'} · {getReturnType(inv.investmentType).label}</Sub></View>
              <Badge status={inv.status} label={INVESTMENT_STATUS_LABEL[inv.status] || inv.status} />
            </Row>
            <Row between style={{ marginTop: 10 }}>
              <T bold style={{ fontSize: 16 }}>{money(inv.amount)}</T>
              <Sub>{inv.maturityDate ? `Matures ${fmtDate(inv.maturityDate)}` : `Since ${fmtDate(inv.investmentDate)}`}</Sub>
            </Row>
            <View style={{ marginTop: 8 }}><ProgressBar value={pct} color={colors.indigo} /></View>
            <Row between style={{ marginTop: 6 }}>
              <Sub style={{ fontSize: 11 }}>Paid {money(inv.paidAmount)}</Sub>
              {Number(inv.dueAmount) > 0 ? <Sub style={{ fontSize: 11, color: colors.amber }}>Due {money(inv.dueAmount)}</Sub> : null}
            </Row>
          </Card>
        );
      }}
    />
  );
}
