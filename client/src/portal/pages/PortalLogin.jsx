import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { portalLogin } from '../api/portalAuth';

function LoginIllustration() {
  return (
    <svg viewBox="0 0 240 220" className="w-full max-w-[220px] mx-auto">
      <circle cx="70" cy="60" r="26" fill="#fde68a" opacity="0.5" />
      <circle cx="190" cy="40" r="14" fill="#fcd34d" opacity="0.4" />
      <rect x="120" y="30" width="80" height="150" rx="14" fill="#0f172a" />
      <rect x="128" y="46" width="64" height="118" rx="4" fill="#ffffff" />
      <rect x="138" y="60" width="44" height="6" rx="3" fill="#cbd5e1" />
      <rect x="138" y="74" width="34" height="6" rx="3" fill="#e2e8f0" />
      <rect x="138" y="88" width="40" height="6" rx="3" fill="#e2e8f0" />
      <circle cx="60" cy="120" r="20" fill="#1e293b" />
      <path d="M30 200 Q60 150 90 200 Z" fill="#1e293b" />
      <circle cx="53" cy="116" r="3" fill="#fbbf24" />
      <circle cx="67" cy="116" r="3" fill="#fbbf24" />
    </svg>
  );
}

function SocialButton({ children, label }) {
  return (
    <button type="button" aria-label={label} className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-colors">
      {children}
    </button>
  );
}

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await portalLogin(email, password);
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">

        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">Welcome Back!</h1>
          <p className="text-sm text-slate-400 mb-7">We Are Happy To Have You Back</p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-3 py-2.5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition placeholder:text-slate-400" placeholder="Email or Phone Number" />

            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-10 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition placeholder:text-slate-400" placeholder="Password" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex justify-end">
              <a href="/portal/forgot-password" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">Forgot password?</a>
            </div>

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-3 shadow-sm transition-colors disabled:opacity-60 mt-1">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400">Or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="flex items-center justify-center gap-3">
            <SocialButton label="Continue with Google">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" /><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.94 11.94 0 000 12c0 1.92.46 3.74 1.29 5.38l3.98-3.09z" /><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" /></svg>
            </SocialButton>
            <SocialButton label="Continue with Apple">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0f172a"><path d="M16.365 1.43c0 1.14-.396 2.194-1.09 3.07-.845.99-2.23 1.756-3.48 1.65-.15-1.12.42-2.29 1.12-3.02.79-.84 2.19-1.53 3.45-1.7zM20.6 17.2c-.42.98-.92 1.94-1.6 2.83-.86 1.14-1.75 2.27-3.16 2.3-1.36.03-1.8-.8-3.36-.8-1.55 0-2.05.78-3.34.83-1.36.05-2.4-1.23-3.27-2.36-1.77-2.3-3.13-6.5-1.3-9.34.9-1.4 2.5-2.29 4.24-2.32 1.32-.02 2.56.87 3.36.87.8 0 2.3-1.07 3.87-.92.66.03 2.5.27 3.7 2.02-.1.06-2.2 1.28-2.18 3.83.02 3.05 2.7 4.07 2.72 4.08z" /></svg>
            </SocialButton>
            <SocialButton label="Continue with Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692V11.01h3.128V8.414c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24h-1.918c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.696h-3.12V24h6.116C23.407 24 24 23.407 24 22.674V1.325C24 .593 23.407 0 22.675 0z" /></svg>
            </SocialButton>
          </div>
        </div>

        <div className="bg-slate-50 p-8 sm:p-10 flex flex-col items-center justify-center text-center border-t lg:border-t-0 lg:border-l border-slate-100">
          <LoginIllustration />
          <h2 className="text-lg font-bold text-slate-800 mt-4 mb-1">Don&apos;t Have An Account?</h2>
          <p className="text-sm text-slate-400 mb-6">Get Started By Creating Your New Account</p>
          <a href="/portal/register" className="inline-flex items-center justify-center w-full max-w-[200px] rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold py-2.5 hover:bg-white hover:border-slate-400 transition-colors">Register</a>
        </div>

      </div>
    </div>
  );
}