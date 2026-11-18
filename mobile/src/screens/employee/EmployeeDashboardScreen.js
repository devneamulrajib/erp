// Port of PortalEmployeeDashboard.jsx
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CalendarCheck, CalendarX, CalendarDays, Banknote, ListChecks, ArrowRight, ChevronLeft, ChevronRight, Check, Clock, Download } from 'lucide-react-native';
import { getEmployeeProfile, getAttendanceSummary, getSalaryMonths, downloadPayslip } from '../../portal/api/portalEmployee';
import { useAuth } from '../../context/AuthContext';
import CheckInCard from '../../components/CheckInCard';
import TaskTimerCard from '../../components/TaskTimerCard';
import SalaryCard from '../../components/SalaryCard';
import { Button, Card, ErrorBox, H1, H2, Loading, Row, Screen, Stat, Sub, T, useAsync } from '../../components/ui';
import { colors, radius } from '../../theme';
import { MONTH_SHORT, MONTHS, fmtDate, errMsg } from '../../utils/format';

function SalaryTracker({ joiningDate }) {
  const [year, setYear] = useState(null);
  const [selected, setSelected] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const { data } = useAsync(() => getSalaryMonths(year || undefined), [year]);
  const joinY = joiningDate ? Number(String(joiningDate).slice(0, 4)) : null;
  const joinM = joiningDate ? Number(String(joiningDate).slice(5, 7)) : null;

  const tileState = (m) => {
    if (!data) return 'none';
    if (joinY && data.year * 12 + m.month < joinY * 12 + joinM) return 'na';
    if (m.status === 'Paid') return 'paid';
    if (m.status === 'Draft') return 'processing';
    const isFuture = data.year > data.currentYear || (data.year === data.currentYear && m.month > data.currentMonth);
    if (isFuture) return 'upcoming';
    if (data.year === data.currentYear && m.month === data.currentMonth) return 'due';
    return 'none';
  };
  const months = data?.months || Array.from({ length: 12 }, (_, i) => ({ month: i + 1 }));
  const selectedMonth = data?.months?.find((m) => m.month === selected);
  const TILE = {
    paid: [colors.emeraldSoft, colors.emerald], processing: [colors.amberSoft, colors.amber], due: [colors.skySoft, colors.sky],
    upcoming: [colors.white, colors.faint], na: [colors.bg, '#cbd5e1'], none: [colors.white, colors.muted],
  };

  async function handleDownload() {
    if (!selectedMonth?.slipId) return;
    setDownloading(true);
    try { await downloadPayslip(selectedMonth.slipId, `Payslip-${data.year}-${String(selectedMonth.month).padStart(2, '0')}.pdf`); }
    catch (err) { Alert.alert('Download failed', errMsg(err, 'Could not download payslip')); }
    finally { setDownloading(false); }
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <Row between>
        <H2>Salary tracker</H2>
        <Row gap={4}>
          <Pressable hitSlop={8} onPress={() => { setSelected(null); setYear((y) => (y || data?.year) - 1); }} disabled={!data || (joinY && data.year <= joinY)}><ChevronLeft size={18} color={colors.text2} /></Pressable>
          <T bold>{data?.year || '…'}</T>
          <Pressable hitSlop={8} onPress={() => { setSelected(null); setYear((y) => (y || data?.year) + 1); }} disabled={!data || data.year >= data.currentYear}><ChevronRight size={18} color={colors.text2} /></Pressable>
        </Row>
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        {months.map((m) => {
          const state = tileState(m);
          const [bg, fg] = TILE[state];
          const isSel = selected === m.month;
          return (
            <Pressable key={m.month} disabled={state !== 'paid'} onPress={() => setSelected(isSel ? null : m.month)}
              style={{ width: '22%', flexGrow: 1, paddingVertical: 10, borderRadius: radius.sm, backgroundColor: bg, borderWidth: isSel ? 2 : 1, borderColor: isSel ? colors.emerald : colors.border, alignItems: 'center' }}>
              <Row gap={3}>
                <Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{MONTH_SHORT[m.month - 1]}</Text>
                {state === 'paid' && <Check size={12} color={fg} />}
                {state === 'processing' && <Clock size={12} color={fg} />}
              </Row>
            </Pressable>
          );
        })}
      </View>
      {selectedMonth && (
        <Row between style={{ marginTop: 12, backgroundColor: colors.emeraldSoft, padding: 12, borderRadius: radius.md }}>
          <View>
            <T bold>{MONTHS[selectedMonth.month - 1]} {data.year}</T>
            {selectedMonth.paidDate ? <Sub>Paid {fmtDate(selectedMonth.paidDate)}</Sub> : null}
          </View>
          <Button small variant="success" title="Payslip" icon={<Download size={14} color="#fff" />} loading={downloading} onPress={handleDownload} />
        </Row>
      )}
    </Card>
  );
}

export default function EmployeeDashboardScreen({ navigation }) {
  const { session } = useAuth();
  const user = session?.user;
  const { data, loading, error, refreshing, refresh, reload } = useAsync(async () => {
    const [profile, attendance] = await Promise.all([getEmployeeProfile(), getAttendanceSummary({ view: 'month' })]);
    return { profile, attendance };
  });
  const [attendance, setAttendance] = useState(null);
  const loadAttendance = useCallback(() => { getAttendanceSummary({ view: 'month' }).then(setAttendance).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => { loadAttendance(); }, [loadAttendance]));

  if (loading) return <Loading />;
  const profile = data?.profile || {};
  const att = attendance || data?.attendance;
  const firstName = (user?.name || profile.name || '').split(' ')[0] || 'there';

  return (
    <Screen refreshing={refreshing} onRefresh={() => { refresh(); loadAttendance(); }}>
      <ErrorBox message={error} onRetry={reload} />
      <Sub>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Sub>
      <H1>Hi, {firstName}</H1>
      <Sub style={{ marginBottom: 16 }}>{[profile.designation, profile.department].filter(Boolean).join(' · ') || 'Employee portal'}</Sub>

      <CheckInCard onChange={loadAttendance} />
      <TaskTimerCard />
      <SalaryCard />
      <SalaryTracker joiningDate={profile.joiningDate} />

      <H2 style={{ marginBottom: 8 }}>This month</H2>
      <Row gap={10} style={{ marginBottom: 14 }}>
        <Stat label="Present" value={att?.counts?.present || 0} icon={<CalendarCheck size={14} color={colors.emerald} />} tone={[colors.emerald, colors.emeraldSoft]} />
        <Stat label="Absent" value={att?.counts?.absent || 0} icon={<CalendarX size={14} color={colors.red} />} tone={[colors.red, colors.redSoft]} />
        <Stat label="Leave" value={att?.counts?.leave || 0} icon={<CalendarDays size={14} color={colors.amber} />} tone={[colors.amber, colors.amberSoft]} />
      </Row>

      <Row gap={10} style={{ marginBottom: 10 }}>
        <Card style={{ flex: 1 }} onPress={() => navigation.navigate('Leave')}>
          <CalendarDays size={18} color={colors.text} />
          <Row between style={{ marginTop: 8 }}><T bold>Request Day Off</T><ArrowRight size={14} color={colors.muted} /></Row>
        </Card>
        <Card style={{ flex: 1 }} onPress={() => navigation.navigate('Advance')}>
          <Banknote size={18} color={colors.text} />
          <Row between style={{ marginTop: 8 }}><T bold>Request Advance</T><ArrowRight size={14} color={colors.muted} /></Row>
        </Card>
      </Row>
      <Card onPress={() => navigation.navigate('Tabs', { screen: 'MyRequests' })}>
        <Row between><Row><ListChecks size={18} color={colors.text} /><T bold>My Requests</T></Row><ArrowRight size={14} color={colors.muted} /></Row>
      </Card>
    </Screen>
  );
}
