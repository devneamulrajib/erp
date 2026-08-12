import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import { getExpenseReport } from '../api/accountingReports';
import { getProjects } from '../api/project';

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function ExpenseReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getExpenseReport({ from, to, project: projectId || undefined });
      setRows(data.rows);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load expense report', err);
      setRows([]); setTotal(0);
    } finally { setLoading(false); }
  }, [from, to, projectId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getProjects().then(({ data }) => setProjects(data)).catch(() => setProjects([])); }, []);

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (r.description || '').toLowerCase().includes(q) || (r.voucherNo || '').toLowerCase().includes(q) || (r.note || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function formatMoney(n) { return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function exportCsv() {
    const header = ['ID', 'Date', 'Voucher', 'Description', 'Note', 'Amount'];
    const lines = filtered.map((r, i) => [i + 1, new Date(r.date).toLocaleDateString('en-GB'), r.voucherNo, r.description, r.note, r.amount.toFixed(2)]);
    lines.push(['', '', '', '', 'Total', total.toFixed(2)]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `expense-report-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <ModuleNav />
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600 flex items-center gap-0.5">Accounts Module (Report) <ChevronDown size={14} /></span>
            <span>&gt;</span>
            <span className="text-gray-700">Expense Report</span>
          </div>
          <button onClick={() => navigate(-1)} className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5">
            <ArrowLeft size={14} /> Back to Previous
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <div className="flex gap-1">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={exportCsv} className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md">Copy</button>
            <button onClick={exportCsv} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-md">CSV</button>
            <button onClick={exportCsv} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md">Excel</button>
            <button onClick={() => window.print()} className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md">PDF</button>
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
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">DATE</th>
              <th className="px-3 py-2 font-medium">VOUCHER</th>
              <th className="px-3 py-2 font-medium">DESCRIPTION</th>
              <th className="px-3 py-2 font-medium">NOTE</th>
              <th className="px-3 py-2 font-medium text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">No expenses found</td></tr>
            ) : pageRows.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="px-3 py-2 text-indigo-600 font-medium">{r.voucherNo}</td>
                <td className="px-3 py-2 text-indigo-600">{r.description}</td>
                <td className="px-3 py-2">{r.note}</td>
                <td className="px-3 py-2 text-right">{formatMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="font-semibold border-t-2 border-gray-300">
                <td colSpan={5} className="px-3 py-2 text-center">TOTAL</td>
                <td className="px-3 py-2 text-right">{formatMoney(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div>Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to {(page - 1) * pageSize + pageRows.length} of {filtered.length} entries</div>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
              <button key={n} onClick={() => setPage(n)} className={`px-3 py-1.5 rounded-md ${n === page ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>{n}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}