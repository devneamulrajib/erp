import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParties } from '../api/party';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getLabourBills, deleteLabourBill, updateLabourBillStatus } from '../api/labourBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { resolveFileUrl } from '../api/axios';
import { Eye, Pencil, Trash2, PlusCircle, Search, CheckCircle2, RotateCcw } from 'lucide-react';

function num(v) { return Number(v) || 0; }
function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

const STATUS_STYLES = {
  paid: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  partial: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  unpaid: 'bg-red-50 text-red-600 ring-red-600/10',
};

export default function LabourWorkerBillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterLedger, setFilterLedger] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLabourBills({ from, to, party: filterParty, ledger: filterLedger });
      setRows(asArray(data));
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load labour/worker bills');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterParty, filterLedger]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    getParties().then((res) => setParties(asArray(res))).catch((err) => console.error('Failed to load parties', err));
    getChartOfAccounts().then((res) => setLedgers(asArray(res))).catch((err) => console.error('Failed to load ledgers', err));
  }, []);

  async function handleDelete(row) {
    if (!window.confirm('Delete this labour/worker bill?')) return;
    try {
      await deleteLabourBill(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  async function handleToggleStatus(row) {
    const nextStatus = row.status === 'paid' ? 'unpaid' : 'paid';
    setStatusUpdatingId(row.id);
    try {
      const updated = await updateLabourBillStatus(row.id, nextStatus);
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to update status');
    } finally {
      setStatusUpdatingId(null);
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.titleOfWork, r.party?.name, r.project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totals = filtered.reduce((acc, r) => ({
    grandTotal: acc.grandTotal + num(r.totalPayable),
    paid: acc.paid + num(r.paid),
    due: acc.due + num(r.due),
  }), { grandTotal: 0, paid: 0, due: 0 });

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 py-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Labour/Worker', to: '/service/labor-worker-bill-list' },
                { label: 'Labour/Worker Bill List' },
              ]}
            />
            <h1 className="text-xl font-semibold text-slate-900 mt-1 tracking-tight">Labour/Worker Bills</h1>
            <p className="text-xs text-slate-500 mt-0.5">Track labour and worker billing across your projects</p>
          </div>
          <button
            onClick={() => navigate('/service/labor-worker-bill-add')}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <PlusCircle size={15} /> New Bill
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Total Bills" value={filtered.length.toLocaleString()} />
          <StatCard label="Grand Total" value={totals.grandTotal.toLocaleString()} />
          <StatCard label="Paid" value={totals.paid.toLocaleString()} valueCls="text-emerald-600" />
          <StatCard label="Due" value={totals.due.toLocaleString()} valueCls="text-red-600" />
        </div>

        {/* Filters card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="From">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </Field>
            <Field label="To">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Contractor/Worker">
              <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)} className={inputCls}>
                <option value="">All</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Ledger">
              <select value={filterLedger} onChange={(e) => setFilterLedger(e.target.value)} className={inputCls}>
                <option value="">All</option>
                {ledgers.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-slate-500">entries</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search bills..."
                className="border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-56"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Type', 'Project', 'Title', 'Worker', 'DR Ledger',
                    'CR Ledger', 'Code', 'Date', 'Grand Total', 'Paid', 'Due', 'Status', 'By', 'File', 'Action'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={16} className="text-center py-8 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={16} className="text-center py-8 text-slate-400 text-sm">No data available in table</td></tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-3 py-2.5 text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.projectTypeName || row.projectType || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.project?.name || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-700 max-w-[140px] truncate">{row.titleOfWork || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.party?.name || '-'}</td>
                      <td className="px-3 py-2.5 text-indigo-600">{row.ledger?.name || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-700">{row.creditLedgerLabel || 'TBA'}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-block bg-indigo-50 text-indigo-700 font-medium px-2 py-0.5 rounded-md font-mono">{row.code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{row.date}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{num(row.totalPayable).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-slate-700">{num(row.paid).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-slate-700">{num(row.due).toLocaleString()}</td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ring-1 ring-inset capitalize ${STATUS_STYLES[row.status] || STATUS_STYLES.unpaid}`}>
                          {row.status || 'unpaid'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">{row.addedBy || '-'}</td>
                      <td className="px-3 py-2.5">
                        {row.attachment ? <a href={resolveFileUrl(row.attachment)} target="_blank" rel="noreferrer" className="text-indigo-600 underline">File</a> : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/service/labor-worker-bill-add/${row.id}`)}
                            title="View"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => navigate(`/service/labor-worker-bill-add/${row.id}`)}
                            title="Edit"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(row)}
                            disabled={statusUpdatingId === row.id}
                            title={row.status === 'paid' ? 'Mark as Unpaid' : 'Mark as Paid'}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                          >
                            {row.status === 'paid' ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            title="Delete"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-medium bg-slate-50/50">
                    <td colSpan={9} className="px-3 py-2.5 text-right text-slate-700">TOTAL:</td>
                    <td className="px-3 py-2.5 text-slate-900">{totals.grandTotal.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-900">{totals.paid.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-slate-900">{totals.due.toLocaleString()}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 rounded-lg text-sm bg-indigo-600 text-white font-medium">{page}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, valueCls = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-semibold ${valueCls}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}