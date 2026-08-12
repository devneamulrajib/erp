import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { getInstallmentReport } from '../api/flatSale';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import OverduePaymentModal from '../components/OverduePaymentModal';
import { Check } from 'lucide-react';

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

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.customerName, r.project?.name, r.flat?.flatLandNo, r.salesBy]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  function handlePaid(updatedSale) {
    // Re-derive this sale's rows from the fresh installments list
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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Flat/Land', to: '/inventory-module/flat-sale' },
          { label: 'Installment Report' },
        ]}
      />

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Sales By</label>
            <input value={salesBy} onChange={(e) => setSalesBy(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Select value" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select Project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Show</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            >
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500">entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['ID', 'Project', 'Flat/Land', 'Customer Name', 'Total Value', 'Paid', 'Due',
                  'Installment Date', 'Installment Amount', 'Recovered', 'Installment Due', 'Sales By', 'Action'].map((h) => (
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
                paged.map((row, i) => (
                  <tr key={`${row.saleId}-${row.installmentId}`} className="border-t border-gray-100 whitespace-nowrap">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2 text-indigo-600">{row.flat?.flatLandNo || '-'}</td>
                    <td className="px-3 py-2">{row.customerName || '-'}</td>
                    <td className="px-3 py-2">{num(row.totalValue).toLocaleString()}</td>
                    <td className="px-3 py-2 text-emerald-600">{num(row.paid).toLocaleString()}</td>
                    <td className="px-3 py-2 text-red-500">{num(row.due).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.installmentDate || '-'}</td>
                    <td className="px-3 py-2">{num(row.installmentAmount).toLocaleString()}</td>
                    <td className="px-3 py-2">{num(row.recovered).toLocaleString()}</td>
                    <td className="px-3 py-2">{num(row.installmentDue).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.salesBy || '-'}</td>
                    <td className="px-3 py-2">
                      <button
                        title="Record recovery payment"
                        onClick={() => setPayModal({
                          saleId: row.saleId,
                          installmentId: row.installmentId,
                          defaultAmount: row.installmentDue,
                        })}
                        disabled={num(row.installmentDue) <= 0}
                        className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded disabled:opacity-40"
                      >
                        <Check size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50"
            >
              Next
            </button>
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