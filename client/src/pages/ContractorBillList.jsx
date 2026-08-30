import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getParties } from '../api/party';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getContractorBills, deleteContractorBill } from '../api/contractorBill';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, Plus, Search, LayoutGrid, Paperclip, CheckCircle2, XCircle } from 'lucide-react';

function num(v) { return Number(v) || 0; }

export default function ContractorBillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterLedger, setFilterLedger] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getContractorBills({ from, to, party: filterParty, ledger: filterLedger, project: filterProject });
      // Defensive: handle a plain array, or a wrapped shape like { rows }, { bills }, { data }.
      const list = Array.isArray(res)
        ? res
        : (res?.rows || res?.bills || res?.data || []);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load contractor bills');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, filterParty, filterLedger, filterProject]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    getParties({ type: 'contractor' }).then((res) => {
      const list = Array.isArray(res) ? res : (res?.rows || res?.parties || res?.data || []);
      setParties(Array.isArray(list) ? list : []);
    }).catch(() => {});
    getChartOfAccounts().then((res) => {
      const body = res?.data ?? res;
      setLedgers(Array.isArray(body) ? body : (body?.rows || body?.data || []));
    }).catch(() => {});
    api.get('/projects').then((res) => setProjects(Array.isArray(res.data) ? res.data : (res.data?.rows || []))).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this contractor bill?')) return;
    try {
      await deleteContractorBill(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
  }

  const filtered = useMemo(() => rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.titleOfWork, r.party?.name, r.project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  }), [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );
  const totals = useMemo(() => filtered.reduce((acc, r) => ({
    grandTotal: acc.grandTotal + num(r.grandTotal),
    paid: acc.paid + num(r.paid),
    due: acc.due + num(r.due),
  }), { grandTotal: 0, paid: 0, due: 0 }), [filtered]);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/vendor_bill_list' },
                { label: 'Contractor/Supplier Bill List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Contractor/Supplier Bills</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track contractor and supplier billing across your projects</p>
          </div>
          <button
            onClick={() => navigate('/billing/contract_bill')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Contractor/Supplier Bill
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Bills</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Grand Total</div>
            <div className="text-xl font-semibold text-slate-900">{totals.grandTotal.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Paid</div>
            <div className="text-xl font-semibold text-emerald-600">{totals.paid.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due</div>
            <div className="text-xl font-semibold text-red-600">{totals.due.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Contractor/Supplier</label>
              <select
                value={filterParty}
                onChange={(e) => setFilterParty(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select One Option</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Ledger</label>
              <select
                value={filterLedger}
                onChange={(e) => setFilterLedger(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Chart Of Account</option>
                {ledgers.map((l) => <option key={l.id} value={l.id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
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
                placeholder="Search bills..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Contractor Name', 'DR Ledger', 'Code',
                    'Date', 'Grand Total', 'Paid', 'Due', 'Added By', 'Approve', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={15} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No contractor/supplier bills found. Try adjusting your filters, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5 text-slate-700">{row.projectType || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{row.project?.name || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{row.titleOfWork || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{row.party?.name || '-'}</td>
                      <td className="px-5 py-3.5 text-slate-700">{row.ledger?.name || '-'}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {row.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{row.date}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{num(row.grandTotal).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-700">{num(row.paid).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-700">{num(row.due).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-700">{row.addedBy || '-'}</td>
                      <td className="px-5 py-3.5">
                        {(row.approvals || []).map((a, idx) => (
                          <div key={idx} className={`flex items-center gap-1 text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.approved ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {a.name}
                          </div>
                        ))}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.attachment ? (
                          <a
                            href={row.attachment}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 hover:underline underline-offset-2"
                          >
                            <Paperclip size={13} /> File
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-5 py-3.5 relative">
                        <button
                          onClick={() => setOpenActionId(openActionId === row.id ? null : row.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-medium transition-colors"
                        >
                          Action <ChevronDown size={12} />
                        </button>
                        {openActionId === row.id && (
                          <div className="absolute right-5 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
                            <button onClick={() => { navigate(`/billing/contract_bill/${row.id}`); setOpenActionId(null); }} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-600 hover:bg-slate-50">Edit</button>
                            <button onClick={() => { navigate(`/billing/contract_bill/${row.id}`); setOpenActionId(null); }} className="w-full text-left px-3.5 py-2.5 text-xs text-slate-600 hover:bg-slate-50">View</button>
                            <button onClick={() => handleDelete(row)} className="w-full text-left px-3.5 py-2.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
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
                    <td colSpan={8} className="px-5 py-3 text-right text-slate-500 text-xs uppercase tracking-wide">Total:</td>
                    <td className="px-5 py-3 text-slate-900">{totals.grandTotal.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-900">{totals.paid.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-900">{totals.due.toLocaleString()}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
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
    </div>
  );
}