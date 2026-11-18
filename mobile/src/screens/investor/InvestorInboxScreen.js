// Port of PortalInvestorInbox.jsx — messages, documents, notes and activity.
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Send, FileText, Download } from 'lucide-react-native';
import {
  getInboxSummary, getInboxMessages, sendInboxMessage, markInboxRead, getInboxDocuments,
  downloadInboxDocument, getInboxNotes, getInboxActivity,
} from '../../portal/api/portalInvestor';
import { Button, Card, Empty, ErrorBox, Input, Loading, Row, Screen, Segmented, Sheet, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { fmtDate, fmtDateTime, money, errMsg } from '../../utils/format';

const TABS = [['messages', 'Messages'], ['documents', 'Documents'], ['notes', 'Notes'], ['activity', 'Activity']];
const fmtBytes = (n) => { const b = Number(n) || 0; if (b < 1024) return `${b} B`; if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`; return `${(b / 1048576).toFixed(1)} MB`; };
const LOADERS = { messages: getInboxMessages, documents: getInboxDocuments, notes: getInboxNotes, activity: getInboxActivity };

export default function InvestorInboxScreen() {
  const [tab, setTab] = useState('messages');
  const summaryQ = useAsync(() => getInboxSummary().then((r) => r.data));
  const { data, loading, error, refreshing, refresh, reload } = useAsync(() => LOADERS[tab]().then((r) => (Array.isArray(r.data) ? r.data : [])), [tab]);
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [dl, setDl] = useState(null);

  useEffect(() => {
    if (tab === 'messages' && (data || []).some((m) => m.direction === 'outbound' && !m.readAt)) {
      markInboxRead().then(() => summaryQ.reload()).catch(() => {});
    }
  }, [tab, data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!body.trim()) { setSendErr('Write a message first.'); return; }
    setSending(true); setSendErr('');
    try { await sendInboxMessage({ subject, body }); setSubject(''); setBody(''); setCompose(false); reload(); }
    catch (err) { setSendErr(errMsg(err, 'Could not send your message.')); }
    finally { setSending(false); }
  }

  async function download(doc) {
    setDl(doc.id);
    try { await downloadInboxDocument(doc.id, doc.originalName || doc.title); }
    catch (err) { Alert.alert('Download failed', errMsg(err, 'Could not download the document.')); }
    finally { setDl(null); }
  }

  const s = summaryQ.data || {};
  const tabs = TABS.map(([k, l]) => [k, k === 'messages' && s.unreadMessages ? `${l} (${s.unreadMessages})` : k === 'documents' && s.documents ? `${l} (${s.documents})` : l]);
  const list = data || [];

  return (
    <Screen refreshing={refreshing} onRefresh={() => { refresh(); summaryQ.reload(); }}>
      <Segmented options={tabs} value={tab} onChange={setTab} accent={colors.indigo} />
      <ErrorBox message={error} onRetry={reload} />
      {tab === 'messages' && <Button variant="indigo" title="New message" icon={<Send size={15} color="#fff" />} onPress={() => setCompose(true)} style={{ marginBottom: 12 }} />}
      {loading ? <Loading /> : list.length === 0 ? <Empty text={`No ${tab} yet.`} /> : (
        <View style={{ gap: 10 }}>
          {tab === 'messages' && list.map((m) => {
            const mine = m.direction === 'inbound';
            return (
              <Card key={m.id} style={[{ maxWidth: '90%' }, mine ? { alignSelf: 'flex-end', backgroundColor: colors.indigoSoft, borderColor: colors.indigoSoft } : { alignSelf: 'flex-start' }]}>
                {m.subject ? <T bold>{m.subject}</T> : null}
                <T>{m.body}</T>
                <Sub style={{ fontSize: 11, marginTop: 4 }}>{mine ? 'You' : 'Trikon'} · {fmtDateTime(m.createdAt)}</Sub>
              </Card>
            );
          })}
          {tab === 'documents' && list.map((d) => (
            <Card key={d.id}>
              <Row>
                <FileText size={20} color={colors.indigo} />
                <View style={{ flex: 1 }}>
                  <T bold numberOfLines={2}>{d.title}</T>
                  <Sub>{d.projectName ? `${d.projectName} · ` : ''}{fmtDate(d.createdAt)} · {fmtBytes(d.fileSize)}</Sub>
                </View>
                <Button small variant="outline" icon={<Download size={14} color={colors.text2} />} loading={dl === d.id} onPress={() => download(d)} />
              </Row>
            </Card>
          ))}
          {tab === 'notes' && list.map((n) => (
            <Card key={n.id}><T>{n.body}</T><Sub style={{ fontSize: 11, marginTop: 4 }}>{fmtDateTime(n.createdAt)}</Sub></Card>
          ))}
          {tab === 'activity' && list.map((ev, i) => (
            <Card key={ev.key || i}>
              <Row between>
                <View style={{ flex: 1 }}><T bold numberOfLines={1}>{ev.title}</T>{ev.detail ? <Sub>{ev.detail}</Sub> : null}<Sub style={{ fontSize: 11 }}>{fmtDate(ev.date)}</Sub></View>
                {ev.amount != null ? <T bold>{money(ev.amount)}</T> : null}
              </Row>
            </Card>
          ))}
        </View>
      )}
      <Sheet visible={compose} onClose={() => setCompose(false)} title="Message Trikon">
        <ErrorBox message={sendErr} />
        <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="Optional" />
        <Input label="Message" value={body} onChangeText={setBody} multiline />
        <Button variant="indigo" title="Send" loading={sending} onPress={send} />
      </Sheet>
    </Screen>
  );
}
