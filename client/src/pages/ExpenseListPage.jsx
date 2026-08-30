import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Copy, Search, FileText, FileSpreadsheet, Plus, Receipt } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import api from '../api/axios';
import { getExpenses, deleteExpense, duplicateExpense } from '../api/expense';

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";

export default function ExpenseListPage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [project, setProject] = useState('');

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExpenses({
        from: fromDate || undefined,
        to: toDate || undefined,
        project: project || undefined,
      });
      setExpenses(data);
    } catch (err) {
      console.error('Failed to load expenses', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, project]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  const filtered = expenses.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.reference || '').toLowerCase().includes(q) || (e.project || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleDelete(id) {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleDuplicate(id) {
    try {
      await duplicateExpense(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to duplicate');
    }
  }

  function exportExcel() {
    const headers = ['SL', 'Date', 'Reference', 'Project', 'Category', 'Debit', 'Credit', 'Amount', 'Added By', 'Status'];
    const rows = filtered.map((e, i) => [
      i + 1, new Date(e.date).toLocaleDateString(), e.reference, e.project, e.category,
      e.drAccount, e.crAccount, e.amount, e.addedBy, e.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/dashboard' },
                { label: 'Expense List' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Expense List</h1>
            <p className="text-sm text-slate-500 mt-0.5">Track and manage recorded expenses across projects</p>
          </div>
          <button
            onClick={() => navigate('/accounts-module/expense')}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Expense List Add
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className={labelClass}>From</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>To</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Select Project</label>
              <select value={project} onChange={(e) => setProject(e.target.value)} className={inputClass}>
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={exportPdf} className="inline-flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex-1">
                <FileText size={14} /> PDF
              </button>
              <button type="button" onClick={exportExcel} className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors flex-1">
                <FileSpreadsheet size={14} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Expenses</div>
            <div className="text-xl font-semibold text-slate-900">{expenses.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 col-span-2 sm:col-span-2">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Matching Filters</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pageRows.length} / {filtered.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search expenses..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Date', 'Reference', 'Project', 'Category', 'Debit', 'Credit',
                    'Amount', 'Added By', 'Status', 'Attachment', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={12} className="text-center py-16 text-slate-400 text-sm">Loading…</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Receipt size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting your filters, or add a new expense.</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map((e, i) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-3.5 text-slate-600">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{e.reference}</td>
                    <td className="px-4 py-3.5 text-slate-600">{e.project}</td>
                    <td className="px-4 py-3.5 text-slate-600">{e.category}</td>
                    <td className="px-4 py-3.5 text-indigo-600">{e.drAccount}</td>
                    <td className="px-4 py-3.5 text-indigo-600">{e.crAccount}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{Number(e.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{e.addedBy}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-indigo-600/10 capitalize">
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {e.attachment ? (
                        <a href={e.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm">View</a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate(`/accounts-module/expense/${e.id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors" title="View">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => navigate(`/accounts-module/expense/${e.id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDuplicate(e.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-500 hover:text-teal-600 transition-colors" title="Duplicate">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => handleDelete(e.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{(page - 1) * pageSize + pageRows.length}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors">
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
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}