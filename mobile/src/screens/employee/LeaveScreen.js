// Port of PortalLeaveRequestPage.jsx
import { useState } from 'react';
import { View } from 'react-native';
import { Send } from 'lucide-react-native';
import { getEmployeeLeaveRequests, requestEmployeeLeave } from '../../portal/api/portalEmployee';
import { Badge, Button, Card, DateField, Empty, ErrorBox, H2, Input, Loading, Row, Screen, Sub, T, useAsync } from '../../components/ui';
import { fmtDate, errMsg } from '../../utils/format';

export default function LeaveScreen() {
  const { data, loading, refreshing, refresh, reload } = useAsync(getEmployeeLeaveRequests);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!fromDate || !toDate) { setError('Pick the from and to dates.'); return; }
    if (toDate < fromDate) { setError('The end date cannot be before the start date.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await requestEmployeeLeave({ fromDate, toDate, reason });
      setFromDate(''); setToDate(''); setReason('');
      reload();
    } catch (err) {
      setError(errMsg(err, 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  }

  const list = Array.isArray(data) ? data : [];
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginBottom: 16 }}>
        <H2>Request day off</H2>
        <View style={{ height: 10 }} />
        <ErrorBox message={error} />
        <Row gap={10}>
          <DateField label="From" value={fromDate} onChange={setFromDate} />
          <DateField label="To" value={toDate} onChange={setToDate} minimumDate={fromDate ? new Date(`${fromDate}T00:00:00`) : undefined} />
        </Row>
        <Input label="Reason" value={reason} onChangeText={setReason} multiline placeholder="e.g. Family event" />
        <Button title="Submit Request" icon={<Send size={15} color="#fff" />} loading={submitting} onPress={handleSubmit} />
      </Card>
      <H2 style={{ marginBottom: 8 }}>My leave requests</H2>
      {loading ? <Loading /> : list.length === 0 ? <Empty text="No leave requests yet" /> : list.map((r) => (
        <Card key={r.id} style={{ marginBottom: 10 }}>
          <Row between>
            <View style={{ flex: 1 }}><T bold>{fmtDate(r.fromDate)} – {fmtDate(r.toDate)}</T><Sub>{r.days} day(s){r.reason ? ` · ${r.reason}` : ''}</Sub></View>
            <Badge status={r.status} />
          </Row>
          {r.adminNote ? <T small style={{ marginTop: 6 }}>HR: {r.adminNote}</T> : null}
        </Card>
      ))}
    </Screen>
  );
}
