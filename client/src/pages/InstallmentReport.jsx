import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { getInstallmentReport } from '../api/flatSale';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import OverduePaymentModal from '../components/OverduePaymentModal';
import { Check, Search, LayoutGrid } from 'lucide-react';

function num(v) {
  return Number(v) || 0;
}

export default function InstallmentReport() {
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [salesBy, setSalesBy] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [payModal, setPayModal] = useState(null); // { saleId, installmentId, defaultAmount }

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getInstallmentReport({ from, to, salesBy, project: filterProject });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load installment report');
    } finally {
      setLoading(false);
    }
  }, [from, to, salesBy, filterProject]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.customerName, r.project?.name, r.flat?.flatLandNo, r.salesBy]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalDue = filtered.reduce((s, r) => s + num(r.installmentDue), 0);
  const totalRecovered = filtered.reduce((s, r) => s + num(r.recovered), 0);

  function handlePaid(updatedSale) {
    setRows((prev) => prev.map((r) => {
      if (String(r.saleId) !== String(updatedSale._id)) return r;
      const inst = (updatedSale.installments || []).find((i) => String(i._id) === String(r.installmentId));
      if (!inst) return r;
      return {
        ...r,
        paid: updatedSale.paid,
        due: updatedSale.due,
        recovered: inst.recovered || 0,
        installmentDue: (inst.amount || 0) - (inst.recovered || 0),
      };
    }));
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Flat/Land', to: '/inventory-module/flat-sale' },
              { label: 'Installment Report' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Installment Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track installment recoveries and outstanding dues</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Rows</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Recovered</div>
            <div className="text-xl font-semibold text-emerald-600">{totalRecovered.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Outstanding Due</div>
            <div className="text-xl font-semibold text-red-600">{totalDue.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Sales By</label>
              <input
                value={salesBy}
                onChange={(e) => setSalesBy(e.target.value)}
                placeholder="Select value"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
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
                placeholder="Search installments..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Project', 'Flat/Land', 'Customer Name', 'Total Value', 'Paid', 'Due',
                    'Installment Date', 'Installment Amount', 'Recovered', 'Installment Due', 'Sales By'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={`${row.saleId}-${row.installmentId}`} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.project?.name || '-'}</td>
                      <td className="px-4 py-3.5 text-indigo-600 font-medium">{row.flat?.flatLandNo || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.customerName || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.totalValue).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-emerald-600 font-medium">{num(row.paid).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-red-500 font-medium">{num(row.due).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.installmentDate || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.installmentAmount).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.recovered).toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{num(row.installmentDue).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.salesBy || '-'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end">
                          <button
                            title="Record recovery payment"
                            onClick={() => setPayModal({
                              saleId: row.saleId,
                              installmentId: row.installmentId,
                              defaultAmount: row.installmentDue,
                            })}
                            disabled={num(row.installmentDue) <= 0}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors disabled:opacity-40 disabled:hover:bg-indigo-50"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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

      <OverduePaymentModal
        open={!!payModal}
        saleId={payModal?.saleId}
        installmentId={payModal?.installmentId}
        defaultAmount={payModal?.defaultAmount}
        onClose={() => setPayModal(null)}
        onPaid={handlePaid}
      />
    </div>
  );
}