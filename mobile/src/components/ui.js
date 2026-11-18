// Small set of UI primitives that reproduce the web portal's Tailwind look
// (white rounded cards on slate-100, slate-900 primary buttons, amber accents).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Check, ChevronDown, Calendar, Inbox, X } from 'lucide-react-native';
import { colors, radius, STATUS_TONES } from '../theme';
import { fmtDate, ymd } from '../utils/format';

/* ------------------------------ data hook ------------------------------ */
// useAsync(loader, deps) -> { data, loading, error, reload, refreshing, refresh, setData }
// Re-runs `loader` whenever a value in `deps` changes (like a useEffect fetch in the web pages).
export function useAsync(loader, deps = []) {
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });
  const [nonce, setNonce] = useState({ n: 0, refresh: false });
  const [res, setRes] = useState({ key: null, data: null, error: '' });
  const key = `${JSON.stringify(deps)}#${nonce.n}`;

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => loaderRef.current())
      .then(
        (d) => { if (!cancelled) setRes({ key, data: d, error: '' }); },
        (err) => { if (!cancelled) setRes((r) => ({ key, data: r.data, error: err?.response?.data?.message || 'Could not load data right now.' })); }
      );
    return () => { cancelled = true; };
  }, [key]);

  const pending = res.key !== key;
  const setData = useCallback((u) => setRes((r) => ({ ...r, data: typeof u === 'function' ? u(r.data) : u })), []);
  const reload = useCallback(() => setNonce((x) => ({ n: x.n + 1, refresh: false })), []);
  const refresh = useCallback(() => setNonce((x) => ({ n: x.n + 1, refresh: true })), []);
  return { data: res.data, setData, loading: pending && !nonce.refresh, refreshing: pending && nonce.refresh, error: pending ? '' : res.error, reload, refresh };
}

/* ------------------------------ layout ------------------------------ */
export function Screen({ children, refreshing = false, onRefresh, scroll = true, style, contentStyle }) {
  if (!scroll) return <View style={[s.screen, style]}>{children}</View>;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[s.screen, style]}
        contentContainerStyle={[s.screenContent, contentStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function List({ data, renderItem, keyExtractor, refreshing, onRefresh, header, empty, footer }) {
  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.screenContent}
      data={data || []}
      renderItem={renderItem}
      keyExtractor={keyExtractor || ((item, i) => String(item?.id ?? item?.key ?? i))}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

export function Card({ children, style, onPress, dark }) {
  const st = [s.card, dark && s.cardDark, style];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...st, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={st}>{children}</View>;
}

export function Row({ children, style, gap = 8, between }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, between && { justifyContent: 'space-between' }, style]}>{children}</View>;
}

export function Spacer({ h = 12 }) {
  return <View style={{ height: h }} />;
}

/* ------------------------------ text ------------------------------ */
export function H1({ children, style }) { return <Text style={[s.h1, style]}>{children}</Text>; }
export function H2({ children, style }) { return <Text style={[s.h2, style]}>{children}</Text>; }
export function Sub({ children, style, numberOfLines }) { return <Text numberOfLines={numberOfLines} style={[s.sub, style]}>{children}</Text>; }
export function T({ children, style, numberOfLines, bold, muted, small }) {
  return (
    <Text numberOfLines={numberOfLines} style={[s.t, bold && { fontWeight: '600' }, muted && { color: colors.muted }, small && { fontSize: 12 }, style]}>
      {children}
    </Text>
  );
}
export function Label({ children }) { return <Text style={s.label}>{children}</Text>; }

export function PageHeader({ title, subtitle, right }) {
  return (
    <Row between style={{ marginBottom: 16, alignItems: 'flex-start' }}>
      <View style={{ flex: 1 }}>
        <H1>{title}</H1>
        {subtitle ? <Sub style={{ marginTop: 2 }}>{subtitle}</Sub> : null}
      </View>
      {right}
    </Row>
  );
}

/* ------------------------------ controls ------------------------------ */
export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style, small }) {
  const v = BTN[variant] || BTN.primary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: v.bg, borderColor: v.border }, (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.8 }, style]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon}
      {title ? <Text style={[s.btnText, small && { fontSize: 12 }, { color: v.fg }]}>{title}</Text> : null}
    </Pressable>
  );
}
const BTN = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary },
  amber: { bg: colors.amber, fg: colors.white, border: colors.amber },
  outline: { bg: colors.white, fg: colors.text2, border: colors.border },
  danger: { bg: colors.white, fg: colors.red, border: '#fecaca' },
  success: { bg: colors.emerald, fg: colors.white, border: colors.emerald },
  indigo: { bg: colors.indigo, fg: colors.white, border: colors.indigo },
  ghost: { bg: 'transparent', fg: colors.text2, border: 'transparent' },
};

export function Input({ label, style, multiline, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        placeholderTextColor={colors.faint}
        style={[s.input, multiline && { minHeight: 90, textAlignVertical: 'top' }, style]}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}

// Modal-based replacement for <select>. options: [{ value, label }] or strings.
export function Select({ label, value, options, onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const opts = (options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) }));
  const current = opts.find((o) => String(o.value) === String(value));
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Label>{label}</Label> : null}
      <Pressable style={[s.input, s.selectBox]} onPress={() => setOpen(true)}>
        <Text style={{ color: current ? colors.text : colors.faint, flex: 1 }} numberOfLines={1}>{current ? current.label : placeholder}</Text>
        <ChevronDown size={16} color={colors.faint} />
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title={label || placeholder}>
        <ScrollView style={{ maxHeight: 420 }}>
          {opts.map((o) => {
            const sel = String(o.value) === String(value);
            return (
              <Pressable key={String(o.value)} style={s.option} onPress={() => { onChange(o.value); setOpen(false); }}>
                <Text style={[s.t, sel && { fontWeight: '700' }]}>{o.label}</Text>
                {sel ? <Check size={16} color={colors.text} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

// value / onChange use 'YYYY-MM-DD' strings like the web <input type="date">.
export function DateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate, placeholder = 'Pick a date' }) {
  const [iosOpen, setIosOpen] = useState(false);
  const toDateObj = () => {
    if (!value) return new Date();
    if (mode === 'time') { const [h, m] = String(value).split(':'); const d = new Date(); d.setHours(+h || 0, +m || 0, 0, 0); return d; }
    return new Date(`${value}T00:00:00`);
  };
  const emit = (d) => {
    if (!d) return;
    if (mode === 'time') onChange(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    else onChange(ymd(d));
  };
  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: toDateObj(), mode, minimumDate, maximumDate, is24Hour: true,
        onChange: (e, d) => { if (e.type === 'set') emit(d); },
      });
    } else setIosOpen(true);
  };
  const shown = value ? (mode === 'time' ? value : fmtDate(value)) : placeholder;
  return (
    <View style={{ marginBottom: 12, flex: 1 }}>
      {label ? <Label>{label}</Label> : null}
      <Pressable style={[s.input, s.selectBox]} onPress={open}>
        <Text style={{ color: value ? colors.text : colors.faint, flex: 1 }}>{shown}</Text>
        <Calendar size={16} color={colors.faint} />
      </Pressable>
      {Platform.OS === 'ios' && (
        <Sheet visible={iosOpen} onClose={() => setIosOpen(false)} title={label || 'Select'}>
          <DateTimePicker value={toDateObj()} mode={mode} display="spinner" minimumDate={minimumDate} maximumDate={maximumDate}
            onChange={(e, d) => emit(d)} />
          <Button title="Done" onPress={() => setIosOpen(false)} />
        </Sheet>
      )}
    </View>
  );
}

// Horizontal pill tabs (filters like All / Active / Matured).
export function Segmented({ options, value, onChange, accent = colors.primary }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {options.map(([key, label]) => {
        const active = key === value;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={[s.pill, active && { backgroundColor: accent, borderColor: accent }]}>
            <Text style={[s.pillText, active && { color: colors.white }]}>{label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Sheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={s.sheet}>
          <Row between style={{ marginBottom: 12 }}>
            <H2>{title}</H2>
            <Pressable onPress={onClose} hitSlop={12}><X size={20} color={colors.muted} /></Pressable>
          </Row>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------ display ------------------------------ */
export function Badge({ status, label, tone }) {
  const [fg, bg] = tone || STATUS_TONES[status] || [colors.muted, colors.bg];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label || status || '—'}</Text>
    </View>
  );
}

export function KV({ label, value, strong, last }) {
  return (
    <Row between style={[s.kv, last && { borderBottomWidth: 0 }]}>
      <Text style={s.kvLabel}>{label}</Text>
      <Text style={[s.kvValue, strong && { fontWeight: '700', color: colors.text }]} numberOfLines={2}>{value ?? '—'}</Text>
    </Row>
  );
}

export function Stat({ label, value, icon, tone = [colors.text, colors.bg], style }) {
  return (
    <View style={[s.stat, style]}>
      <Row between>
        <Text style={s.statLabel}>{label}</Text>
        {icon ? <View style={[s.statIcon, { backgroundColor: tone[1] }]}>{icon}</View> : null}
      </Row>
      <Text style={[s.statValue, { color: tone[0] }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.primary }) {
  return (
    <View style={s.progress}>
      <View style={{ height: '100%', width: `${Math.max(0, Math.min(100, value || 0))}%`, backgroundColor: color, borderRadius: 99 }} />
    </View>
  );
}

export function Loading({ text = 'Loading…' }) {
  return (
    <View style={s.center}>
      <ActivityIndicator color={colors.text} />
      <Text style={[s.sub, { marginTop: 8 }]}>{text}</Text>
    </View>
  );
}

export function ErrorBox({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={s.error}>
      <Text style={{ color: colors.red, fontSize: 13, flex: 1 }}>{message}</Text>
      {onRetry ? <Pressable onPress={onRetry}><Text style={{ color: colors.red, fontWeight: '700' }}>Retry</Text></Pressable> : null}
    </View>
  );
}

export function Notice({ message, tone = 'success' }) {
  if (!message) return null;
  const c = tone === 'success' ? [colors.emerald, colors.emeraldSoft] : [colors.amber, colors.amberSoft];
  return <View style={[s.error, { backgroundColor: c[1], borderColor: c[1] }]}><Text style={{ color: c[0], fontSize: 13 }}>{message}</Text></View>;
}

export function Empty({ text = 'Nothing here yet.', icon }) {
  return (
    <View style={[s.card, s.center, { paddingVertical: 36 }]}>
      {icon || <Inbox size={28} color={colors.faint} />}
      <Text style={[s.sub, { marginTop: 8, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  cardDark: { backgroundColor: colors.primary, borderColor: colors.primary },
  h1: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  h2: { fontSize: 16, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.faint },
  t: { fontSize: 14, color: colors.text2 },
  label: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16 },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.sm },
  btnText: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: colors.text, backgroundColor: colors.white },
  selectBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '85%' },
  badge: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  kv: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight, alignItems: 'flex-start' },
  kvLabel: { fontSize: 13, color: colors.muted, flex: 1 },
  kvValue: { fontSize: 13, color: colors.text2, fontWeight: '500', flex: 1.3, textAlign: 'right' },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  progress: { height: 6, borderRadius: 99, backgroundColor: colors.borderLight, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.redSoft, borderWidth: 1, borderColor: '#fee2e2', borderRadius: radius.md, padding: 12, marginBottom: 12 },
});
