import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  getFundRequisitions, createFundRequisition, updateFundRequisition,
  addFundRequisitionPayment, deleteFundRequisition,
} from '../api/fundRequisition';
import { getUsers } from '../api/user';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { PlusCircle, Pencil, Trash2, Wallet, X, Search, ClipboardList } from 'lucide-react';

function num(v) { return Number(v) || 0; }

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

const emptyForm = {
  date: '', projectType: '', project: '', task: '', subTask: '',
  site: '', from: '', amount: '', purpose: '', reference: '',
};

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5';

export default function FundRequisitionList() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterUser, setFilterUser] = useState('');
  const [filterApproveStatus, setFilterApproveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [paymentRow, setPaymentRow] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [markDone, setMarkDone] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFundRequisitions({ from: filterUser, approveStatus: filterApproveStatus });
      setRows(asArray(data));
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load fund requisitions');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterApproveStatus]);

  useEffect(() => { loadRows(); }, [loadRows]);
  useEffect(() => { setPage(1); }, [search, pageSize]);

  useEffect(() => {
    getUsers().then((res) => setUsers(asArray(res))).catch(() => {});
    api.get('/projects').then((res) => setProjects(asArray(res))).catch(() => {});
    api.get('/sites').then((res) => setSites(asArray(res))).catch(() => {});
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }
  function openEditModal(row) {
    setEditingId(row.id);
    setForm({
      date: row.date || '', projectType: row.projectType || '', project: row.project?.id || row.project || '',
      task: row.task || '', subTask: row.subTask || '', site: row.site?.id || row.site || '',
      from: row.from?.id || row.from || '', amount: row.amount ?? '', purpose: row.purpose || '', reference: row.reference || '',
    });
    setFormError('');
    setShowModal(true);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.date || !form.amount || !form.purpose) {
      setFormError('Date, Amount and Purpose are required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await updateFundRequisition(editingId, form);
      } else {
        await createFundRequisition(form);
      }
      setShowModal(false);
      await loadRows();
    } catch (e2) {
      setFormError(e2.response?.data?.message || e2.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm('Delete this fund requisition?')) return;
    try {
      await deleteFundRequisition(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  function openPaymentModal(row) {
    setPaymentRow(row);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setMarkDone(false);
  }
  async function handleAddPayment() {
    if (num(paymentAmount) <= 0) return;
    try {
      await addFundRequisitionPayment(paymentRow.id, {
        amount: paymentAmount, method: paymentMethod, markDone,
      });
      setPaymentRow(null);
      await loadRows();
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to add payment');
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.project?.name, r.from?.name, r.purpose, r.reference]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Requisition', to: '/requisition-module/fund-requisition' },
                { label: 'Fund Requisition List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Fund Requisition List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track fund requests, approvals, and payments</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <PlusCircle size={16} strokeWidth={2.5} /> Fund Requisition Add
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Requisitions</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{paged.length} / {filtered.length}</div>
          </div>
        </div>

        {/* Filters card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Users</label>
              <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className={inputCls}>
                <option value="">Select an option</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Approve Status</label>
              <select value={filterApproveStatus} onChange={(e) => setFilterApproveStatus(e.target.value)} className={inputCls}>
                <option value="">Select an option</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requisitions..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Date', 'Project', 'From', 'Amount', 'Approved Amount', 'Paid Amount', 'Purpose',
                    'Reference', 'Approval Layers', 'Payment Status', 'Added By', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ClipboardList size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters, or add a new requisition.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => {
                    const allApproved = (row.approvals || []).length > 0 && row.approvals.every((a) => a.approved);
                    return (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                        <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                        <td className="px-4 py-3.5 text-slate-600">{fmtDate(row.date)}</td>
                        <td className="px-4 py-3.5 text-slate-600">{row.project?.name || '-'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{row.from?.name || 'TBA'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{num(row.amount).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-slate-600">{num(row.approvedAmount).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-slate-600">{num(row.paidAmount).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-[180px] truncate" title={row.purpose}>{row.purpose || '-'}</td>
                        <td className="px-4 py-3.5 text-slate-600">{row.reference || '-'}</td>
                        <td className="px-4 py-3.5">
                          {allApproved && <div className="text-emerald-600 text-xs font-medium">All Approval Done.</div>}
                          {(row.approvals || []).map((a, idx) => (
                            <div key={idx} className={`text-xs ${a.approved ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {a.approved ? '✓' : ''} {a.name}
                            </div>
                          ))}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${row.paymentStatus === 'Done' ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/10' : 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/10'}`}>
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{row.addedBy || '-'}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {row.paymentStatus !== 'Done' && (
                              <button title="Payments" onClick={() => openPaymentModal(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-purple-100 text-slate-500 hover:text-purple-600 transition-colors">
                                <Wallet size={14} />
                              </button>
                            )}
                            <button title="Edit" onClick={() => openEditModal(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button title="Delete" onClick={() => handleDelete(row)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Fund Requisition</h2>

            {formError && <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 mb-4 text-sm">{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Date" required>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Project Type">
                  <input value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className={inputCls} placeholder="Select Project Type" />
                </Field>
                <Field label="Project">
                  <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={inputCls}>
                    <option value="">Select Project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="If Task">
                  <input value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} className={inputCls} placeholder="Select Task" />
                </Field>
                <Field label="Sub Task">
                  <input value={form.subTask} onChange={(e) => setForm({ ...form, subTask: e.target.value })} className={inputCls} placeholder="Select Sub Task" />
                </Field>
                <Field label="Site">
                  <select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className={inputCls}>
                    <option value="">Select Site</option>
                    {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="From">
                  <select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={inputCls}>
                    <option value="">Select One Option</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </Field>
                <Field label="Amount" required>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} placeholder="Amount" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Purpose" required>
                    <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={`${inputCls} min-h-[80px]`} />
                  </Field>
                </div>
                <Field label="If Reference">
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputCls} placeholder="Select value" />
                </Field>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                  Close
                </button>
                <button type="submit" disabled={submitting} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors">
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button onClick={() => setPaymentRow(null)} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Add Payment</h2>
            <p className="text-xs text-slate-500 mb-5">
              {paymentRow.purpose} — Approved {num(paymentRow.approvedAmount).toLocaleString()}, Paid {num(paymentRow.paidAmount).toLocaleString()}
            </p>
            <div className="space-y-4">
              <Field label="Amount">
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Method">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputCls}>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank">Bank</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} className="rounded border-slate-300" />
                Mark as Done after this payment
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setPaymentRow(null)} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={handleAddPayment} className="px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-600/20 transition-colors">Add Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}