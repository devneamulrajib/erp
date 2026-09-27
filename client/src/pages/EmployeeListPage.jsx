// client/src/pages/EmployeeListPage.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, DollarSign, Wallet, CheckCircle,
  Building, UserRound, ArrowUpRight, AlertCircle
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import {
  getEmployees, getNextEmployeeCode, createEmployee, updateEmployee, deleteEmployee,
  getEmployeeAdvances, requestEmployeeAdvance, disburseEmployeeAdvance,
} from '../api/employee';
import api from '../api/axios';

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
};

export default function EmployeeListPage() {
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'advances'
  const [employees, setEmployees] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, advRes] = await Promise.all([
        getEmployees(),
        getEmployeeAdvances(),
      ]);
      setEmployees(empRes.data || []);
      setAdvances(advRes.data || []);
    } catch (err) {
      console.error('Failed to load employee data', err);
    } finally {
      setLoading(false);
    }
  }, []);

useEffect(() => {
    loadData();
    // Load budget categories (supports /budget-categories or /budget-category)
    api.get('/budget-categories')
      .catch(() => api.get('/budget-category'))
      .then((res) => { if (res?.data) setCategories(res.data); })
      .catch(() => {});

    api.get('/chart-of-accounts')
      .then((res) => setAccounts(res.data || []))
      .catch(() => {});
  }, [loadData]);

  // Open Employee Modal
  async function handleOpenEmpModal(emp = null) {
    setError('');
    if (emp) {
      setEditingId(emp.id);
      setEmpForm({ ...emp });
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

  // Open Advance / Loan Modal
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

  // Open Disburse Modal
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

  // Filter lists
  const filteredEmployees = employees.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.code?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAdvances = advances.filter((a) =>
    a.employee?.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalMonthlyPayroll = employees.reduce((s, e) => s + (Number(e.grossSalary) || 0), 0);
  const totalDisbursedAdvances = advances
    .filter((a) => a.status === 'Disbursed')
    .reduce((s, a) => s + (Number(a.amount) || 0), 0);

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
            <p className="text-sm text-slate-500 mt-0.5">Manage staff, configure salary structures, and handle advance/loan disbursements.</p>
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
            ) : (
              <button
                onClick={handleOpenAdvModal}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
                Request Advance / Loan
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-200 mb-6">
          <button
            onClick={() => setActiveTab('employees')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'employees'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Employee Directory ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('advances')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'advances'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Advance Salary & Loans ({advances.length})
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
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'employees' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Department & Role</th>
                    <th className="px-5 py-3 font-medium">Basic Salary</th>
                    <th className="px-5 py-3 font-medium">Gross Salary</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading employees...</td></tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">No employees found.</td></tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{emp.code}</td>
                        <td className="px-5 py-3.5 font-medium text-slate-800">{emp.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">
                          <div>{emp.designation || '—'}</div>
                          <div className="text-xs text-slate-400">{emp.department}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono">৳{(emp.basicSalary || 0).toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-semibold text-rose-600 font-mono">৳{(emp.grossSalary || 0).toLocaleString()}</td>
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
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider text-left">
                    <th className="px-5 py-3 font-medium">Employee</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Repayment</th>
                    <th className="px-5 py-3 font-medium">Reason</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">Loading requests...</td></tr>
                  ) : filteredAdvances.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400">No requests found.</td></tr>
                  ) : (
                    filteredAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50/70 transition">
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
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            adv.status === 'Disbursed'
                              ? 'bg-emerald-50 text-emerald-600'
                              : adv.status === 'Pending'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {adv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {adv.status === 'Pending' && (
                            <button
                              onClick={() => handleOpenDisburse(adv)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition"
                            >
                              <CheckCircle size={13} />
                              Disburse & Post
                            </button>
                          )}
                          {adv.status === 'Disbursed' && (
                            <span className="text-xs text-emerald-600 font-medium">Office Budget Linked</span>
                          )}
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={empForm.email}
                onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
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

      {/* Disburse Modal (Office Budget & Accounting Voucher integration) */}
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