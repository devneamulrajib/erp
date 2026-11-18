// Port of PortalAdvanceRequestPage.jsx
import { useState } from 'react';
import { View } from 'react-native';
import { Send } from 'lucide-react-native';
import { getEmployeeAdvances, requestEmployeeAdvance } from '../../portal/api/portalEmployee';
import { Badge, Button, Card, Empty, ErrorBox, H2, Input, Loading, Row, Screen, Select, Sub, T, useAsync } from '../../components/ui';
import { MONTHS, money, errMsg } from '../../utils/format';

function nextMonthDefault() {
  const d = new Date();
  const m = d.getMonth() + 2;
  return { year: d.getFullYear() + Math.floor((m - 1) / 12), month: ((m - 1) % 12) + 1 };
}

export default function AdvanceScreen() {
  const def = nextMonthDefault();
  const { data, loading, refreshing, refresh, reload } = useAsync(getEmployeeAdvances);
  const [type, setType] = useState('Advance Salary');
  const [amount, setAmount] = useState('');
  const [repaymentMonths, setRepaymentMonths] = useState('1');
  const [reason, setReason] = useState('');
  const [targetMonth, setTargetMonth] = useState(def.month);
  const [targetYear, setTargetYear] = useState(def.year);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError('Enter the amount you need.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await requestEmployeeAdvance({ type, amount, repaymentMonths: Number(repaymentMonths) || 1, reason, targetMonth, targetYear });
      setAmount(''); setReason(''); setRepaymentMonths('1');
      const d = nextMonthDefault(); setTargetMonth(d.month); setTargetYear(d.year);
      reload();
    } catch (err) {
      setError(errMsg(err, 'Failed to submit request'));
    } finally {
      setSubmitting(false);
    }
  }

  const list = Array.isArray(data) ? data : [];
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginBottom: 16 }}>
        <H2>Advance / Loan request</H2>
        <View style={{ height: 10 }} />
        <ErrorBox message={error} />
        <Select label="Type" value={type} onChange={setType} options={['Advance Salary', 'Loan']} />
        <Input label="Amount (৳)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 5000" />
        <Input label="Repayment months" value={repaymentMonths} onChangeText={setRepaymentMonths} keyboardType="numeric" />
        <Row gap={10}>
          <View style={{ flex: 1.4 }}><Select label="Deduct from" value={targetMonth} onChange={setTargetMonth} options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))} /></View>
          <View style={{ flex: 1 }}><Select label="Year" value={targetYear} onChange={setTargetYear} options={[def.year, def.year + 1]} /></View>
        </Row>
        <Input label="Reason" value={reason} onChangeText={setReason} multiline />
        <Button title="Submit Request" icon={<Send size={15} color="#fff" />} loading={submitting} onPress={handleSubmit} />
      </Card>
      <H2 style={{ marginBottom: 8 }}>My advances & loans</H2>
      {loading ? <Loading /> : list.length === 0 ? <Empty text="No requests yet" /> : list.map((a) => (
        <Card key={a.id} style={{ marginBottom: 10 }}>
          <Row between>
            <View style={{ flex: 1 }}>
              <T bold>{a.type} · {money(a.amount)}</T>
              <Sub>{a.monthlyDeduction ? `${money(a.monthlyDeduction)}/month · ` : ''}{a.targetMonth ? `from ${MONTHS[a.targetMonth - 1]} ${a.targetYear}` : ''}</Sub>
            </View>
            <Badge status={a.status} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
