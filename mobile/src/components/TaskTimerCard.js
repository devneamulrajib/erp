// Port of portal/components/TaskTimerCard.jsx — shows the running task timer.
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Square, Timer } from 'lucide-react-native';
import { getRunning, stopTimer, fmtClock, fmtMinutes } from '../portal/api/portalTasks';
import { Button, Card, Row } from './ui';
import { useNow } from '../portal/taskHelpers';
import { errMsg } from '../utils/format';

export default function TaskTimerCard({ onChange }) {
  const navigation = useNavigation();
  const [running, setRunning] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const now = useNow(!!running);

  const load = useCallback(() => { getRunning().then((r) => setRunning(r && r.taskId ? r : null)).catch(() => {}); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  if (!running) return null;
  const sessionSecs = running.startedAt ? Math.max(0, (now - new Date(running.startedAt).getTime()) / 1000) : 0;
  const totalSecs = (running.priorWorkedSeconds || 0) + sessionSecs;

  async function stop() {
    setBusy(true);
    setError('');
    try { await stopTimer(running.taskId); setRunning(null); onChange?.(); } catch (err) { setError(errMsg(err, 'Could not stop the timer.')); } finally { setBusy(false); }
  }

  return (
    <Card dark style={{ marginBottom: 14 }} onPress={() => navigation.navigate('TaskDetail', { id: running.taskId })}>
      <Row between>
        <View style={{ flex: 1 }}>
          <Row gap={6}><Timer size={14} color="#fcd34d" /><Text style={{ color: '#fcd34d', fontSize: 12, fontWeight: '700' }}>TIMER RUNNING</Text></Row>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, marginTop: 4 }} numberOfLines={1}>{running.task?.title || 'Task'}</Text>
          <Text style={{ color: '#cbd5e1', fontSize: 12 }}>{running.task?.estimatedMinutes ? `Allotted ${fmtMinutes(running.task.estimatedMinutes)}` : 'No time limit'}</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{fmtClock(totalSecs)}</Text>
      </Row>
      {error ? <Text style={{ color: '#fca5a5', marginTop: 6 }}>{error}</Text> : null}
      <Button style={{ marginTop: 12 }} variant="outline" title="Stop timer" loading={busy} icon={<Square size={14} color="#334155" />} onPress={stop} />
    </Card>
  );
}
