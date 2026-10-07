import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// text-base (16px) stops iOS Safari from zooming into the field on focus.
export default function PasswordField({ label, value, onChange, autoComplete, autoFocus, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      )}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full h-12 pl-3.5 pr-12 rounded-xl border border-slate-200 text-base text-slate-900 outline-none focus:border-slate-900"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-100 [-webkit-tap-highlight-color:transparent]"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}