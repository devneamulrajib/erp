// Port of PortalRequestsPage.jsx
import { useState } from 'react';
import { View } from 'react-native';
import { Send } from 'lucide-react-native';
import { getPortalRequests, createPortalRequest } from '../../portal/api/portalRequests';
import { Badge, Button, Card, Empty, ErrorBox, H2, Input, List, Loading, PageHeader, Row, Sub, T, useAsync } from '../../components/ui';
import { errMsg, fmtDate } from '../../utils/format';

export default function RequestsScreen() {
  const { data, loading, error, refreshing, refresh, reload } = useAsync(getPortalRequests);
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleSubmit() {
    if (!subject.trim() || !details.trim()) { setFormError('Subject and details are required.'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      await createPortalRequest(subject.trim(), details.trim());
      setSubject('');
      setDetails('');
      reload();
    } catch (err) {
      setFormError(errMsg(err, 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;
  return (
    <List
      data={Array.isArray(data) ? data : []}
      refreshing={refreshing}
      onRefresh={refresh}
      header={
        <View style={{ marginBottom: 12 }}>
          <PageHeader title="Requests" subtitle="Ask us anything — we will get back to you" />
          <Card>
            <H2>New request</H2>
            <View style={{ height: 10 }} />
            <ErrorBox message={formError} />
            <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="e.g. Update my billing address" />
            <Input label="Details" value={details} onChangeText={setDetails} multiline placeholder="Describe your request" />
            <Button title="Submit Request" icon={<Send size={15} color="#fff" />} loading={submitting} onPress={handleSubmit} />
          </Card>
          <ErrorBox message={error} onRetry={reload} />
          <H2 style={{ marginTop: 16 }}>Your requests</H2>
        </View>
      }
      empty={<Empty text="No requests yet" />}
      renderItem={({ item: r }) => (
        <Card>
          <Row between>
            <View style={{ flex: 1 }}><T bold numberOfLines={2}>{r.subject}</T><Sub>{r.code}{r.createdAt ? ` · ${fmtDate(r.createdAt)}` : ''}</Sub></View>
            <Badge status={r.status} />
          </Row>
          {r.details ? <T small muted style={{ marginTop: 8 }}>{r.details}</T> : null}
          {r.adminNote ? <T small style={{ marginTop: 8 }}>Reply: {r.adminNote}</T> : null}
        </Card>
      )}
    />
  );
}
