// client/src/components/workspace/HrmWorkspace.jsx
// HRM & payroll workspace in the same demo style as the accounting one:
// live headcount, today's attendance, leave requests and this month's payroll.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarX,
  ClipboardCheck,
  FileSpreadsheet,
  HandCoins,
  Lightbulb,
  Plus,
  UserCheck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';
import api from '../../api/axios';
import { formatTaka, formatCount } from '../dashboard/dashboardUtils';
import { EmptyState, ErrorState, ProgressBar } from '../dashboard/DashboardKit';
import {
  WorkspaceHeader,
  SummaryCard,
  WCard,
  StatusPill,
  ViewAll,
  TableSkeleton,
  primaryButton,
  ghostButton,
  selectClass,
  listOf,
  isoDate,
  shortDate,
} from './workspaceKit';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const LEAVE_TONE = { Pending: 'amber', Approved: 'green', Rejected: 'red' };

export default function HrmWorkspace() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState(() => `${today.getFullYear()}-${today.getMonth() + 1}`);
  const [year, month] = period.split('-').map(Number);

  const [people, setPeople] = useState({ loading: true, error: null, employees: [], attendance: [], corrections: 0 });
  const [leave, setLeave] = useState({ loading: true, error: null, rows: [] });
  const [payroll, setPayroll] = useState({ loading: true, error: null, slips: [] });

  const loadPeople = useCallback(() => {
    setPeople((p) => ({ ...p, loading: true, error: null }));
    Promise.all([
      api.get('/employee'),
      api.get('/employee/attendance', { params: { date: isoDate(today) } }),
      api.get('/attendance-corrections', { params: { status: 'Pending' } }).catch(() => ({ data: [] })),
    ])
      .then(([e, a, c]) =>
        setPeople({ loading: false, error: null, employees: listOf(e.data), attendance: listOf(a.data), corrections: listOf(c.data).length }),
      )
      .catch((err) => setPeople({ loading: false, error: err.response?.data?.message || err.message, employees: [], attendance: [], corrections: 0 }));
  }, [today]);

  const loadLeave = useCallback(() => {
    setLeave((l) => ({ ...l, loading: true, error: null }));
    api
      .get('/employee/leave-requests')
      .then((r) => setLeave({ loading: false, error: null, rows: listOf(r.data) }))
      .catch((err) => setLeave({ loading: false, error: err.response?.data?.message || err.message, rows: [] }));
  }, []);

  const loadPayroll = useCallback(() => {
    setPayroll((p) => ({ ...p, loading: true, error: null }));
    api
      .get('/payslip', { params: { year, month } })
      .then((r) => setPayroll({ loading: false, error: null, slips: listOf(r.data) }))
      .catch((err) => setPayroll({ loading: false, error: err.response?.data?.message || err.message, slips: [] }));
  }, [year, month]);

  useEffect(() => {
    loadPeople();
    loadLeave();
  }, [loadPeople, loadLeave]);
  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  const stats = useMemo(() => {
    const active = people.employees.filter((e) => (e.status || 'Active') === 'Active');
    const byStatus = { Present: 0, Absent: 0, Leave: 0, Holiday: 0 };
    const seen = new Set();
    people.attendance.forEach((a) => {
      if (seen.has(a.employeeId)) return; // one row per employee
      seen.add(a.employeeId);
      if (byStatus[a.status] !== undefined) byStatus[a.status] += 1;
    });
    const departments = {};
    active.forEach((e) => {
      const d = e.department || 'Unassigned';
      departments[d] = (departments[d] || 0) + 1;
    });
    return {
      active: active.length,
      gross: active.reduce((s, e) => s + (Number(e.grossSalary) || 0), 0),
      ...byStatus,
      unmarked: Math.max(0, active.length - seen.size),
      departments: Object.entries(departments).sort((a, b) => b[1] - a[1]),
    };
  }, [people]);

  const pay = useMemo(() => {
    const paid = payroll.slips.filter((s) => s.status === 'Paid');
    return {
      count: payroll.slips.length,
      paid: paid.length,
      net: payroll.slips.reduce((s, x) => s + (Number(x.netSalary) || 0), 0),
      paidAmount: paid.reduce((s, x) => s + (Number(x.netSalary) || 0), 0),
    };
  }, [payroll.slips]);

  const pendingLeave = leave.rows.filter((r) => r.status === 'Pending').length;
  const presentPct = stats.active ? Math.round((stats.Present / stats.active) * 100) : 0;

  const periodOptions = useMemo(() => {
    const out = [];
    for (let i = 0; i < 6; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      out.push({ value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` });
    }
    return out;
  }, [today]);

  return (
    <div className="space-y-6">
      <WorkspaceHeader icon={Users} title="People & Payroll" subtitle={`Headcount, attendance for ${shortDate(today)}, leave and payroll`}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className={selectClass} aria-label="Payroll month">
          {periodOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="button" className={ghostButton} onClick={() => navigate('/hrm-module/employee?tab=attendance')}>
          <CalendarCheck className="size-4 text-slate-400" /> Mark Attendance
        </button>
        <button type="button" className={primaryButton} onClick={() => navigate('/hrm-module/pay-slip-process')}>
          <Plus className="size-4" /> Process Payroll
        </button>
      </WorkspaceHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active Employees" value={formatCount(stats.active)} icon={Users} tone="blue" hint={`${stats.departments.length} departments`} loading={people.loading} to="/hrm-module/employee" />
        <SummaryCard label="Present Today" value={formatCount(stats.Present)} icon={UserCheck} tone="green" hint={`${presentPct}% of active · ${stats.unmarked} not marked`} loading={people.loading} to="/hrm-module/employee?tab=attendance" />
        <SummaryCard label="Absent / On Leave" value={`${formatCount(stats.Absent)} / ${formatCount(stats.Leave)}`} icon={CalendarX} tone="red" hint={`${pendingLeave} leave request(s) pending`} loading={people.loading || leave.loading} to="/hrm-module/employee?tab=leave" />
        <SummaryCard label={`Payroll · ${MONTHS[month - 1].slice(0, 3)}`} value={formatTaka(pay.net || stats.gross)} icon={Wallet} tone="purple" hint={pay.count ? `${pay.paid}/${pay.count} slips paid` : 'Gross salary · slips not generated'} loading={payroll.loading || people.loading} to="/hrm-module/pay-slip" />
      </div>
      {people.error && (
        <WCard>
          <ErrorState message={people.error} onRetry={loadPeople} />
        </WCard>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <WCard title="Today's Attendance" subtitle={shortDate(today)} right={<ViewAll to="/hrm-module/attendance-log">Attendance Log</ViewAll>} className="xl:col-span-2">
          {people.loading ? (
            <TableSkeleton rows={4} />
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Present', value: stats.Present, accent: 'emerald' },
                { label: 'Absent', value: stats.Absent, accent: 'rose' },
                { label: 'On leave', value: stats.Leave, accent: 'amber' },
                { label: 'Holiday', value: stats.Holiday, accent: 'sky' },
                { label: 'Not marked yet', value: stats.unmarked, accent: 'slate' },
              ].map((r) => (
                <div key={r.label}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-medium text-slate-600">{r.label}</span>
                    <span className="font-bold tabular-nums text-slate-900">{formatCount(r.value)}</span>
                  </div>
                  <ProgressBar value={stats.active ? (r.value / stats.active) * 100 : 0} accent={r.accent} />
                </div>
              ))}
              {people.corrections > 0 && (
                <Link to="/hrm-module/attendance-log" className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  <ClipboardCheck className="size-4" /> {people.corrections} attendance correction(s) waiting for review
                </Link>
              )}
            </div>
          )}
        </WCard>

        <WCard title="Leave Requests" subtitle={`${pendingLeave} pending`} right={<ViewAll to="/hrm-module/employee?tab=leave" />} className="xl:col-span-3" bodyClassName="">
          {leave.loading ? (
            <TableSkeleton rows={5} />
          ) : leave.error ? (
            <ErrorState message={leave.error} onRetry={loadLeave} />
          ) : leave.rows.length === 0 ? (
            <EmptyState icon={CalendarX} title="No leave requests" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">From</th>
                    <th className="px-3 py-2.5">To</th>
                    <th className="px-3 py-2.5 text-right">Days</th>
                    <th className="px-5 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leave.rows.slice(0, 6).map((r) => (
                    <tr key={r.id} onClick={() => navigate('/hrm-module/employee?tab=leave')} className="cursor-pointer hover:bg-slate-50/70" title="Open leave requests">
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                          <span className="flex size-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <UserRound className="size-3.5" />
                          </span>
                          {r.employee?.name || `#${r.employeeId}`}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{shortDate(r.fromDate)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{shortDate(r.toDate)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-900">{r.days}</td>
                      <td className="px-5 py-3 text-right">
                        <StatusPill tone={LEAVE_TONE[r.status] || 'slate'}>{r.status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </WCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <WCard title={`Payroll · ${MONTHS[month - 1]} ${year}`} right={<ViewAll to="/hrm-module/pay-slip">Pay Slips</ViewAll>} className="xl:col-span-3">
          {payroll.loading ? (
            <TableSkeleton rows={3} />
          ) : payroll.error ? (
            <ErrorState message={payroll.error} onRetry={loadPayroll} />
          ) : pay.count === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No pay slips for this month yet" description="Generate them from Pay Slip Process." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Slips', value: formatCount(pay.count) },
                  { label: 'Paid', value: formatCount(pay.paid) },
                  { label: 'Net payroll', value: formatTaka(pay.net) },
                  { label: 'Still to pay', value: formatTaka(pay.net - pay.paidAmount) },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{x.label}</p>
                    <p className="mt-0.5 text-base font-bold tabular-nums text-slate-900">{x.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Paid</span>
                  <span className="font-semibold">{Math.round((pay.paid / pay.count) * 100)}%</span>
                </div>
                <ProgressBar value={(pay.paid / pay.count) * 100} accent="violet" />
              </div>
            </div>
          )}
        </WCard>

        <WCard title="Headcount by Department" className="xl:col-span-2">
          {people.loading ? (
            <TableSkeleton rows={4} />
          ) : stats.departments.length === 0 ? (
            <EmptyState icon={Users} title="No active employees" />
          ) : (
            <ul className="space-y-2.5">
              {stats.departments.slice(0, 7).map(([name, n]) => (
                <li key={name}>
                  <Link to="/hrm-module/employee" className="flex items-center justify-between gap-3 rounded-lg px-1 py-0.5 text-[13px] hover:bg-slate-50">
                    <span className="truncate text-slate-600">{name}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-slate-700">{n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Employees & Salary', to: '/hrm-module/employee', icon: Users },
          { label: 'Advance Salary / Loan', to: '/hrm-module/employee?tab=advance', icon: HandCoins },
          { label: 'Leave Requests', to: '/hrm-module/employee?tab=leave', icon: CalendarX },
          { label: 'Salary Sheet', to: '/hrm-module/reports/salary-sheet', icon: FileSpreadsheet },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className="group flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-white px-3.5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <q.icon className="size-4" />
            </span>
            <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-slate-900">{q.label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 p-4 text-[13px] leading-relaxed text-rose-900">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
          <Lightbulb className="size-4" />
        </span>
        <p>
          <span className="font-bold">Tip: </span>
          mark today's attendance before processing payroll — absent and leave days feed the salary deductions.
        </p>
      </div>
    </div>
  );
}
