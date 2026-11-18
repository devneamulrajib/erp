// Port of portal/components/SalaryCard.jsx: amounts are hidden until the employee
// re-enters their password (POST /employee/salary/unlock -> 5-minute token, kept in memory only),
// and auto-hide again after 30 seconds.
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { Lock, EyeOff, ChevronDown, ChevronUp } from 'lucide-react-native';
import { getSalarySummary, unlockSalary } from '../portal/api/portalEmployee';
import { Badge, Button, Card, Input, KV, Row, Sheet, Sub, T, ErrorBox } from './ui';
import { colors } from '../theme';
import { money, fmtDate, MONTH_SHORT, errMsg } from '../utils/format';

const AUTO_HIDE_SECONDS = 30;
let unlock = { token: null, expiresAt: 0 }; // memory only, like salaryUnlock.js
const getUnlockToken = () => (unlock.token && Date.now() < unlock.expiresAt - 5000 ? unlock.token : null);

function Section({ title, isOpen, onToggle, children }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Pressable onPress={onToggle}>
        <Row between><T bold>{title}</T>{isOpen ? <ChevronUp size={16} color={colors.muted} /> : <ChevronDown size={16} color={colors.muted} />}</Row>
      </Pressable>
      {isOpen ? children : null}
    </View>
  );
}

export default function SalaryCard() {
  const [data, setData] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUnlock, setShowUnlock] = useState(false);
  const [password, setPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  const [open, setOpen] = useState({ breakdown: false, advance: true, leave: true });
  const timer = useRef(null);

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const hide = () => { setRevealed(false); setData(null); setError(''); };

  useEffect(() => {
    if (!revealed) return undefined;
    const deadline = Date.now() + AUTO_HIDE_SECONDS * 1000;
    timer.current = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) hide(); else setSecondsLeft(left);
    }, 1000);
    const sub = AppState.addEventListener('change', (st) => { if (st !== 'active') hide(); });
    return () => { clearInterval(timer.current); sub.remove(); };
  }, [revealed]);

  async function loadSummary(token) {
    setLoading(true);
    setError('');
    try {
      const d = await getSalarySummary(token);
      setData(d);
      setSecondsLeft(AUTO_HIDE_SECONDS);
      setRevealed(true);
    } catch (err) {
      if (err?.response?.status === 403 && err?.response?.data?.code === 'LOCKED') { unlock = { token: null, expiresAt: 0 }; setShowUnlock(true); }
      else setError('Could not load salary details. Tap to try again.');
    } finally {
      setLoading(false);
    }
  }

  function startReveal() {
    if (loading) return;
    const token = getUnlockToken();
    if (!token) { setShowUnlock(true); return; }
    loadSummary(token);
  }

  async function submitUnlock() {
    if (!password) return;
    setUnlockError('');
    setLoading(true);
    try {
      const { unlockToken, expiresInSeconds } = await unlockSalary(password);
      unlock = { token: unlockToken, expiresAt: Date.now() + (expiresInSeconds || 300) * 1000 };
      setPassword('');
      setShowUnlock(false);
      await loadSummary(unlockToken);
    } catch (err) {
      setUnlockError(errMsg(err, 'Incorrect password'));
      setLoading(false);
    }
  }

  const now = new Date();
  if (!revealed || !data) {
    return (
      <>
        <Card dark onPress={startReveal} style={{ marginBottom: 14 }}>
          <Row between>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#cbd5e1', fontSize: 12 }}>Salary · {MONTH_SHORT[now.getMonth()]} {now.getFullYear()}</Text>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700', marginTop: 4 }}>৳ ••••••</Text>
              <Text style={{ color: error ? '#fca5a5' : '#94a3b8', fontSize: 12, marginTop: 4 }}>{error || (loading ? 'Loading…' : 'Tap to unlock your salary, advance / loan and day off')}</Text>
            </View>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}><Lock size={18} color="#fff" /></View>
          </Row>
        </Card>
        <Sheet visible={showUnlock} onClose={() => setShowUnlock(false)} title="Confirm it's you">
          <Sub style={{ marginBottom: 12 }}>Enter your portal password to view salary details for 5 minutes.</Sub>
          <ErrorBox message={unlockError} />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry autoFocus onSubmitEditing={submitUnlock} />
          <Button title="Unlock" loading={loading} onPress={submitUnlock} />
        </Sheet>
      </>
    );
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <Row between>
        <View>
          <Sub>{data.isEstimate ? 'Estimated net' : 'Net paid'}</Sub>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.text }}>{money(data.net)}</Text>
          {!data.isEstimate && data.paidDate ? <Sub>Paid on {fmtDate(data.paidDate)}</Sub> : null}
        </View>
        <Pressable onPress={hide} style={{ alignItems: 'center' }}>
          <EyeOff size={18} color={colors.muted} />
          <Sub style={{ fontSize: 10 }}>{secondsLeft}s</Sub>
        </Pressable>
      </Row>

      <Section isOpen={open.breakdown} onToggle={() => toggle('breakdown')} title="Breakdown">
        <KV label="Basic salary" value={money(data.basicSalary)} />
        <KV label="House rent" value={money(data.houseRent)} />
        <KV label="Medical" value={money(data.medicalAllowance)} />
        {Number(data.otherAllowance) ? <KV label="Other allowance" value={money(data.otherAllowance)} /> : null}
        {Number(data.otherAddition) ? <KV label="Other addition" value={money(data.otherAddition)} /> : null}
        <KV label="Gross" value={money(data.gross)} strong />
        {Number(data.advanceDeduction) ? <KV label="Advance / loan deduction" value={`- ${money(data.advanceDeduction)}`} /> : null}
        {Number(data.otherDeduction) ? <KV label="Other deduction" value={`- ${money(data.otherDeduction)}`} /> : null}
        <KV label="Total deduction" value={`- ${money(data.totalDeduction)}`} />
        <KV label="Net" value={money(data.net)} strong last />
      </Section>

      <Section isOpen={open.advance} onToggle={() => toggle('advance')} title={`Advance / Loan (${data.advances?.length || 0})`}>
        {(data.advances || []).length === 0 ? <Sub style={{ marginTop: 6 }}>No advances or loans.</Sub> : data.advances.map((a) => (
          <View key={a.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <Row between><T bold>{a.type} · {money(a.amount)}</T><Badge status={a.status} /></Row>
            <Sub>Paid {money(a.paidAmount)} · Remaining {money(a.remaining)}{Number(a.dueThisMonth) ? ` · This month ${money(a.dueThisMonth)}` : ''}</Sub>
          </View>
        ))}
      </Section>

      <Section isOpen={open.leave} onToggle={() => toggle('leave')} title={`Day off (${data.approvedLeaveDays ?? (data.leaves || []).length} days approved)`}>
        {(data.leaves || []).length === 0 ? <Sub style={{ marginTop: 6 }}>No leave this month.</Sub> : data.leaves.map((l) => (
          <View key={l.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
            <Row between><T bold>{fmtDate(l.fromDate)} – {fmtDate(l.toDate)}</T><Badge status={l.status} /></Row>
            <Sub>{l.days} day(s){l.reason ? ` · ${l.reason}` : ''}</Sub>
          </View>
        ))}
      </Section>
    </Card>
  );
}
