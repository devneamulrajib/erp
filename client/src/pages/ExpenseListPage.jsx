import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Copy } from 'lucide-react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import api from '../api/axios';
import { getExpenses, deleteExpense, duplicateExpense } from '../api/expense';

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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Expense List' },
          ]}
        />
        <button
          onClick={() => navigate('/accounts-module/expense')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Expense List Add
        </button>
      </div>

      <div className="px-4 pb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
            <Field label="Select Date">
              <div className="flex gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" />
              </div>
            </Field>
            <Field label="Select Project">
              <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <div className="flex gap-2">
              <button type="button" onClick={exportPdf} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md">PDF</button>
              <button type="button" onClick={exportExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md">Excel</button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            Show
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1">
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
          <div className="flex items-center gap-2 text-sm">
            Search:
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['SL', 'Date', 'Reference', 'Project', 'Category', 'Debit', 'Credit',
                  'Amount', 'Added By', 'Status', 'Attachment', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-6 text-gray-400">Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-6 text-gray-400">No entries found</td></tr>
              ) : pageRows.map((e, i) => (
                <tr key={e._id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-3 py-2">{e.reference}</td>
                  <td className="px-3 py-2">{e.project}</td>
                  <td className="px-3 py-2">{e.category}</td>
                  <td className="px-3 py-2 text-indigo-600">{e.drAccount}</td>
                  <td className="px-3 py-2 text-indigo-600">{e.crAccount}</td>
                  <td className="px-3 py-2">{Number(e.amount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{e.addedBy}</td>
                  <td className="px-3 py-2 capitalize">{e.status}</td>
                  <td className="px-3 py-2">
                    {e.attachment ? (
                      <a href={e.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View</a>
                    ) : ''}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1.5">
                      <button onClick={() => navigate(`/accounts-module/expense/${e._id}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => navigate(`/accounts-module/expense/${e._id}`)} className="bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDuplicate(e._id)} className="bg-teal-500 hover:bg-teal-600 text-white p-1.5 rounded">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => handleDelete(e._id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
          <div>
            Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
            {(page - 1) * pageSize + pageRows.length} of {filtered.length} entries
          </div>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Previous</button>
            <span className="px-3 py-1.5 rounded-md bg-indigo-500 text-white">{page}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}