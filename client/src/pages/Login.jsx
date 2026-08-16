import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiArrowUpRight } from 'react-icons/fi';
import api from '../api/axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);

      const { data } = await api.post('/auth/login', {
        email,
        password,
      });

      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">

        <div className="absolute -top-32 -right-20 w-[420px] h-[420px] rounded-full bg-indigo-100/60 blur-3xl" />

        <div className="absolute -bottom-40 -left-20 w-[480px] h-[480px] rounded-full bg-blue-100/50 blur-3xl" />

        <div className="absolute top-[20%] left-[8%] w-2 h-2 rounded-full bg-indigo-300 animate-float" />
        <div className="absolute top-[70%] right-[10%] w-3 h-3 rounded-full bg-blue-300 animate-float-delay" />

      </div>

      {/* Main */}
      <div className="relative w-full max-w-[1050px] min-h-[650px] bg-white rounded-[28px] shadow-[0_25px_80px_rgba(38,52,77,0.10)] border border-white overflow-hidden grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* LEFT SIDE */}
        <div className="relative hidden lg:flex overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f4f7ff] to-[#e8f3ff] p-12">

          {/* Decorative circles */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full border border-indigo-200/60" />
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full border border-indigo-200/40" />

          <div className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-indigo-100/50" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between w-full">

            {/* Brand */}
            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl bg-white shadow-sm border border-indigo-100 flex items-center justify-center">
                <span className="text-lg font-bold text-indigo-600">
                  T
                </span>
              </div>

              <div>
                <h1 className="text-lg font-bold tracking-tight text-gray-900">
                  TRIKON
                </h1>

                <p className="text-[11px] text-gray-500">
                  Enterprise Resource Planning
                </p>
              </div>

            </div>

            {/* Main Visual */}
            <div className="relative flex items-center justify-center flex-1">

              {/* Main circle */}
              <div className="relative w-[300px] h-[300px] rounded-full bg-white/70 border border-white shadow-[0_20px_60px_rgba(79,70,229,0.08)] flex items-center justify-center animate-soft">

                {/* Inner circle */}
                <div className="w-[215px] h-[215px] rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-xl shadow-indigo-300/30">

                  <div className="w-[150px] h-[150px] rounded-[30px] bg-white/95 shadow-xl rotate-[-6deg] flex items-center justify-center">

                    <div className="space-y-3 w-[90px]">

                      <div className="flex gap-2">
                        <div className="h-3 w-3 rounded bg-indigo-500" />
                        <div className="h-3 flex-1 rounded bg-indigo-100" />
                      </div>

                      <div className="h-2 rounded bg-gray-100 w-full" />

                      <div className="h-2 rounded bg-gray-100 w-4/5" />

                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="h-7 rounded bg-indigo-50" />
                        <div className="h-7 rounded bg-blue-50" />
                        <div className="h-7 rounded bg-purple-50" />
                      </div>

                    </div>

                  </div>

                </div>

                {/* Floating elements */}
                <div className="absolute top-7 right-4 px-4 py-2 rounded-xl bg-white shadow-lg border border-gray-100 animate-float">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-gray-600">
                      Business overview
                    </span>
                  </div>
                </div>

                <div className="absolute bottom-8 left-0 px-4 py-2 rounded-xl bg-white shadow-lg border border-gray-100 animate-float-delay">
                  <span className="text-xs font-medium text-gray-600">
                    Everything in one place
                  </span>
                </div>

              </div>

            </div>

            {/* Bottom */}
            <div>
              <h2 className="text-3xl font-semibold text-gray-900 leading-tight max-w-md">
                Your business,
                <br />
                <span className="text-indigo-600">
                  connected.
                </span>
              </h2>

              <p className="mt-4 text-sm text-gray-500 max-w-sm leading-6">
                Manage your operations, projects, finance and resources
                from one simple platform.
              </p>
            </div>

          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center justify-center p-7 sm:p-12 lg:p-16">

          <div className="w-full max-w-[370px]">

            {/* Mobile Brand */}
            <div className="lg:hidden mb-10">

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                  <span className="font-bold text-lg">
                    T
                  </span>
                </div>

                <div>
                  <h1 className="font-bold text-gray-900">
                    TRIKON
                  </h1>

                  <p className="text-xs text-gray-400">
                    Enterprise Resource Planning
                  </p>
                </div>

              </div>

            </div>

            {/* Heading */}
            <div className="mb-8">

              <p className="text-sm font-medium text-indigo-600 mb-2">
                Welcome back
              </p>

              <h2 className="text-[30px] font-semibold tracking-tight text-gray-900">
                Sign in to continue
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Access your TRIKON workspace.
              </p>

            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                  className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />

              </div>

              {/* Password */}
              <div>

                <div className="flex items-center justify-between mb-2">

                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>

                  <button
                    type="button"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot password?
                  </button>

                </div>

                <div className="relative">

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full h-12 px-4 pr-12 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? (
                      <FiEyeOff size={17} />
                    ) : (
                      <FiEye size={17} />
                    )}
                  </button>

                </div>

              </div>

              {/* Remember */}
              <div className="flex items-center gap-2">

                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />

                <label
                  htmlFor="remember"
                  className="text-sm text-gray-500 cursor-pointer"
                >
                  Remember me
                </label>

              </div>

              {/* Button */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0"
              >

                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in

                    <FiArrowUpRight
                      size={17}
                      className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </>
                )}

              </button>

            </form>

            {/* Security note */}
            <div className="mt-8 pt-6 border-t border-gray-100">

              <p className="text-center text-xs text-gray-400">
                Secure access to your TRIKON workspace
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* Animations */}
      <style>{`

        @keyframes softFloat {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes floatDelay {
          0%, 100% {
            transform: translateY(-3px);
          }

          50% {
            transform: translateY(5px);
          }
        }

        .animate-soft {
          animation: softFloat 5s ease-in-out infinite;
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }

        .animate-float-delay {
          animation: floatDelay 4.5s ease-in-out infinite;
        }

      `}</style>

    </div>
  );
}