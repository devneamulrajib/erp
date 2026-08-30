import { useState, useEffect, useCallback } from 'react';
import { LayoutGrid, ClipboardCheck, ChevronDown, ChevronRight } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import api from '../api/axios';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function PurchaseOrderReceiveReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/purchase-order');
      setRows(res.data || []);
    } catch (err) {
      console.error('Failed to load purchase order receive report', err);
      setError('Failed to load purchase order receive report.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function orderTotals(order) {
    const items = order.items || [];
    const ordered = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
    const received = items.reduce((sum, it) => sum + (Number(it.purchaseQty) || 0), 0);
    return { ordered, received, pending: ordered - received };
  }

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.code?.toLowerCase().includes(q) ||
      r.supplier?.name?.toLowerCase().includes(q) ||
      r.project?.name?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const fullyReceivedCount = filtered.filter((r) => {
    const { ordered, received } = orderTotals(r);
    return ordered > 0 && received >= ordered;
  }).length;
  const pendingCount = filtered.length - fullyReceivedCount;

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Inventory', to: '/dashboard/inventory' },
                { label: 'Purchase Order Receive Details' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Purchase Order Receive Details</h1>
            <p className="text-sm text-slate-500 mt-0.5">Ordered vs received quantity per purchase order</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Orders</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-1">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Fully Received</div>
            <div className="text-xl font-semibold text-emerald-600">{fullyReceivedCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Pending</div>
            <div className="text-xl font-semibold text-amber-600">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code / supplier / project..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide"></th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Code</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Supplier</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Project</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Ordered</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Received</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Pending</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-16 text-slate-400 text-sm">Loading...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No purchase orders found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row) => {
                    const { ordered, received, pending } = orderTotals(row);
                    const isFull = ordered > 0 && received >= ordered;
                    const isExpanded = expandedId === row.id;
                    return (
                      <>
                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : row.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
                            >
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                              <ClipboardCheck size={12} />
                              {row.code}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">{row.date}</td>
                          <td className="px-5 py-3.5 text-slate-600">{row.supplier?.name || '-'}</td>
                          <td className="px-5 py-3.5 text-slate-600">{row.project?.name || '-'}</td>
                          <td className="px-5 py-3.5 text-right text-slate-600">{ordered.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-slate-600">{received.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-right text-slate-600">{pending.toLocaleString()}</td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              isFull ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {isFull ? 'Fully Received' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="bg-slate-50/70 px-5 py-3">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-slate-400 uppercase text-[10px]">
                                    <th className="text-left py-1.5 pr-3">Item</th>
                                    <th className="text-left py-1.5 pr-3">Unit</th>
                                    <th className="text-right py-1.5 pr-3">Ordered</th>
                                    <th className="text-right py-1.5 pr-3">Received</th>
                                    <th className="text-right py-1.5">Pending</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(row.items || []).map((it, idx) => (
                                    <tr key={idx} className="border-t border-slate-200/70">
                                      <td className="py-1.5 pr-3 text-slate-700">{it.itemName}</td>
                                      <td className="py-1.5 pr-3 text-slate-500">{it.unit}</td>
                                      <td className="py-1.5 pr-3 text-right text-slate-600">{Number(it.quantity || 0).toLocaleString()}</td>
                                      <td className="py-1.5 pr-3 text-right text-slate-600">{Number(it.purchaseQty || 0).toLocaleString()}</td>
                                      <td className="py-1.5 text-right text-slate-600">{(Number(it.quantity || 0) - Number(it.purchaseQty || 0)).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

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