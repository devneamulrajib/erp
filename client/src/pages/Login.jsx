import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiMail, FiLock } from 'react-icons/fi';
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

    if (loading) return;

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
    <div className="min-h-screen bg-[#e8f0e8] flex items-center justify-center p-4 sm:p-6 overflow-hidden">

      {/* Main Card */}
      <div className="relative w-full max-w-[1080px] min-h-[650px] bg-[#fafaf6] rounded-[30px] overflow-hidden shadow-[0_30px_90px_rgba(20,50,35,0.16)] grid lg:grid-cols-2">

        {/* =====================================================
            LEFT SIDE
        ====================================================== */}
        <div className="relative hidden lg:flex flex-col bg-[#f1f1e5] p-10 overflow-hidden">

          {/* Decorative background */}
          <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full border border-[#d8dccd]" />

          <div className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full border border-[#d8dccd]" />

          <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-[#e6e8d8]" />

          {/* Brand */}
          <div className="relative z-10 flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-[#164d35] flex items-center justify-center shadow-sm">
              <span className="text-white text-lg font-bold">
                T
              </span>
            </div>

            <div>
              <h1 className="text-[18px] font-semibold tracking-tight text-[#17231c]">
                TRIKON
              </h1>

              <p className="text-[11px] text-[#788178] mt-0.5">
                Enterprise Resource Planning
              </p>
            </div>

          </div>

          {/* Illustration Area */}
          <div className="relative flex-1 flex items-center justify-center">

            {/* Main illustration container */}
            <div className="relative w-[390px] h-[350px]">

              {/* Building 1 */}
              <div className="absolute left-[25px] bottom-[30px] w-[105px] h-[205px] bg-[#f9faf3] border-[3px] border-[#345b50] rounded-t-[3px]">

                <div className="absolute top-5 left-5 right-5 grid grid-cols-2 gap-4">
                  <div className="h-5 border-l-2 border-[#6c8279]" />
                  <div className="h-5 border-l-2 border-[#6c8279]" />
                  <div className="h-5 border-l-2 border-[#6c8279]" />
                  <div className="h-5 border-l-2 border-[#6c8279]" />
                  <div className="h-5 border-l-2 border-[#6c8279]" />
                  <div className="h-5 border-l-2 border-[#6c8279]" />
                </div>

              </div>

              {/* Building 2 */}
              <div className="absolute left-[105px] bottom-[30px] w-[125px] h-[275px] bg-[#fbfbf4] border-[3px] border-[#345b50]">

                <div className="absolute top-7 left-6 right-6 grid grid-cols-3 gap-4">

                  {[...Array(15)].map((_, i) => (
                    <div
                      key={i}
                      className="h-5 border-l-2 border-[#6d8278]"
                    />
                  ))}

                </div>

              </div>

              {/* Building 3 */}
              <div className="absolute left-[205px] bottom-[30px] w-[125px] h-[220px] bg-[#f7e8df] border-[3px] border-[#345b50]">

                <div className="absolute top-7 left-6 right-6 space-y-4">

                  <div className="h-1.5 bg-[#678078] rounded-full" />
                  <div className="h-1.5 bg-[#678078] rounded-full" />
                  <div className="h-1.5 bg-[#678078] rounded-full" />
                  <div className="h-1.5 bg-[#678078] rounded-full" />

                </div>

              </div>

              {/* Tall building */}
              <div className="absolute right-[5px] bottom-[30px] w-[115px] h-[320px] bg-[#f9faf3] border-[3px] border-[#345b50]">

                <div className="absolute top-8 left-7 right-7 grid grid-cols-2 gap-5">

                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="h-7 border-l-2 border-[#6d8278]"
                    />
                  ))}

                </div>

              </div>

              {/* Ground */}
              <div className="absolute bottom-[27px] left-0 right-0 h-[3px] bg-[#345b50]" />

              {/* Tree */}
              <div className="absolute bottom-[30px] left-[350px]">

                <div className="w-12 h-12 rounded-full border-[3px] border-[#345b50] bg-[#eef2e8]" />

                <div className="absolute left-[22px] top-[42px] w-[3px] h-[50px] bg-[#345b50]" />

                <div className="absolute left-[23px] top-[55px] w-[28px] h-[3px] bg-[#345b50] rotate-45 origin-left" />

              </div>

            </div>

          </div>

          {/* Bottom message */}
          <div className="relative z-10">

            <h2 className="text-[34px] leading-[1.15] font-semibold tracking-tight text-[#17231c]">
              Everything your
              <br />
              business needs,
              <br />
              <span className="text-[#17603e]">
                connected.
              </span>
            </h2>

            <p className="mt-4 max-w-[390px] text-[14px] leading-6 text-[#788178]">
              Manage your operations, projects, finance and resources
              from one simple workspace.
            </p>

          </div>

        </div>


        {/* =====================================================
            RIGHT SIDE
        ====================================================== */}
        <div className="relative flex items-center justify-center px-7 py-12 sm:px-14 lg:px-20 bg-[#fffefa]">

          <div className="w-full max-w-[380px]">

            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-14">

              <div className="w-11 h-11 rounded-xl bg-[#164d35] flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  T
                </span>
              </div>

              <div>
                <h1 className="font-semibold text-[#17231c]">
                  TRIKON
                </h1>

                <p className="text-xs text-gray-400">
                  Enterprise Resource Planning
                </p>
              </div>

            </div>


            {/* Heading */}
            <div className="mb-10">

              <p className="text-[13px] font-medium text-[#17603e] mb-3">
                Welcome back
              </p>

              <h2 className="text-[34px] leading-tight font-semibold tracking-[-0.03em] text-[#17231c]">
                Sign in
              </h2>

              <p className="mt-3 text-[14px] leading-6 text-[#858c86]">
                Enter your credentials to access your TRIKON workspace.
              </p>

            </div>


            {/* Error */}
            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}


            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Email */}
              <div>

                <label className="block text-[13px] font-medium text-[#354039] mb-2.5">
                  Email
                </label>

                <div className="relative">

                  <FiMail
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca49e]"
                  />

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    autoFocus
                    className="
                      w-full
                      h-[54px]
                      pl-11
                      pr-4
                      rounded-[14px]
                      bg-[#f7f8f4]
                      border
                      border-[#e2e5dd]
                      text-[14px]
                      text-[#17231c]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-[#a8aea9]
                      hover:border-[#cbd1c9]
                      focus:bg-white
                      focus:border-[#17603e]
                      focus:ring-4
                      focus:ring-[#17603e]/10
                    "
                  />

                </div>

              </div>


              {/* Password */}
              <div>

                <label className="block text-[13px] font-medium text-[#354039] mb-2.5">
                  Password
                </label>

                <div className="relative">

                  <FiLock
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca49e]"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="
                      w-full
                      h-[54px]
                      pl-11
                      pr-12
                      rounded-[14px]
                      bg-[#f7f8f4]
                      border
                      border-[#e2e5dd]
                      text-[14px]
                      text-[#17231c]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:text-[#a8aea9]
                      hover:border-[#cbd1c9]
                      focus:bg-white
                      focus:border-[#17603e]
                      focus:ring-4
                      focus:ring-[#17603e]/10
                    "
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="
                      absolute
                      right-4
                      top-1/2
                      -translate-y-1/2
                      text-[#9ca49e]
                      hover:text-[#354039]
                      transition-colors
                    "
                  >
                    {showPassword ? (
                      <FiEyeOff size={17} />
                    ) : (
                      <FiEye size={17} />
                    )}
                  </button>

                </div>

              </div>


              {/* Invisible submit mechanism */}
              <button
                type="submit"
                disabled={loading}
                className="hidden"
                aria-hidden="true"
                tabIndex="-1"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

            </form>


            {/* Bottom hint */}
            <div className="mt-10 pt-6 border-t border-[#edf0eb]">

              <p className="text-center text-[12px] text-[#9aa19b]">
                {loading
                  ? 'Signing you in...'
                  : 'Press Enter to continue'}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* Small loading indicator */}
      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">

          <span className="w-4 h-4 border-2 border-[#17603e]/20 border-t-[#17603e] rounded-full animate-spin" />

          <span className="text-sm text-gray-600">
            Signing in...
          </span>

        </div>
      )}

    </div>
  );
}