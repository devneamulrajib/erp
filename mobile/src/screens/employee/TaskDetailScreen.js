// Port of PortalTaskDetailPage.jsx — timer, progress, status, subtasks, conversation with attachments.
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { CheckCircle2, Play, Square, Plus, Trash2, Circle, CheckCircle, Paperclip, Send, Timer, FileText, X } from 'lucide-react-native';
import {
  getMyTask, updateMyTask, addProgress, confirmAndStartTask, startTimer, stopTimer,
  addMySubtask, updateMySubtask, deleteMySubtask, getMyTaskMessages, sendMyTaskMessage,
  resolvePortalFileUrl, fmtClock, fmtSeconds, fmtMinutes, fmtTime,
} from '../../portal/api/portalTasks';
import { Badge, Button, Card, ErrorBox, H1, H2, Loading, ProgressBar, Row, Screen, Select, Sub, T } from '../../components/ui';
import { TASK_STATUSES, PRIORITY_COLOR, timerInfo, useNow } from '../../portal/taskHelpers';
import { colors, radius } from '../../theme';
import { fmtDate, fmtDateTime, errMsg } from '../../utils/format';

const isImage = (m) => /^image\//.test(m || '');

export default function TaskDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [task, setTask] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [percent, setPercent] = useState('0');
  const [note, setNote] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [msgText, setMsgText] = useState('');
  const [msgFiles, setMsgFiles] = useState([]);
  const [msgBusy, setMsgBusy] = useState(false);
  const now = useNow(!!task?.running);

  const load = useCallback(async () => {
    try {
      const t = await getMyTask(id);
      setTask(t);
      setPercent(String(t.progress || 0));
      if (Array.isArray(t.messages)) setMessages(t.messages);
      setError('');
      navigation.setOptions({ title: t.title || 'Task' });
    } catch (e) {
      setError(errMsg(e, 'Could not load the task.'));
    }
  }, [id, navigation]);

  const pollMessages = useCallback(() => { getMyTaskMessages(id).then((m) => Array.isArray(m) && setMessages(m)).catch(() => {}); }, [id]);

  useEffect(() => { Promise.resolve().then(() => { load(); pollMessages(); }); }, [load, pollMessages]);
  useEffect(() => { const t = setInterval(pollMessages, 10000); return () => clearInterval(t); }, [pollMessages]);

  async function act(fn, fallback) {
    setBusy(true);
    setError('');
    try { await fn(); await load(); } catch (e) { setError(errMsg(e, fallback)); } finally { setBusy(false); }
  }

  async function pickFiles() {
    const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    setMsgFiles((f) => [...f, ...res.assets.map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType || 'application/octet-stream' }))]);
  }

  async function handleSendMessage() {
    if (!msgText.trim() && msgFiles.length === 0) return;
    setMsgBusy(true);
    setError('');
    try {
      const created = await sendMyTaskMessage(task.id, { message: msgText.trim(), files: msgFiles });
      setMessages((m) => [...m, created]);
      setMsgText('');
      setMsgFiles([]);
    } catch (err) {
      setError(errMsg(err, 'Could not send message.'));
    } finally {
      setMsgBusy(false);
    }
  }

  if (!task) return error ? <Screen><ErrorBox message={error} onRetry={load} /></Screen> : <Loading />;

  const info = timerInfo(task, now);
  const doneCount = (task.subtasks || []).filter((s) => s.isCompleted).length;

  return (
    <Screen refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); pollMessages(); setRefreshing(false); }}>
      <ErrorBox message={error} />
      <Card style={{ marginBottom: 12 }}>
        <Row between style={{ alignItems: 'flex-start' }}>
          <H1 style={{ fontSize: 19, flex: 1 }}>{task.title}</H1>
          <Badge status={task.status} />
        </Row>
        <Row style={{ marginTop: 6, flexWrap: 'wrap' }} gap={10}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: PRIORITY_COLOR[task.priority] || colors.muted }}>{task.priority}</Text>
          {task.dueDate ? <Sub>Due {fmtDate(task.dueDate)}</Sub> : null}
          {task.project?.name ? <Sub>{task.project.name}</Sub> : null}
          <Sub>From: {task.createdByType === 'admin' ? task.createdByName || 'Admin' : 'Me'}</Sub>
        </Row>
        {task.description ? <T style={{ marginTop: 10 }}>{task.description}</T> : null}

        {info.allottedSecs !== null && (
          <Row between style={{ marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: info.crossed ? colors.redSoft : task.status === 'Done' ? colors.emeraldSoft : colors.bg }}>
            <Row gap={6}><Timer size={15} color={info.crossed ? colors.red : colors.text2} /><T bold>{info.crossed ? 'Time Crossed' : task.status === 'Done' ? 'Time Saved' : 'Time Remaining'}</T></Row>
            <Text style={{ fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], color: info.crossed ? colors.red : colors.text }}>
              {info.crossed ? `+${fmtClock(info.diffSecs)}` : task.status === 'Done' ? fmtSeconds(task.savedSeconds ?? info.diffSecs) : fmtClock(info.diffSecs)}
            </Text>
          </Row>
        )}
        <Sub style={{ marginTop: 8 }}>Worked {fmtSeconds(info.liveWorkedSecs)}{task.estimatedMinutes ? ` of ${fmtMinutes(task.estimatedMinutes)}` : ''}</Sub>

        {!info.closed && (info.unconfirmed ? (
          <Button style={{ marginTop: 12 }} variant="amber" title="Confirm & Start Timer" loading={busy} icon={<CheckCircle2 size={16} color="#fff" />}
            onPress={() => act(() => confirmAndStartTask(task.id), 'Could not confirm and start timer.')} />
        ) : (
          <Button style={{ marginTop: 12 }} variant={task.running ? 'outline' : 'primary'} title={task.running ? 'Stop timer' : 'Resume timer'} loading={busy}
            icon={task.running ? <Square size={14} color={colors.text2} /> : <Play size={14} color="#fff" />}
            onPress={() => act(() => (task.running ? stopTimer(task.id) : startTimer(task.id)), 'Could not update the timer.')} />
        ))}
      </Card>

      {!info.closed && !info.unconfirmed && (
        <Card style={{ marginBottom: 12 }}>
          <H2>Progress · {task.progress || 0}%</H2>
          <View style={{ marginVertical: 10 }}><ProgressBar value={task.progress} /></View>
          <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {[0, 25, 50, 75, 100].map((p) => (
              <Pressable key={p} onPress={() => setPercent(String(p))} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: String(p) === percent ? colors.primary : colors.border, backgroundColor: String(p) === percent ? colors.primary : colors.white }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: String(p) === percent ? '#fff' : colors.muted }}>{p}%</Text>
              </Pressable>
            ))}
          </Row>
          <TextInput style={inputSt} value={note} onChangeText={setNote} placeholder="What did you do? (optional)" placeholderTextColor={colors.faint} />
          <Button style={{ marginTop: 10 }} title="Save progress" loading={busy} onPress={() => act(async () => { await addProgress(task.id, { percent: Number(percent), note }); setNote(''); }, 'Could not save progress.')} />
          <View style={{ marginTop: 12 }}>
            <Select label="Status" value={task.status} options={TASK_STATUSES} onChange={(v) => act(() => updateMyTask(task.id, { status: v }), 'Could not change status.')} />
          </View>
        </Card>
      )}

      <Card style={{ marginBottom: 12 }}>
        <H2>Subtasks {task.subtasks?.length ? `(${doneCount}/${task.subtasks.length})` : ''}</H2>
        {!info.closed && (
          <Row gap={8} style={{ marginTop: 10 }}>
            <TextInput style={[inputSt, { flex: 1 }]} value={subTitle} onChangeText={setSubTitle} placeholder="Add a subtask…" placeholderTextColor={colors.faint}
              onSubmitEditing={() => subTitle.trim() && act(async () => { await addMySubtask(task.id, { title: subTitle.trim() }); setSubTitle(''); }, 'Could not add subtask.')} />
            <Button small title="Add" icon={<Plus size={13} color="#fff" />} disabled={busy || !subTitle.trim()}
              onPress={() => act(async () => { await addMySubtask(task.id, { title: subTitle.trim() }); setSubTitle(''); }, 'Could not add subtask.')} />
          </Row>
        )}
        {(task.subtasks || []).map((st) => (
          <Row key={st.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <Pressable disabled={info.closed || busy} onPress={() => act(() => updateMySubtask(task.id, st.id, { isCompleted: !st.isCompleted }), 'Could not update subtask.')} hitSlop={6}>
              {st.isCompleted ? <CheckCircle size={18} color={colors.emerald} /> : <Circle size={18} color={colors.faint} />}
            </Pressable>
            <Text style={{ flex: 1, fontSize: 14, color: st.isCompleted ? colors.faint : colors.text, textDecorationLine: st.isCompleted ? 'line-through' : 'none' }}>{st.title}</Text>
            {(st.createdByType === 'employee' || task.createdByType === 'employee') && !info.closed ? (
              <Pressable hitSlop={8} onPress={() => Alert.alert('Delete subtask?', st.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => act(() => deleteMySubtask(task.id, st.id), 'Could not delete subtask.') }])}>
                <Trash2 size={15} color={colors.faint} />
              </Pressable>
            ) : null}
          </Row>
        ))}
        {!(task.subtasks || []).length ? <Sub style={{ marginTop: 8 }}>No subtasks.</Sub> : null}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <H2>Conversation</H2>
        {messages.length === 0 ? <Sub style={{ marginTop: 8 }}>No messages yet. Ask a question or share an update.</Sub> : null}
        {messages.map((m) => {
          const mine = m.senderType === 'employee';
          return (
            <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', marginTop: 10 }}>
              <View style={{ backgroundColor: mine ? colors.primary : colors.bg, borderRadius: 14, padding: 10 }}>
                {m.message ? <Text style={{ color: mine ? '#fff' : colors.text, fontSize: 14 }}>{m.message}</Text> : null}
                {(m.attachments || []).map((a) => {
                  const url = resolvePortalFileUrl(a.filePath);
                  return isImage(a.mimeType) ? (
                    <Pressable key={a.id} onPress={() => Linking.openURL(url)}><Image source={{ uri: url }} style={{ width: 180, height: 140, borderRadius: 8, marginTop: 6 }} /></Pressable>
                  ) : (
                    <Pressable key={a.id} onPress={() => Linking.openURL(url)}>
                      <Row gap={6} style={{ marginTop: 6 }}><FileText size={14} color={mine ? '#fff' : colors.text2} /><Text style={{ color: mine ? '#fff' : colors.text2, textDecorationLine: 'underline', fontSize: 13 }} numberOfLines={1}>{a.fileName}</Text></Row>
                    </Pressable>
                  );
                })}
              </View>
              <Sub style={{ fontSize: 10, marginTop: 2, textAlign: mine ? 'right' : 'left' }}>{mine ? 'You' : m.senderName || 'Admin'} · {fmtDateTime(m.createdAt)}</Sub>
            </View>
          );
        })}
        {msgFiles.length > 0 && (
          <View style={{ marginTop: 10 }}>
            {msgFiles.map((f, i) => (
              <Row key={`${f.uri}-${i}`} between><Sub numberOfLines={1} style={{ flex: 1 }}>📎 {f.name}</Sub><Pressable onPress={() => setMsgFiles((a) => a.filter((_, j) => j !== i))}><X size={14} color={colors.faint} /></Pressable></Row>
            ))}
          </View>
        )}
        <Row gap={8} style={{ marginTop: 12 }}>
          <Pressable onPress={pickFiles} hitSlop={8}><Paperclip size={20} color={colors.muted} /></Pressable>
          <TextInput style={[inputSt, { flex: 1 }]} value={msgText} onChangeText={setMsgText} placeholder="Write a message…" placeholderTextColor={colors.faint} multiline />
          <Button small icon={<Send size={14} color="#fff" />} loading={msgBusy} onPress={handleSendMessage} />
        </Row>
      </Card>

      {(task.progressUpdates || []).length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <H2>Progress history</H2>
          {task.progressUpdates.map((u) => (
            <View key={u.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Row between><T bold>{u.percent}%</T><Sub>{fmtDateTime(u.createdAt)}</Sub></Row>
              {u.note ? <T small muted>{u.note}</T> : null}
            </View>
          ))}
        </Card>
      )}

      {(task.logs || []).length > 0 && (
        <Card>
          <H2>Time log</H2>
          {task.logs.map((l) => (
            <Row key={l.id} between style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <T small>{fmtDate(l.startedAt)} · {fmtTime(l.startedAt)} – {l.endedAt ? fmtTime(l.endedAt) : 'running'}</T>
              <Sub style={{ fontSize: 11 }}>{l.source}</Sub>
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const inputSt = { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, backgroundColor: colors.white, maxHeight: 120 };
