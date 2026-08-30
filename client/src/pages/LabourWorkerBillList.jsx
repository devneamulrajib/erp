import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParties } from '../api/party';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getLabourBills, deleteLabourBill } from '../api/labourBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle, Search } from 'lucide-react';

function num(v) { return Number(v) || 0; }
function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';

export default function LabourWorkerBillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);

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
    setOpenActionId(null);
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

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Labour/Worker', to: '/service/labor-worker-bill-list' },
                { label: 'Labour/Worker Bill List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Labour/Worker Bills</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track labour and worker billing across your projects</p>
          </div>
          <button
            onClick={() => navigate('/service/labor-worker-bill-add')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <PlusCircle size={16} /> New Labour/Worker Bill
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>}

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <StatCard label="Total Bills" value={filtered.length.toLocaleString()} />
          <StatCard label="Grand Total" value={totals.grandTotal.toLocaleString()} />
          <StatCard label="Paid" value={totals.paid.toLocaleString()} valueCls="text-emerald-600" />
          <StatCard label="Due" value={totals.due.toLocaleString()} valueCls="text-red-600" />
        </div>

        {/* Filters card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="From">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
            </Field>
            <Field label="To">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Contractor/Supplier/Worker">
              <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)} className={inputCls}>
                <option value="">Select One Option</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Ledger">
              <select value={filterLedger} onChange={(e) => setFilterLedger(e.target.value)} className={inputCls}>
                <option value="">Select Chart Of Account</option>
                {ledgers.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Worker/Contractor/Supplier', 'DR Ledger',
                    'Credit Ledger', 'Code', 'Date', 'Grand Total', 'Paid', 'Due', 'Added By', 'Approve', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={16} className="text-center py-10 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={16} className="text-center py-10 text-slate-400 text-sm">No data available in table</td></tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-4 py-3 text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{row.projectType || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.project?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.titleOfWork || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.party?.name || '-'}</td>
                      <td className="px-4 py-3 text-indigo-600">{row.ledger?.name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.creditLedgerLabel || 'TBA'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-md font-mono">{row.code}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{num(row.totalPayable).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{num(row.paid).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{num(row.due).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-700">{row.addedBy || '-'}</td>
                      <td className="px-4 py-3">
                        {(row.approvals || []).map((a, idx) => (
                          <div key={idx} className={`text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.approved ? '✓' : '✗'} {a.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        {row.attachment ? <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">File</a> : '-'}
                      </td>
                      <td className="px-4 py-3 relative">
                        <button
                          onClick={() => setOpenActionId(openActionId === row.id ? null : row.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs transition-colors"
                        >
                          <span className="sr-only">Actions</span>
                          <ChevronDown size={12} />
                        </button>
                        {openActionId === row.id && (
                          <div className="absolute right-4 mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                            <button onClick={() => { navigate(`/service/labor-worker-bill-add/${row.id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50">Edit</button>
                            <button onClick={() => { navigate(`/service/labor-worker-bill-add/${row.id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50">View</button>
                            <button onClick={() => handleDelete(row)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-200 font-medium bg-slate-50/50">
                    <td colSpan={9} className="px-4 py-3 text-right text-slate-700">TOTAL:</td>
                    <td className="px-4 py-3 text-slate-900">{totals.grandTotal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900">{totals.paid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-900">{totals.due.toLocaleString()}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className={`text-2xl font-semibold ${valueCls}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}