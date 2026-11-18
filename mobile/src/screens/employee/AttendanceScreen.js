// Port of PortalAttendancePage.jsx (+ CorrectionSheet.jsx)
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CalendarCheck, CalendarX, CalendarDays } from 'lucide-react-native';
import { getAttendanceSummary, requestAttendanceCorrection } from '../../portal/api/portalEmployee';
import CheckInCard from '../../components/CheckInCard';
import { Button, Card, ErrorBox, Input, Loading, Notice, PageHeader, Row, Screen, Segmented, Select, Sheet, Stat, Sub, T, useAsync } from '../../components/ui';
import { colors, STATUS_TONES } from '../../theme';
import { MONTHS, fmtDate, errMsg } from '../../utils/format';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CORRECTION_WINDOW_DAYS = 30; // keep in sync with the server
const LEGEND = [['Present', colors.emerald], ['Absent', colors.red], ['Leave', colors.amber], ['Holiday', colors.violet], ['Off', '#cbd5e1']];

export default function AttendanceScreen({ navigation }) {
  const now = new Date();
  const [view, setView] = useState('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tick, setTick] = useState(0);
  const [correctionDate, setCorrectionDate] = useState(null);
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [sent, setSent] = useState(false);

  const { data, loading, error, refreshing, refresh, reload } = useAsync(
    () => getAttendanceSummary(view === 'month' ? { view, year, month } : { view, year }),
    [view, year, month, tick]
  );

  const byDate = useMemo(() => Object.fromEntries((data?.days || []).map((d) => [d.date, d.status])), [data]);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const ready = data && data.view === view;
  const counts = ready ? data.counts : null;
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay();
  const earliest = data?.today
    ? new Date(new Date(`${data.today}T00:00:00Z`).getTime() - CORRECTION_WINDOW_DAYS * 86400000).toISOString().slice(0, 10)
    : null;
  const canCorrect = (date, status) => status === 'Absent' && data?.today && date < data.today && earliest && date >= earliest;

  async function sendCorrection() {
    if (!reason.trim()) { setSheetError('Please tell HR why this should be corrected.'); return; }
    setSending(true);
    setSheetError('');
    try {
      await requestAttendanceCorrection({ date: correctionDate, reason: reason.trim() });
      setCorrectionDate(null);
      setReason('');
      setSent(true);
    } catch (err) {
      setSheetError(errMsg(err, 'Could not send the request.'));
    } finally {
      setSending(false);
    }
  }

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHeader title="Attendance" subtitle="Mark your attendance and review your record." />
      <CheckInCard onChange={() => setTick((t) => t + 1)} />
      {sent && (
        <Pressable onPress={() => navigation.navigate('Tabs', { screen: 'MyRequests' })}>
          <Notice message="Correction request sent to HR. Tap to track it in My Requests." />
        </Pressable>
      )}

      <Segmented options={[['month', 'Month'], ['year', 'Year']]} value={view} onChange={setView} />
      <Row gap={10}>
        {view === 'month' && <View style={{ flex: 1.4 }}><Select value={month} onChange={setMonth} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} /></View>}
        <View style={{ flex: 1 }}><Select value={year} onChange={setYear} options={years} /></View>
      </Row>

      <ErrorBox message={error && 'Could not load attendance right now.'} onRetry={reload} />
      {loading && !ready ? <Loading /> : null}

      {counts && (
        <Row gap={10} style={{ marginBottom: 14 }}>
          <Stat label="Present" value={counts.present || 0} icon={<CalendarCheck size={14} color={colors.emerald} />} tone={[colors.emerald, colors.emeraldSoft]} />
          <Stat label="Absent" value={counts.absent || 0} icon={<CalendarX size={14} color={colors.red} />} tone={[colors.red, colors.redSoft]} />
          <Stat label="Leave" value={counts.leave || 0} icon={<CalendarDays size={14} color={colors.amber} />} tone={[colors.amber, colors.amberSoft]} />
        </Row>
      )}

      {ready && view === 'month' && (
        <Card>
          <Row>{WEEKDAYS.map((w, i) => <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: colors.faint, fontWeight: '700' }}>{w}</Text>)}</Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {cells.map((d, i) => {
              if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
              const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const status = byDate[date];
              const [fg, bg] = STATUS_TONES[status] || [colors.muted, colors.white];
              const correctable = canCorrect(date, status);
              const isToday = date === data.today;
              return (
                <View key={date} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                  <Pressable disabled={!correctable} onPress={() => { setCorrectionDate(date); setSheetError(''); setSent(false); }}
                    style={{ flex: 1, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: isToday ? 2 : status === 'Pending' ? 1 : 0, borderColor: isToday ? colors.text : colors.border, borderStyle: status === 'Pending' ? 'dashed' : 'solid' }}>
                    <Text style={{ color: fg, fontWeight: '700', fontSize: 13 }}>{d}</Text>
                    {correctable ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.red, marginTop: 2 }} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            {LEGEND.map(([l, c]) => <Row key={l} gap={4}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /><Sub style={{ fontSize: 11 }}>{l}</Sub></Row>)}
          </View>
          {(data.days || []).some((x) => canCorrect(x.date, x.status)) && <Sub style={{ marginTop: 8 }}>Tap an absent day (red dot) to ask HR for a correction.</Sub>}
        </Card>
      )}

      {ready && view === 'year' && (
        <Card style={{ paddingVertical: 4 }}>
          {(data.months || []).map((m, i, arr) => (
            <Row key={m.month} between style={{ paddingVertical: 12, borderBottomWidth: i === arr.length - 1 ? 0 : 1, borderBottomColor: colors.borderLight }}>
              <T bold style={{ width: 90 }}>{MONTHS[m.month - 1]}</T>
              <Text style={{ color: colors.emerald, fontWeight: '600' }}>P {m.present || 0}</Text>
              <Text style={{ color: colors.red, fontWeight: '600' }}>A {m.absent || 0}</Text>
              <Text style={{ color: colors.amber, fontWeight: '600' }}>L {m.leave || 0}</Text>
            </Row>
          ))}
        </Card>
      )}

      <Sheet visible={!!correctionDate} onClose={() => setCorrectionDate(null)} title="Request correction">
        <Sub style={{ marginBottom: 12 }}>You were marked absent on {fmtDate(correctionDate)}. Tell HR what happened.</Sub>
        <ErrorBox message={sheetError} />
        <Input label="Reason" value={reason} onChangeText={setReason} multiline placeholder="e.g. I was at the site office and forgot to check in" />
        <Button title="Send to HR" loading={sending} onPress={sendCorrection} />
      </Sheet>
    </Screen>
  );
}
