// Port of PortalWorkLogPage.jsx — daily time log + manual entry (server enforces a 2-day window).
import { useState } from 'react';
import { View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { getWorkLog, listMyTasks, addManualTime, fmtMinutes, fmtTime } from '../../portal/api/portalTasks';
import { Button, Card, DateField, Empty, ErrorBox, H2, Input, Loading, Row, Screen, Select, Sheet, Stat, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { ymd, errMsg } from '../../utils/format';

export default function WorkLogScreen() {
  const [date, setDate] = useState(ymd(new Date()));
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => getWorkLog(date), [date]);
  const tasksQ = useAsync(() => listMyTasks(''), []);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ taskId: '', start: '09:00', end: '10:00', note: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const tasks = (Array.isArray(tasksQ.data) ? tasksQ.data : []).filter((t) => t.status !== 'Cancelled');

  async function save() {
    if (!form.taskId) { setFormError('Pick a task.'); return; }
    if (form.end <= form.start) { setFormError('End time must be after start time.'); return; }
    setBusy(true);
    setFormError('');
    try {
      await addManualTime({ taskId: Number(form.taskId), startedAt: new Date(`${date}T${form.start}:00`).toISOString(), endedAt: new Date(`${date}T${form.end}:00`).toISOString(), note: form.note });
      setShow(false);
      setForm({ taskId: '', start: '09:00', end: '10:00', note: '' });
      reload();
    } catch (err) {
      setFormError(errMsg(err, 'Could not save the entry.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Row gap={10} style={{ alignItems: 'flex-end' }}>
        <DateField label="Day" value={date} onChange={setDate} maximumDate={new Date()} />
        <Button small title="Add time" icon={<Plus size={14} color="#fff" />} onPress={() => setShow(true)} style={{ marginBottom: 12 }} />
      </Row>
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data ? <Loading /> : data && (
        <>
          <Row gap={10} style={{ marginBottom: 10 }}>
            <Stat label="Worked" value={fmtMinutes(data.workedMinutes)} tone={[colors.emerald, colors.emeraldSoft]} />
            <Stat label="Idle" value={fmtMinutes(data.idleMinutes)} tone={[colors.amber, colors.amberSoft]} />
          </Row>
          <Card style={{ marginBottom: 14 }}>
            <Row between><Sub>Check in</Sub><T bold>{fmtTime(data.checkInAt)}</T></Row>
            <Row between style={{ marginTop: 6 }}><Sub>Check out</Sub><T bold>{fmtTime(data.checkOutAt)}</T></Row>
            {data.basis ? <Sub style={{ marginTop: 6, fontSize: 11 }}>Idle time is based on {data.basis}.</Sub> : null}
          </Card>
          <H2 style={{ marginBottom: 8 }}>Entries</H2>
          {(data.logs || []).length === 0 ? <Empty text="No time logged on this day." /> : data.logs.map((l) => (
            <Card key={l.id} style={{ marginBottom: 10 }}>
              <Row between>
                <View style={{ flex: 1 }}>
                  <T bold numberOfLines={1}>{l.taskTitle || 'Task'}</T>
                  <Sub>{fmtTime(l.startedAt)} – {l.endedAt ? fmtTime(l.endedAt) : 'running'}{l.note ? ` · ${l.note}` : ''}</Sub>
                </View>
                <Sub style={{ fontSize: 11 }}>{l.source}</Sub>
              </Row>
            </Card>
          ))}
        </>
      )}

      <Sheet visible={show} onClose={() => setShow(false)} title="Add time manually">
        <Sub style={{ marginBottom: 10 }}>For {date}. You can add time for today and the last 2 days.</Sub>
        <ErrorBox message={formError} />
        <Select label="Task" value={form.taskId} onChange={(v) => setForm({ ...form, taskId: v })} options={tasks.map((t) => ({ value: t.id, label: t.title }))} placeholder="Pick a task" />
        <Row gap={10}>
          <DateField mode="time" label="Start" value={form.start} onChange={(v) => setForm({ ...form, start: v })} />
          <DateField mode="time" label="End" value={form.end} onChange={(v) => setForm({ ...form, end: v })} />
        </Row>
        <Input label="Note" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} placeholder="Optional" />
        <Button title="Save entry" loading={busy} onPress={save} />
      </Sheet>
    </Screen>
  );
}
