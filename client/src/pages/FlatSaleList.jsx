import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getFlatSales, deleteFlatSale } from '../api/flatSale';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Pencil, Trash2, Eye, FileText, Search, LayoutGrid, Plus } from 'lucide-react';

function num(v) {
  return Number(v) || 0;
}

export default function FlatSaleList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [salesBy, setSalesBy] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getFlatSales({
        from, to, salesBy,
        project: filterProject,
        customer: filterCustomer,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load Flat/Land sales');
    } finally {
      setLoading(false);
    }
  }, [from, to, salesBy, filterProject, filterCustomer]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/customers').then((res) => setCustomers(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this Flat/Land sale?')) return;
    try {
      await deleteFlatSale(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  function formatDate(d) {
    if (!d) return '';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toISOString().slice(0, 10);
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.customer?.name, r.project?.name, r.flat?.flatLandNo]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalGrand = filtered.reduce((s, r) => s + num(r.grandTotal), 0);
  const totalDue = filtered.reduce((s, r) => s + num(r.due), 0);

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
                { label: 'Flat/Land', to: '/inventory-module/flat-sale' },
                { label: 'Flat/Land Sale List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Flat/Land Sales</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track bookings, payments, and dues across all sales</p>
          </div>
          <button
            onClick={() => navigate('/inventory-module/flat-sale/add')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Flat/Land Sale
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Sales</div>
            <div className="text-xl font-semibold text-slate-900">{rows.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Search</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Grand Total</div>
            <div className="text-xl font-semibold text-slate-900">{totalGrand.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Due</div>
            <div className="text-xl font-semibold text-red-600">{totalDue.toLocaleString()}</div>
          </div>
        </div>

        {/* Filters panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Customer Name</label>
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">Select value</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
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
                placeholder="Search sales..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['ID', 'Date', 'Code', 'Booking No', 'Project', 'Flat/Plot No', 'Customer Name',
                    'Rate', 'Other Cost', 'Parking', 'Utility Charge', 'Discount', 'Subtotal',
                    'Grand Total', 'Paid', 'Due', 'Sales By', 'Attachment'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={19} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr key={row._id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5 text-slate-600">{formatDate(row.date)}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                          {row.code}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{row.bookingNo || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.project?.name || '-'}</td>
                      <td className="px-4 py-3.5 text-indigo-600 font-medium">{row.flat?.flatLandNo || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.customer?.name || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.rate).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.otherCost).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.parking).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.utilityCharge).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.discount).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{num(row.subtotal).toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{num(row.grandTotal).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-emerald-600 font-medium">{num(row.paid).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-red-500 font-medium">{num(row.due).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.salesBy || '-'}</td>
                      <td className="px-4 py-3.5">
                        {row.attachment ? (
                          <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline underline-offset-2">File</a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View"
                            onClick={() => navigate(`/inventory-module/flat-sale/add/${row._id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            title="Payment Schedule (coming soon)"
                            onClick={() => alert('Payment Schedule is not built yet — next thing to add once this form is solid.')}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
                          >
                            <FileText size={14} />
                          </button>
                          <button
                            title="Edit"
                            onClick={() => navigate(`/inventory-module/flat-sale/add/${row._id}`)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => handleDelete(row)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
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
    </div>
  );
}