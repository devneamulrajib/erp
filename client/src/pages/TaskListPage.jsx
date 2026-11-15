import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Loader2, X } from 'lucide-react';
import Topbar from '../components/Topbar';
import { listTasks, createTasks, deleteTask, fmtMinutes } from '../api/task';
import { getEmployees } from '../api/employee';

const STATUSES = ['To Do', 'In Progress', 'On Hold', 'Done', 'Cancelled'];
const STATUS_CLS = {
  'To Do': 'bg-slate-100 text-slate-600', 'In Progress': 'bg-blue-50 text-blue-700',
  'On Hold': 'bg-amber-50 text-amber-700', Done: 'bg-emerald-50 text-emerald-700', Cancelled: 'bg-red-50 text-red-600',
};
const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900';
const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function TaskListPage() {
  const [tasks, setTasks] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ status: 'open', employeeId: '', q: '' });
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    listTasks(params).then((d) => { setTasks(d); setError(''); })
      .catch((e) => setError(e.response?.data?.message || 'Could not load tasks.'));
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    getEmployees().then(({ data: d }) => setEmployees((Array.isArray(d) ? d : d?.rows || d?.employees || []).filter((e) => e.status !== 'Inactive')))
      .catch(() => {});
  }, []);

  async function remove(t) {
    if (!window.confirm(`Delete task "${t.title}" and all its time entries?`)) return;
    try { await deleteTask(t.id); load(); } catch (e) { setError(e.response?.data?.message || 'Could not delete.'); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <main className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
            <p className="text-sm text-slate-500">Assign work to employees and track progress.</p>
          </div>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800">
            <Plus size={16} /> Assign task
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-3">
          <select className={`${inputCls} !w-40`} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
            <option value="open">Open</option>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={`${inputCls} !w-52`} value={filters.employeeId} onChange={(e) => setFilters((f) => ({ ...f, employeeId: e.target.value }))}>
            <option value="">All employees</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input className={`${inputCls} !w-60`} placeholder="Search title…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Task</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th><th className="px-4 py-3 text-right">Worked / Est.</th>
                <th className="px-4 py-3">Due</th><th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks === null ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400"><Loader2 className="mx-auto animate-spin" /></td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No tasks found.</td></tr>
              ) : tasks.map((t) => {
                const overdue = t.dueDate && !['Done', 'Cancelled'].includes(t.status) && t.dueDate < todayStr();
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/hrm-module/tasks/${t.id}`} className="font-medium text-slate-900 hover:underline">{t.title}</Link>
                      <p className="text-xs text-slate-400">{t.priority}{t.project ? ` · ${t.project.name}` : ''} · {t.createdByType === 'admin' ? `by ${t.createdByName || 'admin'}` : 'self-added'}</p>
                    </td>
                    <td className="px-4 py-3">{t.assignee?.name}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLS[t.status]}`}>{t.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-slate-900" style={{ width: `${t.progress}%` }} /></div>
                        <span className="text-xs text-slate-500">{t.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtMinutes(t.workedMinutes)}{t.estimatedMinutes ? ` / ${fmtMinutes(t.estimatedMinutes)}` : ''}</td>
                    <td className={`px-4 py-3 ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>{t.dueDate || '—'}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => remove(t)} className="text-xs text-red-500 hover:underline">Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      {showForm && <AssignModal employees={employees} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function AssignModal({ employees, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', estimateHours: '' });
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createTasks({
        title: form.title, description: form.description, priority: form.priority,
        dueDate: form.dueDate || null,
        estimatedMinutes: form.estimateHours ? Math.round(Number(form.estimateHours) * 60) : null,
        assignedTo: selected,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not assign the task.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Assign task</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">{error}</p>}
        <input required className={inputCls} placeholder="Task title" value={form.title} onChange={set('title')} />
        <textarea rows={3} className={inputCls} placeholder="Description" value={form.description} onChange={set('description')} />
        <div className="grid grid-cols-3 gap-3">
          <select className={inputCls} value={form.priority} onChange={set('priority')}>{['Low', 'Medium', 'High', 'Urgent'].map((p) => <option key={p}>{p}</option>)}</select>
          <input type="date" className={inputCls} value={form.dueDate} onChange={set('dueDate')} />
          <input type="number" min="0" step="0.25" className={inputCls} placeholder="Est. hours" value={form.estimateHours} onChange={set('estimateHours')} />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-700">Assign to ({selected.length} selected)</p>
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {employees.map((e) => (
              <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggle(e.id)} />
                {e.name} <span className="text-xs text-slate-400">{e.code}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Assigning…' : 'Assign'}</button>
        </div>
      </form>
    </div>
  );
}