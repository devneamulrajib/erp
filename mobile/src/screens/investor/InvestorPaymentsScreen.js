// Port of PortalInvestorPayments.jsx
import { View } from 'react-native';
import { getInvestorPayments } from '../../portal/api/portalInvestor';
import { Card, Empty, ErrorBox, List, Loading, Row, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { money, fmtDate } from '../../utils/format';

export default function InvestorPaymentsScreen() {
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => getInvestorPayments().then((r) => r.data));
  if (loading) return <Loading />;
  return (
    <List
      data={data?.payments || []}
      refreshing={refreshing}
      onRefresh={refresh}
      header={
        <View>
          <ErrorBox message={error} onRetry={reload} />
          <Card style={{ marginBottom: 12, backgroundColor: colors.emerald, borderColor: colors.emerald }}>
            <Sub style={{ color: '#d1fae5' }}>Total received</Sub>
            <T bold style={{ color: '#fff', fontSize: 26 }}>{money(data?.totalAmount)}</T>
          </Card>
        </View>
      }
      empty={<Empty text="No payouts yet" />}
      renderItem={({ item: p }) => (
        <Card>
          <Row between>
            <View style={{ flex: 1 }}>
              <T bold numberOfLines={1}>{p.projectName}</T>
              <Sub>{fmtDate(p.paymentDate)} · {String(p.paymentType || '').replace(/_/g, ' ')} · {p.paymentMethod || '—'}</Sub>
              {p.referenceNo ? <Sub style={{ fontSize: 11 }}>Ref {p.referenceNo}</Sub> : null}
            </View>
            <T bold style={{ color: colors.emerald }}>{money(p.amount)}</T>
          </Row>
        </Card>
      )}
    />
  );
}
