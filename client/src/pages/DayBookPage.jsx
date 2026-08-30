import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import { getDayBook } from '../api/accountingReports';
import { getProjects } from '../api/project';

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
    <div>

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600 flex items-center gap-0.5">Accounts Module (Report) <ChevronDown size={14} /></span>
            <span>&gt;</span>
            <span className="text-gray-700">Day Book</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Previous
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <div className="flex gap-1">
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Voucher Type</label>
            <select value={voucherType} onChange={(e) => { setVoucherType(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Invoice Type</option>
              {VOUCHER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md">Excel</button>
            <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md">PDF</button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            Show
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1">
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
            <span className="ml-4">Search:</span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5" />
          </div>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-indigo-500 text-white text-left">
              <th className="px-3 py-2 font-medium">SL.</th>
              <th className="px-3 py-2 font-medium">DATE</th>
              <th className="px-3 py-2 font-medium">PROJECT</th>
              <th className="px-3 py-2 font-medium">DESCRIPTION</th>
              <th className="px-3 py-2 font-medium">VOUCHER NO.</th>
              <th className="px-3 py-2 font-medium text-right">DEBIT</th>
              <th className="px-3 py-2 font-medium text-right">CREDIT</th>
              <th className="px-3 py-2 font-medium">NOTE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-6 text-gray-400">No data available in table</td></tr>
            ) : pageRows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('en-GB')}</td>
                <td className="px-3 py-2">{r.project}</td>
                <td className="px-3 py-2">{r.description}</td>
                <td className="px-3 py-2 text-indigo-600 font-medium">{r.voucherNo}</td>
                <td className="px-3 py-2 text-right">{r.debit ? formatMoney(r.debit) : ''}</td>
                <td className="px-3 py-2 text-right">{r.credit ? formatMoney(r.credit) : ''}</td>
                <td className="px-3 py-2">{r.note}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={5} className="px-3 py-2 text-right">Total:</td>
              <td className="px-3 py-2 text-right bg-lime-300">{formatMoney(totals.debit)}</td>
              <td className="px-3 py-2 text-right bg-lime-300">{formatMoney(totals.credit)}</td>
              <td className="px-3 py-2"></td>
            </tr>
          </tfoot>
        </table>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div>Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to {(page - 1) * pageSize + pageRows.length} of {filtered.length} entries</div>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Previous</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}