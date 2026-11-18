// Port of PortalInvestorProfile.jsx
import { useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { getInvestorProfile, changeInvestorPassword } from '../../portal/api/portalInvestor';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, ErrorBox, H2, Input, KV, Loading, Notice, Screen, Sub, T, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { errMsg } from '../../utils/format';

export default function InvestorProfileScreen() {
  const { logout } = useAuth();
  const { data: p, loading, error, reload, refreshing, refresh } = useAsync(() => getInvestorProfile().then((r) => r.data));
  const [currPass, setCurr] = useState('');
  const [newPass, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  async function submit() {
    setMsg(''); setPwErr('');
    if (!currPass || !newPass) { setPwErr('Fill in both passwords.'); return; }
    if (newPass !== confirm) { setPwErr('New passwords do not match.'); return; }
    setBusy(true);
    try {
      const res = await changeInvestorPassword({ currentPassword: currPass, newPassword: newPass });
      setMsg(res.data?.message || 'Password updated successfully.');
      setCurr(''); setNew(''); setConfirm('');
    } catch (err) { setPwErr(errMsg(err, 'Could not update password.')); } finally { setBusy(false); }
  }

  if (loading) return <Loading />;
  const prof = p || {};
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ErrorBox message={error} onRetry={reload} />
      <Card style={{ marginBottom: 12, alignItems: 'center', backgroundColor: colors.indigo, borderColor: colors.indigo }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: colors.indigo }}>{prof.name ? prof.name.charAt(0).toUpperCase() : 'I'}</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{prof.name}</Text>
        <Text style={{ color: '#c7d2fe', fontSize: 12 }}>{prof.investorIdCode}{prof.memberSinceYear ? ` · Member since ${prof.memberSinceYear}` : ''}</Text>
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <H2>Contact</H2>
        <KV label="Email" value={prof.email || '—'} />
        <KV label="Phone" value={prof.phone || '—'} />
        <KV label="Address" value={prof.address || '—'} />
        <KV label="NID" value={prof.maskedNid || '—'} last />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <H2>Nominee</H2>
        <KV label="Name" value={prof.nomineeName || '—'} />
        <KV label="Relation" value={prof.nomineeRelation || '—'} />
        <KV label="Phone" value={prof.nomineePhone || '—'} />
        <KV label="NID" value={prof.maskedNomineeNid || '—'} last />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <H2>Change password</H2>
        <View style={{ height: 10 }} />
        <ErrorBox message={pwErr} />
        <Notice message={msg} />
        <Input label="Current password" value={currPass} onChangeText={setCurr} secureTextEntry />
        <Input label="New password" value={newPass} onChangeText={setNew} secureTextEntry />
        <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button variant="indigo" title="Update password" loading={busy} onPress={submit} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <T small>Questions about statements, tax certificates or agreement changes? Contact your relationship manager.</T>
        <Sub style={{ marginTop: 6, color: colors.indigo }} >
          <Text onPress={() => Linking.openURL('mailto:investor.relations@trikon.com')}>investor.relations@trikon.com</Text>
        </Sub>
      </Card>
      <Button variant="danger" title="Log out" icon={<LogOut size={16} color={colors.red} />}
        onPress={() => Alert.alert('Log out?', 'You will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
    </Screen>
  );
}
