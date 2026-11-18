// Port of portal/components/CheckInCard.jsx
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { LogIn, LogOut, CalendarCheck } from 'lucide-react-native';
import { getTodayAttendance, checkInAttendance } from '../portal/api/portalEmployee';
import { checkOutAttendance, fmtTime } from '../portal/api/portalTasks';
import { Button, Card, ErrorBox, Row, Sub, T, Badge } from './ui';
import { colors } from '../theme';
import { errMsg } from '../utils/format';

export default function CheckInCard({ onChange }) {
  const [today, setToday] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => getTodayAttendance().then(setToday).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function run(fn, fallback) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); onChange?.(); } catch (err) { setError(errMsg(err, fallback)); } finally { setBusy(false); }
  }

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  const checkedIn = !!today?.checkInAt;

  return (
    <Card style={{ marginBottom: 14 }}>
      <Row between>
        <View>
          <Sub>Today</Sub>
          <T bold>{dateLabel}</T>
        </View>
        {today?.status ? <Badge status={today.status} /> : <CalendarCheck size={18} color={colors.faint} />}
      </Row>
      <ErrorBox message={error} />
      {checkedIn ? (
        <View style={{ marginTop: 12 }}>
          <T>In: <T bold>{fmtTime(today.checkInAt)}</T>{today.checkOutAt ? <T>  ·  Out: <T bold>{fmtTime(today.checkOutAt)}</T></T> : null}</T>
          {!today.checkOutAt && (
            <Button style={{ marginTop: 10 }} variant="outline" title="Check out" loading={busy} icon={<LogOut size={16} color={colors.text2} />}
              onPress={() => Alert.alert('Check out now?', 'This ends your work day.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Check out', onPress: () => run(checkOutAttendance, 'Could not check out. Please try again.') },
              ])} />
          )}
        </View>
      ) : today?.weeklyOff ? (
        <Sub style={{ marginTop: 10 }}>Weekly off today — enjoy your day.</Sub>
      ) : (
        <Button style={{ marginTop: 12 }} variant="success" title="Check in" loading={busy} icon={<LogIn size={16} color="#fff" />}
          onPress={() => run(checkInAttendance, 'Could not mark attendance. Please try again.')} />
      )}
    </Card>
  );
}
