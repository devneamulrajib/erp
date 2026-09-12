import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkorders, deleteWorkorder } from '../api/workorder';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  PlusCircle, Search, Pencil, Eye, FileText, Printer, Trash2,
  ClipboardList, Wallet, TrendingUp, CalendarRange, X,
} from 'lucide-react';

// ---- Palette tokens (ledger / statement inspired) ----
// forest green as the working accent, warm gold reserved for money figures,
// a warm paper background instead of a cool grey SaaS surface.
const C = {
  page: 'bg-[#F6F3EC]',
  surface: 'bg-white',
  border: 'border-[#E4DFCF]',
  ink: 'text-[#1E2A22]',
  inkMuted: 'text-[#6B7268]',
  forest: 'text-[#1F5D42]',
  forestBg: 'bg-[#1F5D42]',
  forestBgHover: 'hover:bg-[#173F2D]',
  forestSoft: 'bg-[#E7F0EA]',
  gold: 'text-[#946B1B]',
  goldSoft: 'bg-[#F7ECD2]',
  danger: 'text-[#A6402A]',
  dangerSoft: 'bg-[#FBEAE3]',
};

function num(v) { return Number(v) || 0; }
function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}
function fmtDate(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function WorkorderList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWorkorders({ from, to });
      setRows(asArray(data));
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { loadRows(); }, [loadRows]);

  async function handleDelete(row) {
    if (!window.confirm('Delete this work order?')) return;
    try {
      await deleteWorkorder(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.clientOrderNo, r.customer?.name, r.project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const grandTotal = filtered.reduce((sum, r) => sum + num(r.grandTotal), 0);
  const avgOrder = filtered.length ? grandTotal / filtered.length : 0;
  const hasDateFilter = !!(from || to);

  return (
    <div className={`min-h-screen w-full ${C.page} text-left`}>
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Billing', to: '/billing/workorder_list' },
                { label: 'Work Order List' },
              ]}
            />
            <h1 className={`text-3xl font-semibold ${C.ink} mt-1 tracking-tight`}>Work Orders</h1>
            <p className={`text-sm ${C.inkMuted} mt-1`}>Track work orders across your projects and sites</p>
          </div>
          <button
            onClick={() => navigate('/billing/workorder')}
            className={`inline-flex items-center gap-2 ${C.forestBg} ${C.forestBgHover} text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-[#1F5D42]/20 transition-colors`}
          >
            <PlusCircle size={16} /> New Work Order
          </button>
        </div>

        {error && (
          <div className={`${C.dangerSoft} border border-[#EFC9BB] ${C.danger} text-sm rounded-xl px-4 py-3 mb-5`}>
            {error}
          </div>
        )}

        {/* Metrics strip — ledger tabs, each with a colored top rule */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden border ${C.border} mb-6`}>
          <Metric icon={ClipboardList} label="Total Work Orders" value={filtered.length.toLocaleString()} accentBorder="border-t-[#1F5D42]" iconColor={C.forest} valueColor={C.ink} />
          <Metric icon={Wallet} label="Grand Total" value={grandTotal.toLocaleString()} accentBorder="border-t-[#946B1B]" iconColor={C.gold} valueColor={C.gold} />
          <Metric icon={TrendingUp} label="Average Order Value" value={avgOrder ? avgOrder.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'} accentBorder="border-t-[#1F5D42]" iconColor={C.forest} valueColor={C.ink} />
        </div>

        {/* Workspace */}
        <div className={`${C.surface} rounded-xl border ${C.border} shadow-sm overflow-hidden mb-6`}>
          {/* Toolbar */}
          <div className={`px-5 py-4 border-b ${C.border} flex flex-wrap items-center gap-3`}>
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA098]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by code, customer, or project..."
                className={`w-full border ${C.border} rounded-lg pl-9 pr-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              />
            </div>

            <div className={`flex items-center gap-2 border ${C.border} rounded-lg px-2.5 py-1.5 bg-[#FBF9F4]`}>
              <CalendarRange size={14} className="text-[#9AA098] shrink-0" />
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className={`text-sm bg-transparent focus:outline-none w-[124px] ${C.ink}`}
              />
              <span className="text-[#C7C1AE]">–</span>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className={`text-sm bg-transparent focus:outline-none w-[124px] ${C.ink}`}
              />
              {hasDateFilter && (
                <button
                  onClick={() => { setFrom(''); setTo(''); setPage(1); }}
                  title="Clear date filter"
                  className="text-[#9AA098] hover:text-[#1E2A22] transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm ml-auto">
              <span className={C.inkMuted}>Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className={`border ${C.border} rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25`}
              >
                {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`${C.forestBg} text-white whitespace-nowrap`}>
                  {['#', 'Work Order', 'Project', 'Customer', 'Client Order No.', 'Date', 'Grand Total', 'Added By', ''].map((h, idx) => (
                    <th
                      key={h + idx}
                      className={`px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide ${h === 'Grand Total' ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${C.border}`}>
                {loading ? (
                  <tr><td colSpan={9} className={`text-center py-14 ${C.inkMuted} text-sm`}>Loading work orders…</td></tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14">
                      <ClipboardList size={28} className="mx-auto text-[#C7C1AE] mb-2" />
                      <p className={`${C.ink} text-sm font-medium`}>No work orders found</p>
                      <p className={`${C.inkMuted} text-xs mt-0.5`}>Try adjusting your search or date range</p>
                    </td>
                  </tr>
                ) : (
                  paged.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`whitespace-nowrap align-top transition-colors hover:bg-[#F6F3EC] ${i % 2 === 1 ? 'bg-[#FBF9F4]' : 'bg-white'}`}
                    >
                      <td className={`px-4 py-3.5 text-[#9AA098]`}>{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block ${C.forestSoft} ${C.forest} text-xs font-semibold px-2.5 py-1 rounded-md font-mono tracking-tight`}>{row.code}</span>
                        {row.projectType && <div className={`text-[11px] ${C.inkMuted} mt-1`}>Type {row.projectType}</div>}
                      </td>
                      <td className={`px-4 py-3.5 ${C.ink}`}>{row.project?.name || <span className="text-[#C7C1AE]">-</span>}</td>
                      <td className={`px-4 py-3.5 ${C.ink} font-medium`}>{row.customer?.name || <span className="text-[#C7C1AE] font-normal">-</span>}</td>
                      <td className={`px-4 py-3.5 ${C.inkMuted}`}>{row.clientOrderNo || <span className="text-[#C7C1AE]">-</span>}</td>
                      <td className={`px-4 py-3.5 ${C.inkMuted}`}>{fmtDate(row.date)}</td>
                      <td className={`px-4 py-3.5 text-right font-semibold ${C.gold} tabular-nums`}>{num(row.grandTotal).toLocaleString()}</td>
                      <td className={`px-4 py-3.5 ${C.inkMuted}`}>{row.addedBy || 'Admin'}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <ActionIcon title="Edit" onClick={() => navigate(`/billing/workorder/${row.id}`)}>
                            <Pencil size={14} />
                          </ActionIcon>
                          <ActionIcon title="View" onClick={() => navigate(`/billing/workorder/${row.id}`)}>
                            <Eye size={14} />
                          </ActionIcon>
                          <ActionIcon title="Invoice" onClick={() => navigate(`/billing/workorder/${row.id}/invoice`)}>
                            <FileText size={14} />
                          </ActionIcon>
                          <ActionIcon title="Print" onClick={() => navigate(`/billing/workorder/${row.id}/invoice?print=1`)}>
                            <Printer size={14} />
                          </ActionIcon>
                          <ActionIcon title="Delete" variant="danger" onClick={() => handleDelete(row)}>
                            <Trash2 size={14} />
                          </ActionIcon>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className={`border-t-2 border-[#1F5D42] font-semibold ${C.goldSoft}`}>
                    <td colSpan={6} className={`px-4 py-3 text-right ${C.ink}`}>Total</td>
                    <td className={`px-4 py-3 text-right ${C.gold} tabular-nums`}>{grandTotal.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className={`flex items-center justify-between px-5 py-4 border-t ${C.border}`}>
            <span className={`text-sm ${C.inkMuted}`}>
              Showing <span className={`font-medium ${C.ink}`}>{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className={`font-medium ${C.ink}`}>{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className={`font-medium ${C.ink}`}>{filtered.length}</span> entries
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1.5 rounded-lg text-sm bg-white border ${C.border} ${C.inkMuted} hover:bg-[#FBF9F4] disabled:opacity-40 disabled:hover:bg-white transition-colors`}
              >
                Previous
              </button>
              <span className={`px-3 py-1.5 rounded-lg text-sm ${C.forestBg} text-white font-medium min-w-[36px] text-center`}>{page}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`px-3 py-1.5 rounded-lg text-sm bg-white border ${C.border} ${C.inkMuted} hover:bg-[#FBF9F4] disabled:opacity-40 disabled:hover:bg-white transition-colors`}
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

function Metric({ icon: Icon, label, value, accentBorder, iconColor, valueColor }) {
  return (
    <div className={`bg-white border-t-[3px] ${accentBorder} px-5 py-4 flex items-center gap-3.5 border-r ${C.border} last:border-r-0`}>
      <div className={`w-9 h-9 rounded-lg ${C.forestSoft} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <p className={`text-[11px] font-medium ${C.inkMuted} uppercase tracking-wide`}>{label}</p>
        <p className={`text-xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

function ActionIcon({ title, onClick, children, variant = 'default' }) {
  const base = 'w-8 h-8 flex items-center justify-center rounded-lg border transition-colors';
  const styles = variant === 'danger'
    ? `${C.border} ${C.inkMuted} hover:${C.dangerSoft} hover:border-[#EFC9BB] hover:${C.danger}`
    : `${C.border} ${C.inkMuted} hover:${C.forestSoft} hover:border-[#BFD9CB] hover:${C.forest}`;
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}