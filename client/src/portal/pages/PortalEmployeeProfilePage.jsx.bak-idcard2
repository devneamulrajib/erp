import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone, Mail, CalendarDays, Landmark, ListChecks, CalendarCheck, LogOut, ChevronRight, KeyRound, Loader2, CheckCircle2, Camera,
} from 'lucide-react';
import { getEmployeeProfile, changePassword, uploadEmployeePhoto } from '../api/portalEmployee';
import { portalLogout } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';
import BottomSheet from '../components/BottomSheet';
import PasswordField from '../components/PasswordField';
import EmployeeIdCard from '../components/EmployeeIdCard';

const TAP = '[-webkit-tap-highlight-color:transparent] touch-manipulation';

const maskAccount = (n) => (n ? `•••• ${String(n).slice(-4)}` : '—');
const fmtDate = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 truncate">{value || '—'}</p>
      </div>
    </div>
  );
}

function LinkRow({ to, onClick, icon, label, hint }) {
  const inner = (
    <>
      <span className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
      <ChevronRight size={18} className="text-slate-300 shrink-0" />
    </>
  );
  const cls = `flex items-center gap-3 px-4 py-3.5 min-h-[56px] w-full active:bg-slate-50 ${TAP}`;
  return to ? (
    <Link to={to} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

function ChangePasswordSheet({ open, onClose }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) { setCurrent(''); setNext(''); setConfirm(''); setError(''); setDone(false); }
  }, [open]);

  const tooShort = next.length > 0 && next.length < 8;
  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = current && next.length >= 8 && next === confirm && !busy;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not change your password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} title="Change password">
      {done ? (
        <div className="text-center py-4">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
          <p className="text-base font-semibold text-slate-900">Password updated</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">Use your new password next time you sign in.</p>
          <button
            type="button"
            onClick={onClose}
            className={`w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-semibold active:bg-slate-700 ${TAP}`}
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" autoFocus />
          <div>
            <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" />
            <p className={`text-[11px] mt-1 ${tooShort ? 'text-red-500' : 'text-slate-400'}`}>At least 8 characters.</p>
          </div>
          <div>
            <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            {mismatch && <p className="text-[11px] mt-1 text-red-500">Passwords don&apos;t match.</p>}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-2 active:bg-slate-700 disabled:opacity-50 ${TAP}`}
          >
            {busy && <Loader2 size={16} className="animate-spin" />}
            Update password
          </button>
        </form>
      )}
    </BottomSheet>
  );
}

export default function PortalEmployeeProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    getEmployeeProfile().then(setProfile).catch(() => setError('Could not load your profile.'));
  }, []);

  const logout = () => {
    portalLogout();
    navigate('/portal/login');
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const result = await uploadEmployeePhoto(file);
      setProfile((p) => (p ? { ...p, photo: result.photo } : p));
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <PortalLayout>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Profile</h1>

      {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

      {(profile || !error) && <EmployeeIdCard profile={profile} />}

      <div className="flex justify-center mb-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePhotoSelect}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 active:bg-slate-50 disabled:opacity-60 ${TAP}`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
          {uploading ? 'Uploading…' : 'Change photo'}
        </button>
      </div>
      {uploadError && (
        <p className="text-center text-sm text-red-600 mb-4">{uploadError}</p>
      )}

      <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 mb-2">
        <InfoRow icon={<Phone size={16} />} label="Phone" value={profile?.phone} />
        <InfoRow icon={<Mail size={16} />} label="Email" value={profile?.email} />
        <InfoRow icon={<CalendarDays size={16} />} label="Joined" value={fmtDate(profile?.joiningDate)} />
        <InfoRow
          icon={<Landmark size={16} />}
          label="Bank account"
          value={profile?.bankName ? `${profile.bankName} · ${maskAccount(profile.bankAccountNo)}` : maskAccount(profile?.bankAccountNo)}
        />
      </div>
      <p className="text-[11px] text-slate-400 px-1 mb-4">Something wrong here? Ask HR to update your details.</p>

      <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100 mb-4">
        <LinkRow to="/portal/employee/requests" icon={<ListChecks size={16} />} label="My Requests" hint="Day off, advance and attendance corrections" />
        <LinkRow to="/portal/employee/attendance" icon={<CalendarCheck size={16} />} label="Attendance" hint="Your monthly and yearly record" />
        <LinkRow onClick={() => setShowPassword(true)} icon={<KeyRound size={16} />} label="Change password" hint="Update your sign-in password" />
      </div>

      <button
        type="button"
        onClick={() => setConfirmLogout(true)}
        className={`w-full h-12 rounded-2xl border border-red-200 bg-white text-red-600 text-sm font-semibold flex items-center justify-center gap-2 active:bg-red-50 ${TAP}`}
      >
        <LogOut size={16} /> Log out
      </button>

      <ChangePasswordSheet open={showPassword} onClose={() => setShowPassword(false)} />

      <BottomSheet open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Log out?">
        <p className="text-sm text-slate-500 mb-4">You will need your password to sign in again.</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfirmLogout(false)}
            className={`h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 active:bg-slate-100 ${TAP}`}
          >
            Stay
          </button>
          <button
            type="button"
            onClick={logout}
            className={`h-12 rounded-xl bg-red-600 text-white text-sm font-semibold active:bg-red-700 ${TAP}`}
          >
            Log out
          </button>
        </div>
      </BottomSheet>
    </PortalLayout>
  );
}