// Port of PortalQuotesPage.jsx (customer)
import { Alert, View } from 'react-native';
import { getPortalQuotes, respondToQuote } from '../../portal/api/portalQuotes';
import { Badge, Button, Card, Empty, ErrorBox, List, Loading, PageHeader, Row, Sub, T, useAsync } from '../../components/ui';
import { money, fmtDate, errMsg } from '../../utils/format';

export default function QuotesScreen() {
  const { data, loading, error, refreshing, refresh, reload } = useAsync(getPortalQuotes);

  function respond(q, decision) {
    Alert.alert(`${decision === 'Accepted' ? 'Accept' : 'Reject'} quote ${q.code}?`, '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: decision === 'Accepted' ? 'Accept' : 'Reject',
        style: decision === 'Accepted' ? 'default' : 'destructive',
        onPress: async () => {
          try { await respondToQuote(q.id, decision); reload(); } catch (err) { Alert.alert('Error', errMsg(err, 'Failed to respond')); }
        },
      },
    ]);
  }

  if (loading) return <Loading />;
  return (
    <List
      data={Array.isArray(data) ? data : []}
      refreshing={refreshing}
      onRefresh={refresh}
      header={<View><PageHeader title="Quotes" subtitle="Review and respond to quotations" /><ErrorBox message={error} onRetry={reload} /></View>}
      empty={<Empty text="No quotes yet" />}
      renderItem={({ item: q }) => (
        <Card>
          <Row between>
            <View><T bold>{q.code}</T><Sub>{fmtDate(q.date)}</Sub></View>
            <Badge status={q.status} />
          </Row>
          <Row between style={{ marginTop: 12 }}>
            <T bold>{money(q.grandTotal)}</T>
            {(q.status === 'Submitted' || q.status === 'Under Review') && (
              <Row>
                <Button small variant="danger" title="Reject" onPress={() => respond(q, 'Rejected')} />
                <Button small variant="success" title="Accept" onPress={() => respond(q, 'Accepted')} />
              </Row>
            )}
          </Row>
        </Card>
      )}
    />
  );
}
