// Port of PortalEmployeeProfilePage.jsx (+ EmployeeIdCard.jsx)
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { LogOut, KeyRound, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { getEmployeeProfile, changePassword, uploadEmployeePhoto } from '../../portal/api/portalEmployee';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, ErrorBox, H2, Input, KV, Loading, Notice, Row, Screen, Sub, useAsync } from '../../components/ui';
import { colors } from '../../theme';
import { fmtDate, initials, errMsg } from '../../utils/format';
import { resolveFileUrl } from '../../config';

export default function EmployeeProfileScreen() {
  const { logout } = useAuth();
  const { data: profile, loading, error, reload, refreshing, refresh } = useAsync(getEmployeeProfile);
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickAndUploadPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadEmployeePhoto(asset.uri, asset.fileName || 'photo.jpg', asset.mimeType || 'image/jpeg');
      await refresh();
    } catch (err) {
      Alert.alert('Upload failed', errMsg(err, 'Could not upload photo'));
    } finally {
      setUploading(false);
    }
  }

  async function submitPassword() {
    setPwError(''); setPwOk('');
    if (!currentPassword || !newPassword) { setPwError('Fill in both passwords.'); return; }
    if (newPassword.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirm) { setPwError('New passwords do not match.'); return; }
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrent(''); setNew(''); setConfirm('');
      setPwOk('Password changed.');
    } catch (err) {
      setPwError(errMsg(err, 'Could not change password'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  const p = profile || {};
  const photo = resolveFileUrl(p.photo);
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <ErrorBox message={error} onRetry={reload} />
      <Card dark style={{ marginBottom: 14, alignItems: 'center' }}>
        {photo ? <Image source={{ uri: photo }} style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 10 }} /> : (
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: '700', color: colors.text }}>{initials(p.name)}</Text>
          </View>
        )}
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{p.name}</Text>
        <Text style={{ color: '#cbd5e1', fontSize: 13 }}>{[p.designation, p.department].filter(Boolean).join(' · ')}</Text>
        {p.code ? <Text style={{ color: '#fcd34d', fontSize: 12, marginTop: 4, fontWeight: '700' }}>ID {p.code}</Text> : null}
        <View style={{ height: 12 }} />
        <Button
          title={uploading ? 'Uploading…' : 'Change photo'}
          loading={uploading}
          icon={<Camera size={16} color="#fff" />}
          onPress={pickAndUploadPhoto}
          disabled={uploading}
        />
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <H2>Details</H2>
        <KV label="Email" value={p.email || '—'} />
        <KV label="Phone" value={p.phone || '—'} />
        <KV label="Joined" value={fmtDate(p.joiningDate)} />
        {p.bloodGroup ? <KV label="Blood group" value={p.bloodGroup} /> : null}
        <KV label="Bank" value={p.bankName || '—'} />
        <KV label="Account no." value={p.bankAccountNo || '—'} last />
      </Card>
      <Card style={{ marginBottom: 14 }}>
        <Row><KeyRound size={16} color={colors.text} /><H2>Change password</H2></Row>
        <View style={{ height: 10 }} />
        <ErrorBox message={pwError} />
        <Notice message={pwOk} />
        <Input label="Current password" value={currentPassword} onChangeText={setCurrent} secureTextEntry />
        <Input label="New password" value={newPassword} onChangeText={setNew} secureTextEntry />
        <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Button title="Update password" loading={busy} onPress={submitPassword} />
      </Card>
      <Button variant="danger" title="Log out" icon={<LogOut size={16} color={colors.red} />}
        onPress={() => Alert.alert('Log out?', 'You will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: logout }])} />
      <Sub style={{ textAlign: 'center', marginTop: 12 }}>Need to update your details? Contact HR.</Sub>
    </Screen>
  );
}
