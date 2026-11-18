// Port of PortalMaterialRequisitionsPage.jsx (suppliers quote on open requisitions).
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { getPortalMaterialRequisitions } from '../../portal/api/portalMaterialRequisitions';
import { Badge, Card, Empty, ErrorBox, List, Loading, PageHeader, Row, Sub, T, useAsync } from '../../components/ui';
import { money, fmtDate } from '../../utils/format';
import { colors } from '../../theme';

export const MR_LABELS = { NeedsCorrection: 'Correction Requested', PartiallyConverted: 'Partially Converted' };

export default function MaterialRequisitionsScreen({ navigation }) {
  const { data, loading, error, refreshing, refresh, reload } = useAsync(getPortalMaterialRequisitions);
  if (loading) return <Loading />;
  return (
    <List
      data={Array.isArray(data) ? data : []}
      refreshing={refreshing}
      onRefresh={refresh}
      header={<View><PageHeader title="Material Requisitions" subtitle="Submit your quotation for open requisitions" /><ErrorBox message={error} onRetry={reload} /></View>}
      empty={<Empty text="No requisitions yet" />}
      renderItem={({ item: r }) => {
        const myQuotation = (r.quotations || [])[0];
        const needsResponse = r.status === 'Open' && (!myQuotation || myQuotation.status === 'NeedsCorrection');
        return (
          <Card onPress={() => navigation.navigate('MaterialRequisition', { id: r.id })}>
            <Row between>
              <View style={{ flex: 1 }}>
                <T bold numberOfLines={1}>{r.titleOfWork || 'Material Requisition'}</T>
                <Sub>{r.code} · {fmtDate(r.date)}</Sub>
              </View>
              <Badge status={r.status} label={MR_LABELS[r.status] || r.status} />
              <ChevronRight size={16} color={colors.faint} />
            </Row>
            <Row between style={{ marginTop: 10 }}>
              {myQuotation ? (
                <Row gap={6}><Sub>My quote:</Sub><Badge status={myQuotation.status} label={MR_LABELS[myQuotation.status] || myQuotation.status} /></Row>
              ) : <Sub>No quote yet</Sub>}
              {r.subtotal != null ? <T bold>{money(r.subtotal)}</T> : null}
            </Row>
            {needsResponse ? <T small style={{ color: colors.amber, fontWeight: '700', marginTop: 8 }}>{myQuotation ? 'Correction requested — update your quote' : 'Respond with your quotation'}</T> : null}
          </Card>
        );
      }}
    />
  );
}
