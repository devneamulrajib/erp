import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, CalendarCheck, CalendarX, ArrowRight, Banknote, CalendarDays } from 'lucide-react';
import { getEmployeeProfile, getAttendanceSummary } from '../api/portalEmployee';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';
import CheckInCard from '../components/CheckInCard';

function StatCard({ label, value, icon, tone }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <span className={tone || 'text-slate-300'}>{icon}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
  );
}

export default function PortalEmployeeDashboard() {
  const user = getPortalUser();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const firstName = (user?.name || '').split(' ')[0] || 'there';
  const todayLabel = new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

  const loadAttendance = () =>
    getAttendanceSummary({ view: 'month' }).then(setAttendance).catch(() => {});

  useEffect(() => {
    Promise.all([getEmployeeProfile(), getAttendanceSummary({ view: 'month' })])
      .then(([p, a]) => { setProfile(p); setAttendance(a); })
      .catch(() => setError('Could not load your dashboard right now.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout>
      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading…</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
      )}

      {profile && (
        <>
          <p className="text-xs font-medium text-slate-400 mb-1">{todayLabel}</p>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight mb-1">Welcome back, {firstName}</h1>
          <p className="text-sm text-slate-400 mb-5 md:mb-6">{profile.designation || 'Employee'} · {profile.department || '-'}</p>

          <CheckInCard onChange={loadAttendance} />

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-5">
            <div className="flex items-center gap-1.5 text-slate-400 mb-3">
              <Wallet size={13} />
              <p className="text-[11px] font-semibold uppercase tracking-wide">Gross Salary</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 tracking-tight mb-4">
              ৳{Number(profile.grossSalary || 0).toLocaleString()}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm border-t border-slate-100 pt-4">
              <div><p className="text-xs text-slate-400 mb-0.5">Basic</p><p className="font-semibold text-slate-800">৳{Number(profile.basicSalary || 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">House Rent</p><p className="font-semibold text-slate-800">৳{Number(profile.houseRent || 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Medical</p><p className="font-semibold text-slate-800">৳{Number(profile.medicalAllowance || 0).toLocaleString()}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Other</p><p className="font-semibold text-slate-800">৳{Number(profile.otherAllowance || 0).toLocaleString()}</p></div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2.5">
            <p className="text-sm font-semibold text-slate-800">This Month's Attendance</p>
            <Link to="/portal/employee/attendance" className="text-xs font-medium text-slate-500 hover:text-slate-900">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2.5 md:gap-4 mb-6">
            <StatCard label="Present" value={attendance?.counts?.present || 0} icon={<CalendarCheck size={14} />} tone="text-emerald-500" />
            <StatCard label="Absent" value={attendance?.counts?.absent || 0} icon={<CalendarX size={14} />} tone="text-red-400" />
            <StatCard label="Leave" value={attendance?.counts?.leave || 0} icon={<CalendarDays size={14} />} tone="text-amber-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link to="/portal/employee/leave" className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-semibold text-slate-800">Request Day Off</span>
              <ArrowRight size={15} className="text-slate-400" />
            </Link>
            <Link to="/portal/employee/advance" className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-semibold text-slate-800">Request Advance</span>
              <Banknote size={15} className="text-slate-400" />
            </Link>
          </div>
        </>
      )}
    </PortalLayout>
  );
}