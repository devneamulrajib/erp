import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileDown, FileSpreadsheet, Search, BookOpen, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { getDayBook } from '../api/accountingReports';
import { getProjects } from '../api/project';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

// ---- Palette tokens (shared with Work Order / Receivable Report redesigns) ----
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

const VOUCHER_TYPES = ['Journal', 'Payment', 'Receipt', 'Contra', 'Expense', 'Purchase', 'Sales'];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function DayBookPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);

  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [projectId, setProjectId] = useState('');
  const [voucherType, setVoucherType] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getDayBook({
        from, to, project: projectId || undefined, voucherType: voucherType || undefined,
      });
      setRows(data.rows);
      setTotals(data.totals);
    } catch (err) {
      console.error('Failed to load day book', err);
      setRows([]);
      setTotals({ debit: 0, credit: 0 });
    } finally {
      setLoading(false);
    }
  }, [from, to, projectId, voucherType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getProjects().then(({ data }) => setProjects(data)).catch(() => setProjects([])); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (r.description || '').toLowerCase().includes(q)
      || (r.voucherNo || '').toLowerCase().includes(q)
      || (r.note || '').toLowerCase().includes(q)
      || (r.project || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['SL', 'Date', 'Project', 'Description', 'Voucher No.', 'Debit', 'Credit', 'Note'];
    const lines = filtered.map((r, i) => [
      i + 1, new Date(r.date).toLocaleDateString('en-GB'), r.project, r.description, r.voucherNo,
      r.debit.toFixed(2), r.credit.toFixed(2), r.note,
    ]);
    lines.push(['', '', '', '', 'Total', totals.debit.toFixed(2), totals.credit.toFixed(2), '']);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `day-book-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
                { label: 'Accounts Module (Report)', to: '/accounts-module/reports' },
                { label: 'Day Book' },
              ]}
            />
            <h1 className={`text-3xl font-semibold ${C.ink} mt-1 tracking-tight`}>Day Book</h1>
            <p className={`text-sm ${C.inkMuted} mt-1`}>All vouchers posted within the selected period</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-2 bg-white hover:bg-[#FBF9F4] ${C.ink} border ${C.border} text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors`}
          >
            <ArrowLeft size={16} /> Back to Previous
          </button>
        </div>

        {/* Metrics strip */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden border ${C.border} mb-6`}>
          <Metric icon={BookOpen} label="Voucher Entries" value={filtered.length.toLocaleString()} accentBorder="border-t-[#1F5D42]" iconColor={C.forest} valueColor={C.ink} />
          <Metric icon={ArrowDownCircle} label="Total Debit" value={formatMoney(totals.debit)} accentBorder="border-t-[#946B1B]" iconColor={C.gold} valueColor={C.gold} />
          <Metric icon={ArrowUpCircle} label="Total Credit" value={formatMoney(totals.credit)} accentBorder="border-t-[#1F5D42]" iconColor={C.forest} valueColor={C.ink} />
        </div>

        {/* Workspace */}
        <div className={`${C.surface} rounded-xl border ${C.border} shadow-sm overflow-hidden mb-6`}>
          {/* Filters */}
          <div className={`px-5 py-4 border-b ${C.border} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`}>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                  className={`flex-1 border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => { setTo(e.target.value); setPage(1); }}
                  className={`flex-1 border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
                />
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>Project</label>
              <select
                value={projectId}
                onChange={(e) => { setProjectId(e.target.value); setPage(1); }}
                className={`w-full border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              >
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>Voucher Type</label>
              <select
                value={voucherType}
                onChange={(e) => { setVoucherType(e.target.value); setPage(1); }}
                className={`w-full border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              >
                <option value="">All Voucher Types</option>
                {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Toolbar: export + search + page size */}
          <div className={`px-5 py-3 border-b ${C.border} flex flex-wrap items-center gap-3 bg-[#FBF9F4]`}>
            <button
              onClick={exportCsv}
              className={`inline-flex items-center gap-1.5 bg-white hover:bg-[#F6F3EC] ${C.forest} border border-[#BFD9CB] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-1.5 bg-white hover:bg-[#F6F3EC] ${C.danger} border border-[#EFC9BB] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
            >
              <FileDown size={13} /> PDF
            </button>

            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA098]" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search description, voucher no, note..."
                className={`w-full border ${C.border} rounded-lg pl-8 pr-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              />
            </div>

            <div className="flex items-center gap-2 text-sm ml-auto">
              <span className={C.inkMuted}>Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className={`border ${C.border} rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25`}
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`${C.forestBg} text-white whitespace-nowrap`}>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">SL</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Voucher No.</th>
                  <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide">Debit</th>
                  <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide">Credit</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${C.border}`}>
                {loading ? (
                  <tr><td colSpan={8} className={`text-center py-14 ${C.inkMuted} text-sm`}>Loading day book…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-14">
                      <BookOpen size={28} className="mx-auto text-[#C7C1AE] mb-2" />
                      <p className={`${C.ink} text-sm font-medium`}>No entries found</p>
                      <p className={`${C.inkMuted} text-xs mt-0.5`}>Try adjusting your filters or date range</p>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => (
                    <tr
                      key={i}
                      className={`whitespace-nowrap transition-colors hover:bg-[#F6F3EC] ${i % 2 === 1 ? 'bg-[#FBF9F4]' : 'bg-white'}`}
                    >
                      <td className="px-4 py-3 text-[#9AA098]">{(page - 1) * pageSize + i + 1}</td>
                      <td className={`px-4 py-3 ${C.inkMuted}`}>{new Date(r.date).toLocaleDateString('en-GB')}</td>
                      <td className={`px-4 py-3 ${C.ink}`}>{r.project || <span className="text-[#C7C1AE]">-</span>}</td>
                      <td className={`px-4 py-3 ${C.ink}`}>{r.description || <span className="text-[#C7C1AE]">-</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block ${C.forestSoft} ${C.forest} text-xs font-semibold px-2.5 py-1 rounded-md font-mono tracking-tight`}>{r.voucherNo}</span>
                      </td>
                      <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{r.debit ? formatMoney(r.debit) : <span className="text-[#C7C1AE]">-</span>}</td>
                      <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{r.credit ? formatMoney(r.credit) : <span className="text-[#C7C1AE]">-</span>}</td>
                      <td className={`px-4 py-3 ${C.inkMuted}`}>{r.note || <span className="text-[#C7C1AE]">-</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className={`border-t-2 border-[#1F5D42] font-semibold ${C.goldSoft}`}>
                  <td colSpan={5} className={`px-4 py-3 text-right ${C.ink}`}>Total</td>
                  <td className={`px-4 py-3 text-right ${C.gold} tabular-nums`}>{formatMoney(totals.debit)}</td>
                  <td className={`px-4 py-3 text-right ${C.gold} tabular-nums`}>{formatMoney(totals.credit)}</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pagination */}
          <div className={`flex items-center justify-between px-5 py-4 border-t ${C.border}`}>
            <span className={`text-sm ${C.inkMuted}`}>
              Showing <span className={`font-medium ${C.ink}`}>{pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className={`font-medium ${C.ink}`}>{(page - 1) * pageSize + pageRows.length}</span> of{' '}
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
    <div className={`bg-white border-t-[3px] ${accentBorder} px-5 py-4 flex items-center gap-3.5 border-r border-[#E4DFCF] last:border-r-0`}>
      <div className="w-9 h-9 rounded-lg bg-[#E7F0EA] flex items-center justify-center shrink-0">
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <p className={`text-[11px] font-medium ${C.inkMuted} uppercase tracking-wide`}>{label}</p>
        <p className={`text-xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}