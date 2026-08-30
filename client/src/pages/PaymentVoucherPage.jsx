import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import { Pencil, Trash2, Eye, Copy, Printer, Mail } from 'lucide-react';
import {
  getPaymentVouchers, getPaymentVoucher, getNextPaymentVoucherCode,
  createPaymentVoucher, updatePaymentVoucher, deletePaymentVoucher, duplicatePaymentVoucher,
} from '../api/paymentVoucher';
import { getChartOfAccounts, createChartOfAccount } from '../api/chartOfAccounts';
import { getChartOfGroupOptions } from '../api/chartOfGroup';

export default function PaymentVoucherPage() {
  const [projects, setProjects] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [sites, setSites] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [editingId, setEditingId] = useState(null);
  const [projectType, setProjectType] = useState('');
  const [project, setProject] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [task, setTask] = useState('');
  const [site, setSite] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [voucherNo, setVoucherNo] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [ifCheque, setIfCheque] = useState(false);
  const [chequeReceiptNo, setChequeReceiptNo] = useState('');
  const [comment, setComment] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceBill, setInvoiceBill] = useState('');
  const [item, setItem] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ chartOfGroup: '', code: '', name: '' });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterDebit, setFilterDebit] = useState('');
  const [filterCredit, setFilterCredit] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [filterTask, setFilterTask] = useState('');

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPaymentVouchers({
        from: fromDate || undefined,
        to: toDate || undefined,
        debitAccount: filterDebit || undefined,
        creditAccount: filterCredit || undefined,
        project: filterProject || undefined,
        titleOfWork: filterTitle || undefined,
        site: filterSite || undefined,
        task: filterTask || undefined,
      });
      setVouchers(Array.isArray(data) ? data : (data?.data ?? []));
    } catch (err) {
      console.error('Failed to load payment vouchers', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, filterDebit, filterCredit, filterProject, filterTitle, filterSite, filterTask]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  function reloadAccounts() {
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => setAccounts([]));
  }

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data ?? [])).catch(() => setProjects([]));
    api.get('/project-types').then((res) => setProjectTypes(res.data ?? [])).catch(() => setProjectTypes([]));
    api.get('/sites').then((res) => setSites(res.data ?? [])).catch(() => setSites([]));
    reloadAccounts();
    getChartOfGroupOptions().then((res) => setGroupOptions(res?.data ?? res ?? [])).catch(() => setGroupOptions([]));
    resetFormForCreate();
  }, []);

  function resetFormForCreate() {
    setEditingId(null);
    setProjectType(''); setProject(''); setTitleOfWork(''); setTask(''); setSite('');
    setDate(new Date().toISOString().slice(0, 10));
    setDebitAccount(''); setCreditAccount(''); setIfCheque(false); setChequeReceiptNo('');
    setComment(''); setAmount(''); setInvoiceBill(''); setItem(''); setAttachmentFile(null);
    setFormError('');
    getNextPaymentVoucherCode().then(setVoucherNo).catch(() => {});
  }

  async function loadForEdit(id) {
    try {
      const v = await getPaymentVoucher(id);
      setEditingId(v._id ?? v.id);
      setProjectType(v.projectType || '');
      setProject(v.project || '');
      setTitleOfWork(v.titleOfWork || '');
      setTask(v.task || '');
      setSite(v.site || '');
      setDate(v.date ? new Date(v.date).toISOString().slice(0, 10) : '');
      setVoucherNo(v.voucherNo || '');
      setDebitAccount(v.debitAccount || '');
      setCreditAccount(v.creditAccount || '');
      setIfCheque(!!v.ifCheque);
      setChequeReceiptNo(v.chequeReceiptNo || '');
      setComment(v.comment || '');
      setAmount(v.amount ?? '');
      setInvoiceBill(v.invoiceBill || '');
      setItem(v.item || '');
      setFormError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Failed to load voucher for edit', err);
    }
  }

  async function handleQuickAddSubmit(e) {
    e.preventDefault();
    if (!quickAddForm.chartOfGroup || !quickAddForm.name) return;
    setQuickAddSaving(true);
    try {
      const res = await createChartOfAccount(quickAddForm);
      const data = res?.data ?? res;
      reloadAccounts();
      setDebitAccount(data.name);
      setQuickAddOpen(false);
      setQuickAddForm({ chartOfGroup: '', code: '', name: '' });
    } catch (err) {
      console.error('Failed to create account', err);
    } finally {
      setQuickAddSaving(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!debitAccount || !creditAccount || !amount) {
      setFormError('Select Accounts, Payment Method and Amount are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        projectType, project, titleOfWork, task, site, date, voucherNo,
        debitAccount, creditAccount, ifCheque, chequeReceiptNo, comment, amount,
        invoiceBill, item, attachmentFile,
      };
      if (editingId) {
        await updatePaymentVoucher(editingId, payload);
      } else {
        await createPaymentVoucher(payload);
      }
      resetFormForCreate();
      await loadVouchers();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save payment voucher');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this payment voucher?')) return;
    try {
      await deletePaymentVoucher(id);
      await loadVouchers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleDuplicate(id) {
    try {
      await duplicatePaymentVoucher(id);
      await loadVouchers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to duplicate');
    }
  }

  function handleSendMail(v) {
    const subject = encodeURIComponent(`Payment Voucher ${v.voucherNo}`);
    const body = encodeURIComponent(`Payment Voucher: ${v.voucherNo}\nAmount: ${v.amount}\nDebit: ${v.debitAccount}\nCredit: ${v.creditAccount}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handlePrint() {
    window.print();
  }

  function handleChequePrint(v) {
    window.print();
  }

  function exportExcel() {
    const headers = ['SL', 'Date', 'Project', 'Title/Name of Work', 'Code', 'Debit', 'Credit', 'Total', 'Comment', 'Cheque/Receipt', 'Added By', 'Status'];
    const rows = filtered.map((v, i) => [
      i + 1, new Date(v.date).toLocaleDateString(), v.project, v.titleOfWork, v.voucherNo,
      v.debitAccount, v.creditAccount, v.amount, v.comment, v.chequeReceiptNo, v.addedBy, v.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment_voucher_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = (vouchers || []).filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.voucherNo || '').toLowerCase().includes(q) || (v.project || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Payment Voucher' },
          ]}
        />
      </div>

      <div className="px-4 pb-10">
        {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{formError}</div>}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Field label="Project Type">
              <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input">
                <option value="">Select Project Type</option>
                {(projectTypes || []).map((pt) => <option key={pt._id ?? pt.id} value={pt.name}>{pt.name}</option>)}
              </select>
            </Field>
            <Field label="Project">
              <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                <option value="">Select Project</option>
                {(projects || []).map((p) => <option key={p._id ?? p.id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Title/Name of Work">
              <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
            </Field>
            <Field label="If Task">
              <input value={task} onChange={(e) => setTask(e.target.value)} className="input" placeholder="Select Task" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Field label="Site">
              <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
                <option value="">Select Site</option>
                {(sites || []).map((s) => <option key={s._id ?? s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </Field>
            <Field label="Voucher No">
              <input value={voucherNo} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Select Accounts" required>
              <div className="flex gap-2">
                <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} className="input flex-1">
                  <option value="">Select Chart Of Account_id</option>
                  {(accounts || []).map((a) => <option key={a._id ?? a.id} value={a.name}>{a.name}</option>)}
                </select>
                <button type="button" onClick={() => setQuickAddOpen(true)} className="px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold">+</button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Field label={<span>Payment Method <span className="text-red-500">*</span> <label className="ml-2 text-xs font-normal"><input type="checkbox" checked={ifCheque} onChange={(e) => setIfCheque(e.target.checked)} className="mr-1" />if Cheque</label></span>} required>
              <select value={creditAccount} onChange={(e) => setCreditAccount(e.target.value)} className="input">
                <option value="">Select Payment Method</option>
                {(accounts || []).map((a) => <option key={a._id ?? a.id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Cheque/Receipt No">
              <input value={chequeReceiptNo} onChange={(e) => setChequeReceiptNo(e.target.value)} className="input" placeholder="Select or type cheque number" disabled={!ifCheque} />
            </Field>
            <Field label="Comment/Narration">
              <input value={comment} onChange={(e) => setComment(e.target.value)} className="input" placeholder="Enter Comment" />
            </Field>
            <Field label="Amount" required>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" placeholder="Amount" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Field label="Select Invoice">
              <input value={invoiceBill} onChange={(e) => setInvoiceBill(e.target.value)} className="input" placeholder="Select Invoice" />
            </Field>
            <Field label="Select Item">
              <input value={item} onChange={(e) => setItem(e.target.value)} className="input" placeholder="Select Item" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="input" />
            </Field>
          </div>

          <div className="flex justify-center gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : (editingId ? 'Update' : 'Submit')}
            </button>
            {editingId && (
              <button type="button" onClick={resetFormForCreate} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2.5 rounded-md">
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Field label="Select Date">
              <div className="flex gap-2">
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="input" />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="input" />
              </div>
            </Field>
            <Field label="Debit Accounts">
              <select value={filterDebit} onChange={(e) => setFilterDebit(e.target.value)} className="input">
                <option value="">Select Chart Of Account</option>
                {(accounts || []).map((a) => <option key={a._id ?? a.id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Credit Accounts">
              <select value={filterCredit} onChange={(e) => setFilterCredit(e.target.value)} className="input">
                <option value="">Select Chart Of Account</option>
                {(accounts || []).map((a) => <option key={a._id ?? a.id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
            <Field label="Select Project">
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="input">
                <option value="">Select Project</option>
                {(projects || []).map((p) => <option key={p._id ?? p.id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <Field label="Title/Name of Work">
              <input value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
            </Field>
            <Field label="Site">
              <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className="input">
                <option value="">Select Site</option>
                {(sites || []).map((s) => <option key={s._id ?? s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <div className="flex items-end gap-2">
              <Field label="Task">
                <select value={filterTask} onChange={(e) => setFilterTask(e.target.value)} className="input">
                  <option value="">Select Task</option>
                </select>
              </Field>
              <button type="button" onClick={handlePrint} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md">PDF</button>
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
                {['SL', 'Date', 'Project', 'Title/Name of Work', 'Code', 'Debit', 'Credit', 'Total',
                  'Comment', 'Cheque/Receipt', 'Added By', 'Edited By', 'Approve', 'Attachment', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={16} className="text-center py-6 text-gray-400">Loading...</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={16} className="text-center py-6 text-gray-400">No entries found</td></tr>
              ) : pageRows.map((v, i) => (
                <tr key={v._id ?? v.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(v.date)}</td>
                  <td className="px-3 py-2">{v.project}</td>
                  <td className="px-3 py-2">{v.titleOfWork}</td>
                  <td className="px-3 py-2">{v.voucherNo}</td>
                  <td className="px-3 py-2 text-indigo-600">{v.debitAccount}</td>
                  <td className="px-3 py-2 text-indigo-600">{v.creditAccount}</td>
                  <td className="px-3 py-2">{Number(v.amount || 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{v.comment}</td>
                  <td className="px-3 py-2">{v.chequeReceiptNo}</td>
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
                      <button onClick={() => loadForEdit(v._id ?? v.id)} className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded" title="View">
                        <Eye size={13} />
                      </button>
                      <button onClick={handlePrint} className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded" title="Print">
                        <Printer size={13} />
                      </button>
                      <button onClick={() => handleSendMail(v)} className="bg-gray-500 hover:bg-gray-600 text-white p-1.5 rounded" title="Send Mail">
                        <Mail size={13} />
                      </button>
                      {v.ifCheque && (
                        <button onClick={() => handleChequePrint(v)} className="bg-violet-500 hover:bg-violet-600 text-white text-[10px] font-medium px-2 rounded" title="Cheque Print">
                          Cheque Print
                        </button>
                      )}
                      <button onClick={() => loadForEdit(v._id ?? v.id)} className="bg-sky-500 hover:bg-sky-600 text-white p-1.5 rounded" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(v._id ?? v.id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded" title="Delete">
                        <Trash2 size={13} />
                      </button>
                      <button onClick={() => handleDuplicate(v._id ?? v.id)} className="bg-teal-500 hover:bg-teal-600 text-white p-1.5 rounded" title="Duplicate">
                        <Copy size={13} />
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

      <Modal open={quickAddOpen} title="Quick Add Chart of Account" onClose={() => setQuickAddOpen(false)}>
        <form onSubmit={handleQuickAddSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Chart of Group</label>
              <select
                required
                value={quickAddForm.chartOfGroup}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, chartOfGroup: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select value</option>
                {(groupOptions || []).map((g) => <option key={g._id ?? g.id} value={g._id ?? g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={quickAddForm.code}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Name</label>
              <input
                required
                value={quickAddForm.name}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={() => setQuickAddOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-md">Close</button>
            <button type="submit" disabled={quickAddSaving} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-md disabled:opacity-50">
              {quickAddSaving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}