import React, { useEffect, useState } from 'react';
import { getInvestorProfile, changeInvestorPassword } from '../api/portalInvestor';

const PortalInvestorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getInvestorProfile();
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassErr('');
    setPassMsg('');
    setPassLoading(true);

    try {
      const res = await changeInvestorPassword({ currentPassword: currPass, newPassword: newPass });
      setPassMsg(res.data.message || 'Password updated successfully.');
      setCurrPass('');
      setNewPass('');
    } catch (err) {
      setPassErr(err.response?.data?.message || 'Could not update password.');
    } finally {
      setPassLoading(false);
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />;
  }

  return (
    <div className="space-y-6">
      {/* Membership Identity Header */}
      <div className="rounded-3xl border border-[#E3E8F2] bg-white p-6 md:p-8 shadow-xs flex flex-col sm:flex-row items-center gap-5">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#0B1530] text-2xl font-bold text-white font-wealth-display">
          {profile?.name ? profile.name.charAt(0).toUpperCase() : 'I'}
        </div>
        <div className="text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-[#0B1530] font-wealth-display">{profile?.name}</h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
              Verified Partner
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {profile?.investorIdCode} • Member Since {profile?.memberSinceYear}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account & Contact Info</h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Direct Phone</span>
              <span className="font-semibold text-slate-800">{profile?.phone || 'Not registered'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Email Address</span>
              <span className="font-semibold text-slate-800">{profile?.email || 'Not registered'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">National ID / Passport</span>
              <span className="font-semibold text-slate-800 font-mono">{profile?.maskedNid || '••••'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Registered Address</span>
              <span className="font-semibold text-slate-800">{profile?.address || 'Not registered'}</span>
            </div>
          </div>
        </div>

        {/* Nominee & Beneficiary */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nominee & Beneficiary</h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Nominee Name</span>
              <span className="font-semibold text-slate-800">{profile?.nomineeName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Relationship</span>
              <span className="font-semibold text-slate-800">{profile?.nomineeRelation || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Nominee Phone</span>
              <span className="font-semibold text-slate-800">{profile?.nomineePhone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Nominee NID</span>
              <span className="font-semibold text-slate-800 font-mono">{profile?.maskedNomineeNid || '••••'}</span>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Security Credentials</h3>
          {passMsg && <div className="mb-3 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700">{passMsg}</div>}
          {passErr && <div className="mb-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-600">{passErr}</div>}

          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-600">Current Password</label>
              <input
                type="password"
                required
                value={currPass}
                onChange={(e) => setCurrPass(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-600"
              />
            </div>
            <button
              type="submit"
              disabled={passLoading}
              className="mt-2 w-full rounded-xl bg-[#0B1530] py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Wealth Desk Support */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dedicated Wealth Desk</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              If you have inquiries regarding statements, tax certificates, or agreement adjustments, contact your relationship manager.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <p className="text-slate-600"><strong>Email:</strong> investor.relations@trikon.com</p>
            <p className="text-slate-600"><strong>Direct Desk:</strong> +880 9612 000000</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalInvestorProfile;