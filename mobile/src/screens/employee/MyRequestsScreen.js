// Port of PortalMyRequestsPage.jsx — leave, advance/loan and attendance corrections in one list.
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { CalendarDays, Banknote, CalendarCheck, Plus } from 'lucide-react-native';
import {
  getEmployeeLeaveRequests, getEmployeeAdvances, getAttendanceCorrections,
  cancelLeaveRequest, cancelAdvanceRequest, cancelAttendanceCorrection,
} from '../../portal/api/portalEmployee';
import { Badge, Button, Card, Empty, ErrorBox, List, Loading, PageHeader, Row, Segmented, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { fmtDate, money, errMsg } from '../../utils/format';

const KIND = {
  leave: { Icon: CalendarDays, tone: [colors.amber, colors.amberSoft] },
  advance: { Icon: Banknote, tone: [colors.emerald, colors.emeraldSoft] },
  attendance: { Icon: CalendarCheck, tone: [colors.sky, colors.skySoft] },
};

export default function MyRequestsScreen({ navigation }) {
  const [filter, setFilter] = useState('all');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(async () => {
    const [l, a, c] = await Promise.all([getEmployeeLeaveRequests(), getEmployeeAdvances(), getAttendanceCorrections()]);
    return { leaves: l || [], advances: a || [], corrections: c || [] };
  });

  const items = useMemo(() => {
    if (!data) return [];
    const list = [
      ...data.leaves.map((r) => ({ key: `leave-${r.id}`, kind: 'leave', id: r.id, title: 'Day off', subtitle: `${fmtDate(r.fromDate)} – ${fmtDate(r.toDate)} · ${r.days} day${r.days === 1 ? '' : 's'}`, reason: r.reason, adminNote: r.adminNote, status: r.status, createdAt: r.createdAt })),
      ...data.advances.map((r) => ({ key: `advance-${r.id}`, kind: 'advance', id: r.id, title: r.type, subtitle: `${money(r.amount)} · ${r.repaymentMonths} month${r.repaymentMonths === 1 ? '' : 's'}${r.targetMonth && r.targetYear ? ` · from ${r.targetMonth}/${r.targetYear}` : ''}`, reason: r.reason, adminNote: '', status: r.status, createdAt: r.createdAt })),
      ...data.corrections.map((r) => ({ key: `attendance-${r.id}`, kind: 'attendance', id: r.id, title: 'Attendance correction', subtitle: `For ${fmtDate(r.date)}`, reason: r.reason, adminNote: r.adminNote, status: r.status, createdAt: r.createdAt })),
    ];
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [data]);

  const visible = filter === 'all' ? items : items.filter((i) => i.kind === filter);
  const pendingCount = items.filter((i) => i.status === 'Pending').length;
  const countFor = (id) => (id === 'all' ? items.length : items.filter((i) => i.kind === id).length);

  function askCancel(item) {
    Alert.alert('Cancel this request?', `${item.title} — ${item.subtitle}`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel request', style: 'destructive', onPress: async () => {
          try {
            if (item.kind === 'leave') await cancelLeaveRequest(item.id);
            else if (item.kind === 'advance') await cancelAdvanceRequest(item.id);
            else await cancelAttendanceCorrection(item.id);
            reload();
          } catch (err) { Alert.alert('Error', errMsg(err, 'Could not cancel this request.')); }
        },
      },
    ]);
  }

  if (loading) return <Loading />;
  return (
    <List
      data={visible}
      keyExtractor={(i) => i.key}
      refreshing={refreshing}
      onRefresh={refresh}
      header={
        <View>
          <PageHeader title="My Requests" subtitle={pendingCount > 0 ? `${pendingCount} waiting for a decision` : 'Everything is up to date'} />
          <ErrorBox message={error && 'Could not load your requests. Pull down to try again.'} onRetry={reload} />
          <Row gap={8} style={{ marginBottom: 12 }}>
            <Button small variant="outline" title="Day off" icon={<Plus size={13} color={colors.text2} />} onPress={() => navigation.navigate('Leave')} />
            <Button small variant="outline" title="Advance" icon={<Plus size={13} color={colors.text2} />} onPress={() => navigation.navigate('Advance')} />
            <Button small variant="outline" title="Correction" icon={<Plus size={13} color={colors.text2} />} onPress={() => navigation.navigate('Tabs', { screen: 'Attendance' })} />
          </Row>
          <Segmented value={filter} onChange={setFilter} options={[['all', `All ${countFor('all')}`], ['leave', `Day off ${countFor('leave')}`], ['advance', `Advance ${countFor('advance')}`], ['attendance', `Attendance ${countFor('attendance')}`]]} />
        </View>
      }
      empty={<Empty text="No requests here yet." />}
      renderItem={({ item }) => {
        const { Icon, tone } = KIND[item.kind];
        return (
          <Card>
            <Row style={{ alignItems: 'flex-start' }} gap={10}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: tone[1], alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={tone[0]} /></View>
              <View style={{ flex: 1 }}>
                <Row between><T bold>{item.title}</T><Badge status={item.status} /></Row>
                <Sub>{item.subtitle}</Sub>
                {item.reason ? <T small muted style={{ marginTop: 4 }}>{item.reason}</T> : null}
                {item.adminNote ? <T small style={{ marginTop: 4 }}>HR: {item.adminNote}</T> : null}
                <Row between style={{ marginTop: 6 }}>
                  <Sub style={{ fontSize: 11 }}>Sent {fmtDate(item.createdAt)}</Sub>
                  {item.status === 'Pending' ? <Button small variant="danger" title="Cancel" onPress={() => askCancel(item)} /> : null}
                </Row>
              </View>
            </Row>
          </Card>
        );
      }}
    />
  );
}
