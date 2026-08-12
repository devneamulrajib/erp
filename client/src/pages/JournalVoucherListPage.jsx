import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Printer, Mail, Eye, Copy } from 'lucide-react';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import api from '../api/axios';
import { getJournalVouchers, deleteJournalVoucher, duplicateJournalVoucher } from '../api/journalVoucher';
import { getChartOfAccounts } from '../api/chartOfAccounts';

export default function JournalVoucherListPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [site, setSite] = useState('');
  const [task, setTask] = useState('');

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJournalVouchers({
        from: fromDate || undefined,
        to: toDate || undefined,
        debitAccount: debitAccount || undefined,
        creditAccount: creditAccount || undefined,
        project: project || undefined,
        titleOfWork: titleOfWork || undefined,
        site: site || undefined,
        task: task || undefined,
      });
      setVouchers(data);
    } catch (err) {
      console.error('Failed to load journal vouchers', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, debitAccount, creditAccount, project, titleOfWork, site, task]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfAccounts().then((res) => setAccounts(res.data)).catch(console.error);
    api.get('/projects').then((res) => setProjects(res.data)).catch(console.error);
    api.get('/sites').then((res) => setSites(res.data)).catch(console.error);
  }, []);

  const filtered = vouchers.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.voucherNo || '').toLowerCase().includes(q) || (v.titleOfWork || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  async function handleDelete(id) {
    if (!window.confirm('Delete this journal voucher?')) return;
    try {
      await deleteJournalVoucher(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleDuplicate(id) {
    try {
      await duplicateJournalVoucher(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to duplicate');
    }
  }

  function handleSendMail(v) {
    const subject = encodeURIComponent(`Journal Voucher ${v.voucherNo}`);
    const body = encodeURIComponent(`Journal Voucher: ${v.voucherNo}\nTotal Debit: ${v.totalDebit}\nTotal Credit: ${v.totalCredit}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handlePrint() {
    window.print();
  }

  function exportCsv() {
    const headers = ['SL', 'Date', 'Title/Name of Work', 'Type', 'Code', 'Debit', 'Credit', 'Total', 'Comment', 'Added By', 'Status'];
    const rows = filtered.map((v, i) => {
      const debitLines = (v.lines || []).filter((l) => l.debit > 0).map((l) => l.account).join(', ');
      const creditLines = (v.lines || []).filter((l) => l.credit > 0).map((l) => l.account).join(', ');
      return [i + 1, new Date(v.date).toLocaleDateString(), v.titleOfWork, 'Journal', v.voucherNo, debitLines, creditLines, v.totalDebit, v.comment, v.addedBy, v.status];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journal_voucher_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    const text = filtered.map((v) => `${v.voucherNo}\t${v.titleOfWork}\t${v.totalDebit}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
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
            { label: 'Journal Voucher List' },
          ]}
        />
        <button
          onClick={() => navigate('/accounts-module/journal_list_add?type=Journal')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          + Add New
        </button>
      </div>

      <div className="px-4 pb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Select Date">
              <div className="flex gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" />
              </div>
            </Field>
            <Field label="Debit Accounts">
              <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} className="input">
                <option value="">Select Chart Of Account</option>
                {accounts.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Credit Accounts">
              <select value={creditAccount} onChange={(e) => setCreditAccount(e.target.value)} className="input">
                <option value="">Select Chart Of Account</option>
                {accounts.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Select Project">
              <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Field label="Title/Name of Work">
              <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
            </Field>
            <Field label="Site">
              <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
                <option value="">Select Site</option>
                {sites.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Task">
              <select value={task} onChange={(e) => setTask(e.target.value)} className="input">
                <option value="">Select Task</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button onClick={copyToClipboard} className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium px-4 py-2 rounded-md">Copy</button>
            <button onClick={exportCsv} className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-md">CSV</button>
            <div className="flex items-center gap-2 text-sm ml-4">
              Show
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              entries
            </div>
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
                {['SL', 'Date', 'Title/Name of Work', 'Type', 'Code', 'Debit', 'Credit', 'Total',
                  'Comment', 'Added By', 'Edited By', 'Approve', 'Attachment', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={15} className="text-center py-6 text-gray-400">Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={15} className="text-center py-6 text-gray-400">No entries found</td></tr>
              ) : pageRows.map((v, i) => {
                const debitLines = (v.lines || []).filter((l) => l.debit > 0).map((l) => l.account);
                const creditLines = (v.lines || []).filter((l) => l.credit > 0).map((l) => l.account);
                return (
                  <tr key={v._id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(v.date)}</td>
                    <td className="px-3 py-2">{v.titleOfWork}</td>
                    <td className="px-3 py-2">Journal</td>
                    <td className="px-3 py-2">{v.voucherNo}</td>
                    <td className="px-3 py-2 text-indigo-600">{debitLines.join(', ')}</td>
                    <td className="px-3 py-2 text-indigo-600">{creditLines.join(', ')}</td>
                    <td className="px-3 py-2">{Number(v.totalDebit || 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{v.comment}</td>
                    <td className="px-3 py-2">{v.addedBy}</td>
                    <td className="px-3 py-2">{v.editedBy}</td>
                    <td className="px-3 py-2">
                      {(v.approvals || []).length === 0 ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        v.approvals.map((a, idx) => (
                          <div key={idx} className={a.approved ? 'text-emerald-600' : 'text-red-500'}>
                            {a.approved ? '✓' : '✗'} {a.name}
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {v.attachment ? (
                        <a href={v.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View</a>
                      ) : ''}
                    </td>
                    <td className="px-3 py-2 capitalize">{v.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => navigate(`/accounts-module/journal_list_add/${v._id}`)} className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded" title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(v._id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded" title="Delete">
                          <Trash2 size={13} />
                        </button>
                        <button onClick={handlePrint} className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded" title="Print">
                          <Printer size={13} />
                        </button>
                        <button onClick={() => handleSendMail(v)} className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded" title="Mail">
                          <Mail size={13} />
                        </button>
                        <button onClick={() => navigate(`/accounts-module/journal_list_add/${v._id}`)} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded" title="View">
                          <Eye size={13} />
                        </button>
                        <button onClick={() => handleDuplicate(v._id)} className="bg-cyan-500 hover:bg-cyan-600 text-white p-1.5 rounded" title="Duplicate">
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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