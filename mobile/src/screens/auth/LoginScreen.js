// Native login. "Team (ERP)" uses POST /api/auth/login; "Portal" uses
// POST /api/portal/auth/login, which works for every portal role
// (customer, supplier/vendor, employee, investor) with one form — same as the web.
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, Building2, Users } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, radius } from '../../theme';
import { Button, ErrorBox } from '../../components/ui';
import { errMsg } from '../../utils/format';

const MODES = [
  { key: 'portal', label: 'Portal', hint: 'Employee · Investor · Customer · Supplier', Icon: Users },
  { key: 'staff', label: 'Team (ERP)', hint: 'Admin, manager, accounts, HR, store, sales', Icon: Building2 },
];

export default function LoginScreen() {
  const { loginStaff, loginPortal } = useAuth();
  const [mode, setMode] = useState('portal');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) { setError('Enter your email / phone and password.'); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'staff') await loginStaff(email.trim(), password);
      else await loginPortal(email.trim(), password);
    } catch (err) {
      setError(errMsg(err, 'Login failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
          <View style={st.card}>
            <View style={st.brandRow}>
              <View style={st.logoBox}><Image source={require('../../../assets/trikon-logo.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" /></View>
              <Text style={st.brand}>TRIKON</Text>
            </View>
            <Text style={st.title}>Welcome Back!</Text>
            <Text style={st.subtitle}>We Are Happy To Have You Back</Text>

            <View style={st.modeRow}>
              {MODES.map(({ key, label, Icon }) => {
                const active = key === mode;
                return (
                  <Pressable key={key} onPress={() => { setMode(key); setError(''); }} style={[st.mode, active && st.modeActive]}>
                    <Icon size={15} color={active ? colors.white : colors.muted} />
                    <Text style={[st.modeText, active && { color: colors.white }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={st.hint}>{MODES.find((m) => m.key === mode).hint}</Text>

            <ErrorBox message={error} />

            <TextInput
              style={st.input}
              placeholder={mode === 'staff' ? 'Email' : 'Email or Phone Number'}
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="username"
              value={email}
              onChangeText={setEmail}
            />
            <View>
              <TextInput
                style={[st.input, { paddingRight: 44 }]}
                placeholder="Password"
                placeholderTextColor={colors.faint}
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />
              <Pressable style={st.eye} onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                {showPassword ? <EyeOff size={18} color={colors.faint} /> : <Eye size={18} color={colors.faint} />}
              </Pressable>
            </View>

            <Button title={loading ? 'Signing in...' : 'Login'} onPress={handleSubmit} loading={loading} style={{ marginTop: 6 }} />
            <Text style={st.footer}>Forgot your password? Contact the Trikon office / HR to reset it.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.borderLight },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  logoBox: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 6, backgroundColor: colors.white },
  brand: { fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.faint, marginTop: 2, marginBottom: 20 },
  modeRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 4, gap: 4 },
  mode: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  modeActive: { backgroundColor: colors.primary },
  modeText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  hint: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 8, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: colors.text, marginBottom: 12 },
  eye: { position: 'absolute', right: 14, top: 15 },
  footer: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: 16 },
});
