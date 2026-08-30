import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import {
  getFundRequisitions, createFundRequisition, updateFundRequisition,
  addFundRequisitionPayment, deleteFundRequisition,
} from '../api/fundRequisition';
import { getUsers } from '../api/user';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { PlusCircle, Pencil, Trash2, Video, X } from 'lucide-react';

function num(v) { return Number(v) || 0; }

const emptyForm = {
  date: '', projectType: '', project: '', task: '', subTask: '',
  site: '', from: '', amount: '', purpose: '', reference: '',
};

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
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load fund requisitions');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterApproveStatus]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    getUsers().then(setUsers).catch(() => {});
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
  }, []);

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }
  function openEditModal(row) {
    setEditingId(row._id);
    setForm({
      date: row.date || '', projectType: row.projectType || '', project: row.project?._id || row.project || '',
      task: row.task || '', subTask: row.subTask || '', site: row.site?._id || row.site || '',
      from: row.from?._id || row.from || '', amount: row.amount ?? '', purpose: row.purpose || '', reference: row.reference || '',
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
      await deleteFundRequisition(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
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
      await addFundRequisitionPayment(paymentRow._id, {
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

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Requisition', to: '/requisition-module/fund-requisition' },
            { label: 'Fund Requisition List' },
          ]}
        />
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <PlusCircle size={15} /> Fund Requisition Add
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Users</label>
            <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select an option</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.code ? `${u.code} (${u.name})` : u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Approve Status</label>
            <select value={filterApproveStatus} onChange={(e) => { setFilterApproveStatus(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select an option</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500">entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['SL', 'Date', 'Project', 'From', 'Amount', 'Approved Amount', 'Paid Amount', 'Purpose',
                  'Reference', 'Approval Layers', 'Payment Status', 'Added By', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={13} className="text-center py-8 text-gray-400">No entries found</td></tr>
              ) : (
                paged.map((row, i) => {
                  const allApproved = (row.approvals || []).length > 0 && row.approvals.every((a) => a.approved);
                  return (
                    <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                      <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-2">{row.date}</td>
                      <td className="px-3 py-2">{row.project?.name || '-'}</td>
                      <td className="px-3 py-2">{row.from?.name || 'TBA'}</td>
                      <td className="px-3 py-2">{num(row.amount).toLocaleString()}</td>
                      <td className="px-3 py-2">{num(row.approvedAmount).toLocaleString()}</td>
                      <td className="px-3 py-2">{num(row.paidAmount).toLocaleString()}</td>
                      <td className="px-3 py-2">{row.purpose || '-'}</td>
                      <td className="px-3 py-2">{row.reference || '-'}</td>
                      <td className="px-3 py-2">
                        {allApproved && <div className="text-emerald-600 text-xs">All Approval Done.</div>}
                        {(row.approvals || []).map((a, idx) => (
                          <div key={idx} className={`text-xs ${a.approved ? 'text-emerald-600' : 'text-gray-700'}`}>
                            {a.approved ? '✓' : ''} {a.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${row.paymentStatus === 'Done' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                          {row.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2">{row.addedBy || '-'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {row.paymentStatus !== 'Done' && (
                            <button title="Payments" onClick={() => openPaymentModal(row)} className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded">
                              <Video size={14} />
                            </button>
                          )}
                          <button title="Edit" onClick={() => openEditModal(row)} className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded">
                            <Pencil size={14} />
                          </button>
                          <button title="Delete" onClick={() => handleDelete(row)} className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded">
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

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Previous</button>
            <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h2 className="text-lg font-medium mb-4">Fund Requisition</h2>

            {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{formError}</div>}

            <form onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Date" required>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input" />
                </Field>
                <Field label="Project Type">
                  <input value={form.projectType} onChange={(e) => setForm({ ...form, projectType: e.target.value })} className="input" placeholder="Select Project Type" />
                </Field>
                <Field label="Project">
                  <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className="input">
                    <option value="">Select Project</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="If Task">
                  <input value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} className="input" placeholder="Select Task" />
                </Field>
                <Field label="Sub Task">
                  <input value={form.subTask} onChange={(e) => setForm({ ...form, subTask: e.target.value })} className="input" placeholder="Select Sub Task" />
                </Field>
                <Field label="Site">
                  <select value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className="input">
                    <option value="">Select Site</option>
                    {sites.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="From">
                  <select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="input">
                    <option value="">Select One Option</option>
                    {users.map((u) => <option key={u._id} value={u._id}>{u.code ? `${u.code} (${u.name})` : u.name}</option>)}
                  </select>
                </Field>
                <Field label="Amount" required>
                  <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input" placeholder="Amount" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Purpose" required>
                    <textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="input min-h-[80px]" />
                  </Field>
                </div>
                <Field label="If Reference">
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="input" placeholder="Select value" />
                </Field>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-700">
                  Close
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-md text-sm bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-50">
                  {submitting ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
            <button onClick={() => setPaymentRow(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
            <h2 className="text-lg font-medium mb-1">Add Payment</h2>
            <p className="text-xs text-gray-500 mb-4">
              {paymentRow.purpose} — Approved {num(paymentRow.approvedAmount).toLocaleString()}, Paid {num(paymentRow.paidAmount).toLocaleString()}
            </p>
            <div className="space-y-3">
              <Field label="Amount">
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input" />
              </Field>
              <Field label="Method">
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Bank">Bank</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={markDone} onChange={(e) => setMarkDone(e.target.checked)} />
                Mark as Done after this payment
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setPaymentRow(null)} className="px-5 py-2 rounded-md text-sm bg-gray-200 hover:bg-gray-300 text-gray-700">Cancel</button>
              <button onClick={handleAddPayment} className="px-5 py-2 rounded-md text-sm bg-purple-500 hover:bg-purple-600 text-white">Add Payment</button>
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
      <label className="block text-sm text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}