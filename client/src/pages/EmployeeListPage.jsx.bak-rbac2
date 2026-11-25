// client/src/pages/EmployeeListPage.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, CheckCircle, AlertCircle, XCircle, TrendingDown,
  KeyRound, ShieldCheck, ShieldOff, CalendarDays, CalendarCheck, Save,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import {
  getEmployees, getNextEmployeeCode, createEmployee, updateEmployee, deleteEmployee,
  bulkDeleteEmployees, wipeAllEmployees,
  getEmployeeAdvances, requestEmployeeAdvance, disburseEmployeeAdvance,
  rejectEmployeeAdvance, getEmployeeAdvanceSummary,
  bulkDeleteAdvances, wipeAllAdvances,
  setEmployeePortalAccess, getAttendanceForDate, markAttendance,
  bulkDeleteAttendance, wipeAttendanceByDate,
  getLeaveRequests, approveLeaveRequest, rejectLeaveRequest,
  bulkDeleteLeaveRequests, wipeAllLeaveRequests,
} from '../api/employee';
import api from '../api/axios';

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' })
);

function nextMonthDefault() {
  const d = new Date();
  const m = d.getMonth() + 2;
  const year = d.getFullYear() + Math.floor((m - 1) / 12);
  const month = ((m - 1) % 12) + 1;
  return { year, month };
}

const EMPTY_EMPLOYEE = {
  name: '',
  code: '',
  designation: '',
  department: '',
  phone: '',
  email: '',
  joiningDate: '',
  basicSalary: 0,
  houseRent: 0,
  medicalAllowance: 0,
  otherAllowance: 0,
  bankName: '',
  bankAccountNo: '',
  status: 'Active',
};

const EMPTY_ADVANCE = {
  employeeId: '',
  type: 'Advance Salary',
  amount: '',
  repaymentMonths: 1,
  reason: '',
  targetMonth: nextMonthDefault().month,
  targetYear: nextMonthDefault().year,
};

const ATTENDANCE_OPTIONS = ['Present', 'Absent', 'Leave', 'Holiday'];

const todayStr = () => new Date().toISOString().slice(0, 10);

// Section labels used in the "type DELETE to confirm" wipe prompt.
const WIPE_LABELS = {
  employees: 'employees',
  advances: 'advance/loan requests',
  leave: 'leave requests',
  attendance: 'attendance records for the selected date',
};

export default function EmployeeListPage() {
  const [activeTab, setActiveTab] = useState('employees'); // employees | advances | summary | leave | attendance
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [summary, setSummary] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Row selection for bulk delete / wipe — keyed per tab, reset on tab change.
  const [selected, setSelected] = useState(new Set());
  useEffect(() => { setSelected(new Set()); }, [activeTab]);

  // Modals
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState(EMPTY_EMPLOYEE);
  const [editingId, setEditingId] = useState(null);

  const [advModalOpen, setAdvModalOpen] = useState(false);
  const [advForm, setAdvForm] = useState(EMPTY_ADVANCE);

  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [disburseForm, setDisburseForm] = useState({
    budgetCategoryId: '',
    drAccount: '',
    crAccount: '',
  });

  // Portal access modal
  const [accessEmp, setAccessEmp] = useState(null);
  const [accessPwd, setAccessPwd] = useState('');
  const [accessConfirm, setAccessConfirm] = useState('');

  // Attendance
  const [attendanceDate, setAttendanceDate] = useState(todayStr());
  const [attendanceMap, setAttendanceMap] = useState({});

  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, advRes, summaryRes, leaveRes] = await Promise.all([
        getEmployees(),
        getEmployeeAdvances(),
        getEmployeeAdvanceSummary(),
        getLeaveRequests(),
      ]);
      setEmployees(empRes.data || []);
      setAdvances(advRes.data || []);
      setSummary(summaryRes.data || []);
      setLeaveRequests(leaveRes.data || []);
    } catch (err) {
      console.error('Failed to load employee data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Load budget categories
    api.get('/budget-categories')
      .catch(() => api.get('/budget-category'))
      .then((res) => { if (res?.data) setCategories(res.data); })
      .catch(() => {});

    api.get('/chart-of-accounts')
      .then((res) => setAccounts(res.data || []))
      .catch(() => {});
  }, [loadData]);

  // Load saved attendance whenever the Attendance tab / date changes
  useEffect(() => {
    if (activeTab !== 'attendance') return;
    getAttendanceForDate(attendanceDate)
      .then((res) => {
        const map = {};
        (res.data || []).forEach((r) => { map[r.employeeId] = r.status; });
        setAttendanceMap(map);
      })
      .catch(() => setAttendanceMap({}));
  }, [activeTab, attendanceDate]);

  // ---------- Employee modal ----------
  async function handleOpenEmpModal(emp = null) {
    setError('');
    if (emp) {
      setEditingId(emp.id);
      setEmpForm({
        ...EMPTY_EMPLOYEE,
        ...emp,
        designation: emp.designation || '',
        department: emp.department || '',
        phone: emp.phone || '',
        email: emp.email || '',
        joiningDate: emp.joiningDate || '',
        bankName: emp.bankName || '',
        bankAccountNo: emp.bankAccountNo || '',
      });
    } else {
      setEditingId(null);
      let nextCode = '';
      try {
        const res = await getNextEmployeeCode();
        nextCode = res.data.code;
      } catch {}
      setEmpForm({ ...EMPTY_EMPLOYEE, code: nextCode });
    }
    setEmpModalOpen(true);
  }

  async function handleSaveEmployee(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingId) {
        await updateEmployee(editingId, empForm);
      } else {
        await createEmployee(empForm);
      }
      setEmpModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving employee');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEmployee(id) {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await deleteEmployee(id);
      await loadData();
    } catch (err) {
      alert('Failed to delete employee');
    }
  }

  // ---------- Portal access ----------
  function openAccessModal(emp) {
    setError('');
    setAccessPwd('');
    setAccessConfirm('');
    setAccessEmp(emp);
  }

  function closeAccessModal() {
    setAccessEmp(null);
    setAccessPwd('');
    setAccessConfirm('');
    setError('');
  }

  async function handleGrantAccess(e) {
    e.preventDefault();
    setError('');
    if (!accessEmp.createUser && accessPwd.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (accessPwd && accessPwd.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (accessPwd !== accessConfirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await setEmployeePortalAccess(accessEmp.id, { enable: true, password: accessPwd || undefined });
      closeAccessModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update portal access.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeAccess() {
    if (!window.confirm(`Revoke portal access for "${accessEmp.name}"?`)) return;
    setSubmitting(true);
    setError('');
    try {
      await setEmployeePortalAccess(accessEmp.id, { enable: false });
      closeAccessModal();
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke portal access.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Advance / Loan ----------
  function handleOpenAdvModal() {
    setError('');
    setAdvForm(EMPTY_ADVANCE);
    setAdvModalOpen(true);
  }

  async function handleSaveAdvance(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await requestEmployeeAdvance(advForm);
      setAdvModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting request');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenDisburse(adv) {
    setSelectedAdvance(adv);
    setDisburseForm({
      budgetCategoryId: '',
      drAccount: 'Staff Advance',
      crAccount: 'Cash in Hand',
    });
    setError('');
    setDisburseModalOpen(true);
  }

  async function handleDisburse(e) {
    e.preventDefault();
    if (!selectedAdvance) return;
    setSubmitting(true);
    setError('');
    try {
      await disburseEmployeeAdvance(selectedAdvance.id, disburseForm);
      setDisburseModalOpen(false);
      await loadData();
      alert('Disbursed successfully! Office Budget and Accounting entries have been updated.');
    } catch (err) {
      setError(err.response?.data?.message || 'Disbursement failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(adv) {
    if (!window.confirm(`Reject the ${adv.type} request for ${adv.employee?.name}?`)) return;
    try {
      await rejectEmployeeAdvance(adv.id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  }

  // ---------- Leave requests ----------
  async function handleApproveLeave(req) {
    const note = window.prompt(`Approve ${req.days} day(s) off for ${req.employee?.name}? Add an optional note:`, '');
    if (note === null) return;
    try {
      await approveLeaveRequest(req.id, note);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve request');
    }
  }

  async function handleRejectLeave(req) {
    const note = window.prompt(`Reject the leave request from ${req.employee?.name}? Add an optional reason:`, '');
    if (note === null) return;
    try {
      await rejectLeaveRequest(req.id, note);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  }

  // ---------- Attendance ----------
  const activeEmployees = employees.filter((e) => e.status === 'Active');

  function setAttendanceStatus(employeeId, status) {
    setAttendanceMap((prev) => ({ ...prev, [employeeId]: status }));
  }

  function markAllPresent() {
    const map = { ...attendanceMap };
    activeEmployees.forEach((e) => { map[e.id] = 'Present'; });
    setAttendanceMap(map);
  }

  async function handleSaveAttendance() {
    const records = Object.entries(attendanceMap)
      .filter(([, status]) => status)
      .map(([employeeId, status]) => ({ employeeId: Number(employeeId), status }));
    if (records.length === 0) {
      alert('Mark at least one employee first.');
      return;
    }
    setSubmitting(true);
    try {
      await markAttendance(attendanceDate, records);
      alert('Attendance saved.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- Bulk selection / delete / wipe ----------
  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids) {
    setSelected((prev) => (prev.size === ids.length && ids.length > 0 ? new Set() : new Set(ids)));
  }

  function confirmWipe(label) {
    const typed = window.prompt(`This will permanently delete ALL ${label}. Type DELETE to confirm.`);
    return typed === 'DELETE';
  }

  async function refreshAttendanceMap() {
    try {
      const res = await getAttendanceForDate(attendanceDate);
      const map = {};
      (res.data || []).forEach((r) => { map[r.employeeId] = r.status; });
      setAttendanceMap(map);
    } catch {
      setAttendanceMap({});
    }
  }

  async function handleDeleteSelected() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected record(s)? This cannot be undone.`)) return;

    try {
      if (activeTab === 'employees') await bulkDeleteEmployees(ids);
      else if (activeTab === 'advances') await bulkDeleteAdvances(ids);
      else if (activeTab === 'leave') await bulkDeleteLeaveRequests(ids);
      else if (activeTab === 'attendance') await bulkDeleteAttendance(attendanceDate, ids);

      setSelected(new Set());
      await loadData();
      if (activeTab === 'attendance') await refreshAttendanceMap();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete selected records');
    }
  }

  async function handleWipeSection() {
    const label = activeTab === 'attendance'
      ? `attendance records for ${attendanceDate}`
      : WIPE_LABELS[activeTab];
    if (!label || !confirmWipe(label)) return;

    try {
      if (activeTab === 'employees') await wipeAllEmployees();
      else if (activeTab === 'advances') await wipeAllAdvances();
      else if (activeTab === 'leave') await wipeAllLeaveRequests();
      else if (activeTab === 'attendance') {
        await wipeAttendanceByDate(attendanceDate);
        setAttendanceMap({});
      }

      setSelected(new Set());
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to wipe section');
    }
  }

  // ---------- Filters & stats ----------
  const q = search.toLowerCase();

  const filteredEmployees = employees.filter((e) =>
    e.name?.toLowerCase().includes(q) ||
    e.code?.toLowerCase().includes(q) ||
    e.department?.toLowerCase().includes(q)
  );

  const filteredAdvances = advances.filter((a) =>
    a.employee?.name?.toLowerCase().includes(q) ||
    a.type?.toLowerCase().includes(q)
  );

  const filteredSummary = summary.filter((s) =>
    s.employee?.name?.toLowerCase().includes(q)
  );

  const filteredLeaves = leaveRequests.filter((r) =>
    r.employee?.name?.toLowerCase().includes(q) ||
    r.status?.toLowerCase().includes(q)
  );

  const filteredAttendanceEmployees = activeEmployees.filter((e) =>
    e.name?.toLowerCase().includes(q) || e.code?.toLowerCase().includes(q)
  );

  const pendingLeaves = leaveRequests.filter((r) => r.status === 'Pending').length;
  const totalMonthlyPayroll = employees.reduce((s, e) => s + (Number(e.grossSalary) || 0), 0);
  const totalDisbursedAdvances = advances
    .filter((a) => a.status === 'Disbursed')
    .reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalOutstanding = summary.reduce((s, r) => s + (Number(r.remaining) || 0), 0);

  const tabClass = (key, activeCls) =>
    `pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
      activeTab === key ? activeCls : 'border-transparent text-slate-500 hover:text-slate-800'
    }`;

  const leaveBadge = (status) =>
    status === 'Approved' ? 'bg-emerald-50 text-emerald-600'
      : status === 'Rejected' ? 'bg-red-50 text-red-600'
        : 'bg-amber-50 text-amber-600';

  // Whether the current tab supports bulk delete / wipe (Summary is a
  // computed rollup of Advances, so it has nothing of its own to delete).
  const showBulkControls = activeTab !== 'summary';

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'HRM' },
                { label: 'Employees & Salaries' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">HRM & Payroll</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage staff, salary structures, advances, leave, attendance and portal access.</p>
          </div>

          <div className="flex gap-2">
            {activeTab === 'employees' ? (
              <button
                onClick={() => handleOpenEmpModal()}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-rose-600/20 transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Employee
              </button>
            ) : activeTab === 'advances' ? (
              <button
                onClick={handleOpenAdvModal}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
                Request Advance / Loan
              </button>
            ) : null}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Employees</div>
            <div className="text-2xl font-bold text-slate-900">{employees.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Monthly Payroll Budget</div>
            <div className="text-2xl font-bold text-rose-600">৳{totalMonthlyPayroll.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Disbursed Advances / Loans</div>
            <div className="text-2xl font-bold text-indigo-600">৳{totalDisbursedAdvances.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Outstanding Balance</div>
            <div className="text-2xl font-bold text-amber-600">৳{totalOutstanding.toLocaleString()}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setActiveTab('employees')} className={tabClass('employees', 'border-rose-600 text-rose-600')}>
            Employee Directory ({employees.length})
          </button>
          <button onClick={() => setActiveTab('advances')} className={tabClass('advances', 'border-indigo-600 text-indigo-600')}>
            Advance Salary & Loans ({advances.length})
          </button>
          <button onClick={() => setActiveTab('summary')} className={tabClass('summary', 'border-amber-600 text-amber-600')}>
            <TrendingDown size={14} />
            Advance Summary ({summary.length})
          </button>
          <button onClick={() => setActiveTab('leave')} className={tabClass('leave', 'border-sky-600 text-sky-600')}>
            <CalendarDays size={14} />
            Leave Requests{pendingLeaves > 0 ? ` (${pendingLeaves} pending)` : ` (${leaveRequests.length})`}
          </button>
          <button onClick={() => setActiveTab('attendance')} className={tabClass('attendance', 'border-emerald-600 text-emerald-600')}>
            <CalendarCheck size={14} />
            Attendance
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'attendance' && (
                <>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  />
                  <button
                    onClick={markAllPresent}
                    className="px-3 py-2 text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
                  >
                    Mark all Present
                  </button>
                  <button
                    onClick={handleSaveAttendance}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
                  >
                    <Save size={14} />
                    {submitting ? 'Saving...' : 'Save Attendance'}
                  </button>
                </>
              )}

              {/* Bulk delete / wipe controls */}
              {showBulkControls && (
                <>
                  {selected.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Selected ({selected.size})
                    </button>
                  )}
                  <button
                    onClick={handleWipeSection}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                    Clear Section
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'employees' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredEmployees.length > 0 && selected.size === filteredEmployees.length}
                        onChange={() => toggleSelectAll(filteredEmployees.map((e) => e.id))}
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Department & Role</th>
                    <th className="px-5 py-3 font-medium">Basic Salary</th>
                    <th className="px-5 py-3 font-medium">Gross Salary</th>
                    <th className="px-5 py-3 font-medium">Portal</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading employees...</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">No employees found.</td></tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className={`hover:bg-slate-50/70 transition ${selected.has(emp.id) ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-5 py-3.5">
                          <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} />
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{emp.code}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{emp.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          <div>{emp.designation || '—'}</div>
                          <div className="text-xs text-slate-400">{emp.department}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono">৳{(emp.basicSalary || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-semibold text-rose-600 font-mono">৳{(emp.grossSalary || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5">
                          {emp.createUser ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                              <ShieldCheck size={13} /> Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                              <ShieldOff size={13} /> Off
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openAccessModal(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              title="Portal Access"
                            >
                              <KeyRound size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenEmpModal(emp)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Edit Employee & Salary"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'advances' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredAdvances.length > 0 && selected.size === filteredAdvances.length}
                        onChange={() => toggleSelectAll(filteredAdvances.map((a) => a.id))}
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Repayment</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                    <th className="px-5 py-3 font-medium">Applies From</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">Loading requests...</td></tr>
                  ) : filteredAdvances.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-12 text-slate-400">No requests found.</td></tr>
                  ) : (
                    filteredAdvances.map((adv) => (
                      <tr key={adv.id} className={`hover:bg-slate-50/70 transition ${selected.has(adv.id) ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-5 py-3.5">
                          <input type="checkbox" checked={selected.has(adv.id)} onChange={() => toggleSelect(adv.id)} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800">{adv.employee?.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{adv.employee?.code}</div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-700">{adv.type}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">৳{Number(adv.amount).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {adv.repaymentMonths} mo. (৳{(adv.monthlyDeduction || 0).toLocaleString()}/mo)
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{adv.reason || '—'}</td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                          {adv.targetMonth && adv.targetYear ? `${MONTHS[adv.targetMonth - 1]} ${adv.targetYear}` : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            adv.status === 'Disbursed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : adv.status === 'Pending'
                              ? 'bg-amber-50 text-amber-600'
                              : adv.status === 'Rejected'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {adv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {adv.status === 'Pending' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleReject(adv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition"
                              >
                                <XCircle size={13} />
                                Reject
                              </button>
                              <button
                                onClick={() => handleOpenDisburse(adv)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
                              >
                                <CheckCircle size={13} />
                                Approve & Disburse
                              </button>
                            </div>
                          )}
                          {adv.status === 'Disbursed' && (
                            <span className="text-xs text-emerald-600 font-medium">Office Budget Linked</span>
                          )}
                          {adv.status === 'Rejected' && (
                            <span className="text-xs text-red-500 font-medium">Rejected</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'summary' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Requests</th>
                    <th className="px-5 py-3 font-medium">Total Taken</th>
                    <th className="px-5 py-3 font-medium">Total Repaid</th>
                    <th className="px-5 py-3 font-medium">Remaining</th>
                    <th className="px-5 py-3 font-medium">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading summary...</td></tr>
                  ) : filteredSummary.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">No disbursed advances yet.</td></tr>
                  ) : (
                    filteredSummary.map((row) => {
                      const pct = row.totalTaken > 0 ? Math.min(100, (row.totalRepaid / row.totalTaken) * 100) : 0;
                      return (
                        <tr key={row.employeeId} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-3.5">
                            <div className="font-medium text-slate-800">{row.employee?.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{row.employee?.code}</div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{row.requestCount}</td>
                          <td className="px-5 py-3.5 font-mono text-slate-800">৳{row.totalTaken.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono text-emerald-600">৳{row.totalRepaid.toLocaleString()}</td>
                          <td className="px-5 py-3.5 font-mono font-bold text-amber-600">৳{row.remaining.toLocaleString()}</td>
                          <td className="px-5 py-3.5">
                            <div className="w-32">
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1">{pct.toFixed(0)}% repaid</p>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : activeTab === 'leave' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredLeaves.length > 0 && selected.size === filteredLeaves.length}
                        onChange={() => toggleSelectAll(filteredLeaves.map((r) => r.id))}
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Dates</th>
                    <th className="px-5 py-3 font-medium">Days</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading requests...</td></tr>
                  ) : filteredLeaves.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">No leave requests yet.</td></tr>
                  ) : (
                    filteredLeaves.map((r) => (
                      <tr key={r.id} className={`hover:bg-slate-50/70 transition ${selected.has(r.id) ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-5 py-3.5">
                          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-800">{r.employee?.name}</div>
                          <div className="text-xs text-slate-400 font-mono">{r.employee?.code}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{r.fromDate} → {r.toDate}</td>
                        <td className="px-5 py-3.5 text-slate-600">{r.days}</td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">{r.reason || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${leaveBadge(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {r.status === 'Pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRejectLeave(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition"
                              >
                                <XCircle size={13} />
                                Reject
                              </button>
                              <button
                                onClick={() => handleApproveLeave(r)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
                              >
                                <CheckCircle size={13} />
                                Approve
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">{r.approvedBy ? `by ${r.approvedBy}` : ''}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredAttendanceEmployees.length > 0 && selected.size === filteredAttendanceEmployees.length}
                        onChange={() => toggleSelectAll(filteredAttendanceEmployees.map((e) => e.id))}
                      />
                    </th>
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Department</th>
                    <th className="px-5 py-3 font-medium">Status on {attendanceDate}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">Loading employees...</td></tr>
                  ) : filteredAttendanceEmployees.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">No active employees found.</td></tr>
                  ) : (
                    filteredAttendanceEmployees.map((emp) => (
                      <tr key={emp.id} className={`hover:bg-slate-50/70 transition ${selected.has(emp.id) ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-5 py-3.5">
                          <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleSelect(emp.id)} />
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{emp.code}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{emp.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{emp.department || '—'}</td>
                        <td className="px-5 py-3.5">
                          <select
                            value={attendanceMap[emp.id] || ''}
                            onChange={(e) => setAttendanceStatus(emp.id, e.target.value)}
                            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
                          >
                            <option value="">— Not marked —</option>
                            {ATTENDANCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal open={empModalOpen} title={editingId ? 'Edit Employee & Salary' : 'Add Employee'} onClose={() => setEmpModalOpen(false)}>
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Full Name *</label>
              <input
                required
                value={empForm.name}
                onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Employee Code</label>
              <input
                value={empForm.code}
                onChange={(e) => setEmpForm({ ...empForm, code: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
              <input
                value={empForm.department}
                onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Designation</label>
              <input
                value={empForm.designation}
                onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
              <input
                value={empForm.phone}
                onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email (used for portal login)</label>
              <input
                type="email"
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Joining Date</label>
              <input
                type="date"
                value={empForm.joiningDate}
                onChange={(e) => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select
                value={empForm.status}
                onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Salary Setup */}
          <div className="border-t border-slate-100 pt-3">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">Salary Structure (Monthly)</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Basic Salary</label>
                <input
                  type="number"
                  value={empForm.basicSalary}
                  onChange={(e) => setEmpForm({ ...empForm, basicSalary: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">House Rent</label>
                <input
                  type="number"
                  value={empForm.houseRent}
                  onChange={(e) => setEmpForm({ ...empForm, houseRent: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Medical</label>
                <input
                  type="number"
                  value={empForm.medicalAllowance}
                  onChange={(e) => setEmpForm({ ...empForm, medicalAllowance: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Other Allow.</label>
                <input
                  type="number"
                  value={empForm.otherAllowance}
                  onChange={(e) => setEmpForm({ ...empForm, otherAllowance: Number(e.target.value) })}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-2 text-right text-sm">
              <span className="text-slate-500">Gross Salary: </span>
              <span className="font-bold text-rose-600">
                ৳{(
                  Number(empForm.basicSalary || 0) +
                  Number(empForm.houseRent || 0) +
                  Number(empForm.medicalAllowance || 0) +
                  Number(empForm.otherAllowance || 0)
                ).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Banking */}
          <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Bank Name</label>
              <input
                value={empForm.bankName}
                onChange={(e) => setEmpForm({ ...empForm, bankName: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Account Number</label>
              <input
                value={empForm.bankAccountNo}
                onChange={(e) => setEmpForm({ ...empForm, bankAccountNo: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setEmpModalOpen(false)}
              className="px-4 py-2 text-sm bg-slate-100 rounded-lg text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
            >
              {submitting ? 'Saving...' : 'Save Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Portal Access Modal */}
      <Modal open={!!accessEmp} title={`Portal Access — ${accessEmp?.name || ''}`} onClose={closeAccessModal}>
        {accessEmp && (!accessEmp.email ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
              This employee doesn't have an email yet. Portal login requires one — add an email first, then come back here.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeAccessModal} className="px-4 py-2 text-sm bg-slate-100 rounded-lg text-slate-600">
                Close
              </button>
              <button
                type="button"
                onClick={() => { const emp = accessEmp; closeAccessModal(); handleOpenEmpModal(emp); }}
                className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
              >
                Add Email Now
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGrantAccess} className="space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

            <div className="flex items-center gap-2 text-sm">
              {accessEmp.createUser ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                  <ShieldCheck size={15} /> Portal access is currently enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
                  <ShieldOff size={15} /> Portal access is currently disabled
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Logging in as</label>
              <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                {accessEmp.email}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {accessEmp.createUser ? 'New Password (optional)' : 'Password'}
                </label>
                <input
                  type="password"
                  value={accessPwd}
                  onChange={(e) => setAccessPwd(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={accessConfirm}
                  onChange={(e) => setAccessConfirm(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t">
              {accessEmp.createUser ? (
                <button
                  type="button"
                  onClick={handleRevokeAccess}
                  disabled={submitting}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                >
                  Revoke Access
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={closeAccessModal} className="px-4 py-2 text-sm bg-slate-100 rounded-lg text-slate-600">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50"
                >
                  <KeyRound size={14} />
                  {submitting ? 'Saving...' : accessEmp.createUser ? 'Update Access' : 'Grant Access'}
                </button>
              </div>
            </div>
          </form>
        ))}
      </Modal>

      {/* Advance Salary / Loan Request Modal */}
      <Modal open={advModalOpen} title="Request Advance Salary / Loan" onClose={() => setAdvModalOpen(false)}>
        <form onSubmit={handleSaveAdvance} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Employee *</label>
            <select
              required
              value={advForm.employeeId}
              onChange={(e) => setAdvForm({ ...advForm, employeeId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">-- Select Employee --</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.code}) — Gross: ৳{e.grossSalary?.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Request Type</label>
              <select
                value={advForm.type}
                onChange={(e) => setAdvForm({ ...advForm, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="Advance Salary">Advance Salary</option>
                <option value="Loan">Loan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Amount (৳) *</label>
              <input
                required
                type="number"
                value={advForm.amount}
                onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Repayment Months</label>
            <input
              type="number"
              min="1"
              max="24"
              value={advForm.repaymentMonths}
              onChange={(e) => setAdvForm({ ...advForm, repaymentMonths: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">
              Monthly deduction will be: ৳
              {advForm.amount && advForm.repaymentMonths
                ? Math.round(Number(advForm.amount) / Number(advForm.repaymentMonths)).toLocaleString()
                : 0}
              /month
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Applies From (Month)</label>
              <select
                value={advForm.targetMonth}
                onChange={(e) => setAdvForm({ ...advForm, targetMonth: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Year</label>
              <select
                value={advForm.targetYear}
                onChange={(e) => setAdvForm({ ...advForm, targetYear: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                {[nextMonthDefault().year, nextMonthDefault().year + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Reason / Notes</label>
            <textarea
              rows={2}
              value={advForm.reason}
              onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setAdvModalOpen(false)}
              className="px-4 py-2 text-sm bg-slate-100 rounded-lg text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Disburse Modal */}
      <Modal open={disburseModalOpen} title="Approve & Disburse (Post to Office Budget & Accounts)" onClose={() => setDisburseModalOpen(false)}>
        <form onSubmit={handleDisburse} className="space-y-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg text-xs flex gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <div>
              Disbursing <strong>৳{Number(selectedAdvance?.amount).toLocaleString()}</strong> for{' '}
              <strong>{selectedAdvance?.employee?.name}</strong>. This will automatically deduct from the selected{' '}
              <strong>Office Budget Category</strong> and generate a double-entry <strong>Payment Voucher</strong> in Accounts.
            </div>
          </div>

          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Office Budget Category *</label>
            <select
              required
              value={disburseForm.budgetCategoryId}
              onChange={(e) => setDisburseForm({ ...disburseForm, budgetCategoryId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">-- Select Office Budget Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Debit Account (Expense / Advance) *</label>
              <select
                required
                value={disburseForm.drAccount}
                onChange={(e) => setDisburseForm({ ...disburseForm, drAccount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Select Ledger --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Credit Account (Cash / Bank) *</label>
              <select
                required
                value={disburseForm.crAccount}
                onChange={(e) => setDisburseForm({ ...disburseForm, crAccount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">-- Select Ledger --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setDisburseModalOpen(false)}
              className="px-4 py-2 text-sm bg-slate-100 rounded-lg text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              {submitting ? 'Disbursing...' : 'Confirm Disbursement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}