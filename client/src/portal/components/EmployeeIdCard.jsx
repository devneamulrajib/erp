import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import trikonLogo from '../../assets/trikon-logo.png';

const fmtDate = (d) =>
  d
    ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const FACE = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

function Logo({ className = '' }) {
  return (
    <div className={`rounded-xl bg-white p-1 shadow-sm flex items-center justify-center ${className}`}>
      <img src={trikonLogo} alt="Trikon" className="w-full h-full object-contain" draggable={false} />
    </div>
  );
}

function BackRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-900 text-right truncate">{value || '—'}</span>
    </div>
  );
}

export default function EmployeeIdCard({ profile }) {
  const [flipped, setFlipped] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  if (!profile) {
    return (
      <div className="mb-4 flex justify-center">
        <div className="w-full max-w-[280px] aspect-[54/86] rounded-[22px] bg-slate-100 animate-pulse" />
      </div>
    );
  }

  const name = profile.name || '';
  const firstName = name.trim().split(/\s+/)[0] || '—';
  const initials = (name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const showPhoto = profile.photo && !photoFailed;
  const toggle = () => setFlipped((f) => !f);

  return (
    <div className="mb-4 flex flex-col items-center">
      <div className="w-full max-w-[280px] aspect-[54/86]" style={{ perspective: '1200px' }}>
        <div
          role="button"
          tabIndex={0}
          aria-label={flipped ? 'Show front of ID card' : 'Show back of ID card'}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
          }}
          className="relative h-full w-full cursor-pointer outline-none [-webkit-tap-highlight-color:transparent] touch-manipulation"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ---------------- FRONT ---------------- */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[22px] bg-slate-900 shadow-xl shadow-slate-900/20"
            style={FACE}
          >
            {showPhoto ? (
              <img
                src={profile.photo}
                alt={name}
                onError={() => setPhotoFailed(true)}
                className="absolute inset-0 h-full w-full object-cover object-top"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950">
                <span className="text-7xl font-bold tracking-tight text-white/90">{initials}</span>
              </div>
            )}

            <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

            <Logo className="absolute left-4 top-4 h-10 w-10" />

            <div className="absolute bottom-5 left-5 right-16 min-w-0">
              <p className="truncate text-2xl font-bold uppercase tracking-wide text-white">{firstName}</p>
              <p className="mt-0.5 truncate text-xs font-medium text-white/80">{profile.designation || 'Employee'}</p>
            </div>

            <Logo className="absolute bottom-5 right-4 h-9 w-9" />
          </div>

          {/* ---------------- BACK ---------------- */}
          <div
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
            style={{ ...FACE, transform: 'rotateY(180deg)' }}
          >
            <div className="flex items-center gap-3 bg-slate-900 px-5 py-4">
              <Logo className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{name || '—'}</p>
                <p className="truncate text-[11px] text-white/70">
                  {profile.designation || 'Employee'}{profile.department ? ` · ${profile.department}` : ''}
                </p>
              </div>
            </div>

            <div className="flex-1 px-5 py-2">
              <BackRow label="Employee ID" value={profile.code} />
              <BackRow label="Joining date" value={fmtDate(profile.joiningDate)} />
              <BackRow label="Valid through" value="No expiry" />
              <BackRow label="Mobile" value={profile.phone} />
              <BackRow label="Blood group" value={profile.bloodGroup} />
            </div>

            <div className="px-5 pb-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                Trikon · Virtual ID
              </p>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 active:bg-slate-50 [-webkit-tap-highlight-color:transparent] touch-manipulation"
      >
        <RotateCw size={14} /> {flipped ? 'Show front' : 'Flip card'}
      </button>
    </div>
  );
}