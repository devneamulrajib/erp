// Port of PortalTasksPage.jsx — list, timers, and "new task" sheet.
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Play, Square, CheckCircle2, X, Clock } from 'lucide-react-native';
import { listMyTasks, createMyTask, confirmAndStartTask, startTimer, stopTimer, fmtClock, fmtSeconds } from '../../portal/api/portalTasks';
import { Badge, Button, Card, DateField, Empty, ErrorBox, Input, List, Loading, ProgressBar, Row, Segmented, Select, Sheet, Sub, T, useAsync } from '../../components/ui';
import TaskTimerCard from '../../components/TaskTimerCard';
import { PRIORITIES, PRIORITY_COLOR, timerInfo, todayYmd, useNow } from '../../portal/taskHelpers';
import { colors } from '../../theme';
import { fmtDate, errMsg } from '../../utils/format';

const TABS = [['open', 'Open'], ['Done', 'Done'], ['', 'All']];
const EMPTY_FORM = { title: '', description: '', priority: 'Medium', dueDate: '', timerHours: '', timerMinutes: '' };

export default function TasksScreen({ navigation }) {
  const [tab, setTab] = useState('open');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => listMyTasks(tab), [tab]);
  const tasks = Array.isArray(data) ? data : [];
  const now = useNow(tasks.some((t) => t.running));
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subtasks, setSubtasks] = useState([]);
  const [subInput, setSubInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useFocusEffect(useCallback(() => { reload(); }, [tab])); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAction(t) {
    setBusyId(t.id);
    setActionError('');
    try {
      if (!t.confirmedAt) await confirmAndStartTask(t.id);
      else if (t.running) await stopTimer(t.id);
      else await startTimer(t.id);
      reload();
    } catch (e) {
      setActionError(errMsg(e, 'Could not update the timer.'));
    } finally {
      setBusyId(null);
    }
  }

  function addSub() {
    const v = subInput.trim();
    if (!v) return;
    setSubtasks((s) => [...s, v]);
    setSubInput('');
  }

  async function handleCreate() {
    if (!form.title.trim()) { setFormError('Give the task a title.'); return; }
    const totalMinutes = Number(form.timerHours || 0) * 60 + Number(form.timerMinutes || 0);
    if (!(totalMinutes > 0)) { setFormError('Set how long the task should take (hours / minutes).'); return; }
    setSaving(true);
    setFormError('');
    try {
      await createMyTask({ title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate || null, estimatedMinutes: Math.round(totalMinutes), subtasks });
      setForm(EMPTY_FORM); setSubtasks([]); setSubInput('');
      setShowNew(false);
      reload();
    } catch (e) {
      setFormError(errMsg(e, 'Could not create the task.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {loading && !data ? <Loading /> : (
        <List
          data={tasks}
          refreshing={refreshing}
          onRefresh={refresh}
          header={
            <View>
              <TaskTimerCard onChange={reload} />
              <Row between style={{ marginBottom: 4 }}>
                <Segmented options={TABS} value={tab} onChange={setTab} />
                <Button small title="New" icon={<Plus size={14} color="#fff" />} onPress={() => setShowNew(true)} style={{ marginBottom: 14 }} />
              </Row>
              <ErrorBox message={error || actionError} onRetry={error ? reload : undefined} />
            </View>
          }
          empty={<Empty text="No tasks here yet." />}
          renderItem={({ item: t }) => {
            const info = timerInfo(t, now);
            const overdue = t.dueDate && !info.closed && t.dueDate < todayYmd();
            return (
              <Card onPress={() => navigation.navigate('TaskDetail', { id: t.id })}>
                <T bold numberOfLines={2}>{t.title}</T>
                <Row style={{ marginTop: 6, flexWrap: 'wrap' }} gap={8}>
                  <Badge status={t.status} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: PRIORITY_COLOR[t.priority] || colors.muted }}>{t.priority}</Text>
                  {t.subtasksTotal > 0 ? <Sub style={{ fontSize: 11 }}>{t.subtasksDone}/{t.subtasksTotal} subtasks</Sub> : null}
                  {t.dueDate ? <Sub style={{ fontSize: 11, color: overdue ? colors.red : colors.faint }}>Due {fmtDate(t.dueDate)}</Sub> : null}
                </Row>
                {t.createdByType === 'admin' ? <Sub style={{ fontSize: 11, marginTop: 4 }}>Assigned by {t.createdByName || 'admin'}</Sub> : null}
                <View style={{ marginTop: 10 }}><ProgressBar value={t.progress} /></View>
                {!info.closed && (
                  <Row between style={{ marginTop: 10 }}>
                    <Row gap={6}>
                      <Clock size={14} color={info.crossed ? colors.red : colors.muted} />
                      <Text style={{ fontVariant: ['tabular-nums'], fontWeight: '700', color: info.crossed ? colors.red : colors.text2 }}>
                        {info.allottedSecs !== null ? `${info.crossed ? '+' : ''}${fmtClock(info.diffSecs)}` : fmtClock(info.liveWorkedSecs)}
                      </Text>
                      <Sub style={{ fontSize: 11 }}>{info.allottedSecs !== null ? (info.crossed ? 'over' : 'left') : 'worked'}</Sub>
                    </Row>
                    <Button small variant={info.unconfirmed ? 'amber' : t.running ? 'outline' : 'primary'} loading={busyId === t.id}
                      title={info.unconfirmed ? 'Confirm & Start' : t.running ? 'Stop' : 'Start'}
                      icon={info.unconfirmed ? <CheckCircle2 size={13} color="#fff" /> : t.running ? <Square size={12} color={colors.text2} /> : <Play size={12} color="#fff" />}
                      onPress={() => handleAction(t)} />
                  </Row>
                )}
                {!t.running && t.overrunSeconds > 0 ? <Text style={{ marginTop: 6, fontSize: 11, fontWeight: '700', color: colors.red }}>Time crossed by {fmtSeconds(t.overrunSeconds)}</Text> : null}
                {t.status === 'Done' && t.savedSeconds > 0 ? <Text style={{ marginTop: 6, fontSize: 11, fontWeight: '700', color: colors.emerald }}>Time saved: {fmtSeconds(t.savedSeconds)}</Text> : null}
              </Card>
            );
          }}
        />
      )}

      <Sheet visible={showNew} onClose={() => setShowNew(false)} title="New task">
        <View>
          <ErrorBox message={formError} />
          <Input label="Title" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="What needs doing?" />
          <Input label="Description" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} multiline />
          <Row gap={10}>
            <View style={{ flex: 1 }}><Select label="Priority" value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={PRIORITIES} /></View>
            <DateField label="Due date" value={form.dueDate} onChange={(v) => setForm({ ...form, dueDate: v })} placeholder="Optional" />
          </Row>
          <Row gap={10}>
            <View style={{ flex: 1 }}><Input label="Hours" value={form.timerHours} onChangeText={(v) => setForm({ ...form, timerHours: v })} keyboardType="numeric" placeholder="0" /></View>
            <View style={{ flex: 1 }}><Input label="Minutes" value={form.timerMinutes} onChangeText={(v) => setForm({ ...form, timerMinutes: v })} keyboardType="numeric" placeholder="30" /></View>
          </Row>
          <Row gap={8}>
            <View style={{ flex: 1 }}><Input label="Subtasks" value={subInput} onChangeText={setSubInput} onSubmitEditing={addSub} placeholder="Add a subtask and press +" /></View>
            <Button small variant="outline" icon={<Plus size={14} color={colors.text2} />} onPress={addSub} style={{ marginTop: 10 }} />
          </Row>
          {subtasks.map((s, i) => (
            <Row key={`${s}-${i}`} between style={{ paddingVertical: 4 }}>
              <T small>• {s}</T>
              <Pressable onPress={() => setSubtasks((arr) => arr.filter((_, j) => j !== i))} hitSlop={8}><X size={14} color={colors.faint} /></Pressable>
            </Row>
          ))}
          <Button title="Create task" loading={saving} onPress={handleCreate} style={{ marginTop: 8 }} />
        </View>
      </Sheet>
    </>
  );
}
