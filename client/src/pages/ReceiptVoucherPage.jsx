import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import {
  Pencil, Trash2, Eye, Copy, Printer, Mail, Search, FileText, FileSpreadsheet, Plus,
  Receipt, Landmark, SlidersHorizontal, ChevronDown, ChevronUp, Paperclip, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  getReceiptVouchers, getReceiptVoucher, getNextReceiptVoucherCode,
  createReceiptVoucher, updateReceiptVoucher, deleteReceiptVoucher, duplicateReceiptVoucher,
} from '../api/receiptVoucher';
import { getChartOfAccounts, createChartOfAccount } from '../api/chartOfAccounts';
import { getChartOfGroupOptions } from '../api/chartOfGroup';

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";

export default function ReceiptVoucherPage() {
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
  const [creditAccount, setCreditAccount] = useState('');
  const [debitAccount, setDebitAccount] = useState('');
  const [ifCheque, setIfCheque] = useState(false);
  const [chequeReceiptNo, setChequeReceiptNo] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [invoiceBill, setInvoiceBill] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [installment, setInstallment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ chartOfGroup: '', code: '', name: '' });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  // filters
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filterCredit, setFilterCredit] = useState('');
  const [filterDebit, setFilterDebit] = useState('');
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
      const data = await getReceiptVouchers({
        from: fromDate || undefined,
        to: toDate || undefined,
        creditAccount: filterCredit || undefined,
        debitAccount: filterDebit || undefined,
        project: filterProject || undefined,
        titleOfWork: filterTitle || undefined,
        site: filterSite || undefined,
        task: filterTask || undefined,
      });
      setVouchers(data);
    } catch (err) {
      console.error('Failed to load receipt vouchers', err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, filterCredit, filterDebit, filterProject, filterTitle, filterSite, filterTask]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  function reloadAccounts() {
    getChartOfAccounts().then((res) => setAccounts(res?.data ?? res ?? [])).catch(() => {});
  }

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data ?? [])).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(res.data ?? [])).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data ?? [])).catch(() => {});
    reloadAccounts();
    getChartOfGroupOptions().then((res) => setGroupOptions(res?.data ?? res ?? [])).catch(() => {});
    resetFormForCreate();
  }, []);

  useEffect(() => { setPage(1); }, [search, pageSize]);

  function resetFormForCreate() {
    setEditingId(null);
    setProjectType(''); setProject(''); setTitleOfWork(''); setTask(''); setSite('');
    setDate(new Date().toISOString().slice(0, 10));
    setCreditAccount(''); setDebitAccount(''); setIfCheque(false); setChequeReceiptNo('');
    setAmount(''); setComment(''); setAttachmentFile(null);
    setInvoiceBill(''); setPaymentType(''); setInstallment('');
    setFormError('');
    getNextReceiptVoucherCode().then(setVoucherNo).catch(() => {});
  }

  async function loadForEdit(id) {
    try {
      const v = await getReceiptVoucher(id);
      setEditingId(v.id);
      setProjectType(v.projectType || '');
      setProject(v.project || '');
      setTitleOfWork(v.titleOfWork || '');
      setTask(v.task || '');
      setSite(v.site || '');
      setDate(v.date ? new Date(v.date).toISOString().slice(0, 10) : '');
      setVoucherNo(v.voucherNo || '');
      setCreditAccount(v.creditAccount || '');
      setDebitAccount(v.debitAccount || '');
      setIfCheque(!!v.ifCheque);
      setChequeReceiptNo(v.chequeReceiptNo || '');
      setAmount(v.amount ?? '');
      setComment(v.comment || '');
      setInvoiceBill(v.invoiceBill || '');
      setPaymentType(v.paymentType || '');
      setInstallment(v.installment || '');
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
      const { data } = await createChartOfAccount(quickAddForm);
      reloadAccounts();
      setCreditAccount(data.name);
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
    if (!creditAccount || !debitAccount || !amount) {
      setFormError('Select Accounts, Payment Method and Amount are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        projectType, project, titleOfWork, task, site, date, voucherNo,
        creditAccount, debitAccount, ifCheque, chequeReceiptNo, amount, comment,
        invoiceBill, paymentType, installment, attachmentFile,
      };
      if (editingId) {
        await updateReceiptVoucher(editingId, payload);
      } else {
        await createReceiptVoucher(payload);
      }
      resetFormForCreate();
      await loadVouchers();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save receipt voucher');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this receipt voucher?')) return;
    try {
      await deleteReceiptVoucher(id);
      await loadVouchers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  async function handleDuplicate(id) {
    try {
      await duplicateReceiptVoucher(id);
      await loadVouchers();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to duplicate');
    }
  }

  function handleSendMail(v) {
    const subject = encodeURIComponent(`Receipt Voucher ${v.voucherNo}`);
    const body = encodeURIComponent(`Receipt Voucher: ${v.voucherNo}\nAmount: ${v.amount}\nCredit: ${v.creditAccount}\nDebit: ${v.debitAccount}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handlePrint() {
    window.print();
  }

  function exportExcel() {
    const headers = ['SL', 'Date', 'Project', 'Code', 'Credit', 'Debit', 'Total', 'Ref', 'Cheque/Receipt', 'Comment', 'Added By', 'Status'];
    const rows = filtered.map((v, i) => [
      i + 1, new Date(v.date).toLocaleDateString(), v.project, v.voucherNo,
      v.creditAccount, v.debitAccount, v.amount, v.titleOfWork, v.chequeReceiptNo, v.comment, v.addedBy, v.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'receipt_voucher_list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = vouchers.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.voucherNo || '').toLowerCase().includes(q) || (v.project || '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
  const totalAmount = filtered.reduce((sum, v) => sum + Number(v.amount || 0), 0);
  const activeFilterCount = [fromDate, toDate, filterCredit, filterDebit, filterProject, filterTitle, filterSite, filterTask].filter(Boolean).length;

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
                { label: 'Receipt Voucher' },
              ]}
            />
            <div className="flex items-center gap-2.5 mt-1">
              <span className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/25">
                <Receipt size={17} />
              </span>
              <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Receipt Voucher</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1 ml-[46px]">Record incoming payments against a credit and debit account</p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-3">
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 min-w-[120px]">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Entries</div>
              <div className="text-lg font-semibold text-slate-900">{filtered.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 min-w-[140px]">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Amount</div>
              <div className="text-lg font-semibold text-slate-900">{totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5 flex items-center gap-2">
            <XCircle size={16} className="shrink-0" />
            {formError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Landmark size={15} className="text-indigo-500" />
              {editingId ? `Editing Voucher · ${voucherNo}` : 'New Voucher'}
            </h2>
            {editingId && (
              <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
                Editing mode
              </span>
            )}
          </div>

          <div className="p-6">
            {/* Section: Project context */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputClass}>
                  <option value="">Select Project Type</option>
                  {projectTypes.map((pt) => <option key={pt.id} value={pt.name}>{pt.name}</option>)}
                </select>
              </Field>
              <Field label="Project">
                <select value={project} onChange={(e) => setProject(e.target.value)} className={inputClass}>
                  <option value="">Select Project</option>
                  {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Title/Name of Work">
                <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className={inputClass} placeholder="Select Title/Name of Work" />
              </Field>
              <Field label="If Task">
                <input value={task} onChange={(e) => setTask(e.target.value)} className={inputClass} placeholder="Select Task" />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputClass}>
                  <option value="">Select Site</option>
                  {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Voucher No">
                <input value={voucherNo} readOnly className={`${inputClass} bg-slate-50 text-slate-500 font-mono`} />
              </Field>
              <Field label="Select Accounts" required>
                <div className="flex gap-2">
                  <select value={creditAccount} onChange={(e) => setCreditAccount(e.target.value)} className={`${inputClass} flex-1`}>
                    <option value="">Select Chart Of Account</option>
                    {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(true)}
                    className="w-10 shrink-0 flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    title="Quick add account"
                  >
                    <Plus size={16} strokeWidth={2.5} />
                  </button>
                </div>
              </Field>
            </div>

            <div className="h-px bg-slate-100 mb-5" />

            {/* Section: Payment */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <Field
                label={
                  <span className="flex items-center gap-2">
                    Payment Method <span className="text-red-500">*</span>
                    <label className="flex items-center gap-1 text-xs font-normal text-slate-500">
                      <input type="checkbox" checked={ifCheque} onChange={(e) => setIfCheque(e.target.checked)} className="rounded" />
                      if Cheque
                    </label>
                  </span>
                }
                required
              >
                <select value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} className={inputClass}>
                  <option value="">Select Payment Method</option>
                  {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                </select>
              </Field>
              <Field label="Cheque/Receipt No">
                <input value={chequeReceiptNo} onChange={(e) => setChequeReceiptNo(e.target.value)} className={inputClass} placeholder="Enter Cheque/Receipt No" disabled={!ifCheque} />
              </Field>
              <Field label="Amount" required>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">৳</span>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} pl-7`} placeholder="0.00" />
                </div>
              </Field>
              <Field label="Comment">
                <input value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} placeholder="Enter Comment" />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <Field label="Attachment">
                <label className={`${inputClass} flex items-center gap-2 cursor-pointer text-slate-500`}>
                  <Paperclip size={14} className="shrink-0 text-slate-400" />
                  <span className="truncate">{attachmentFile ? attachmentFile.name : 'Choose file — no file chosen'}</span>
                  <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </Field>
            </div>

            <div className="h-px bg-slate-100 mb-5" />

            {/* Section: References */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Select Invoice/Bill">
                <input value={invoiceBill} onChange={(e) => setInvoiceBill(e.target.value)} className={inputClass} placeholder="Select Invoice" />
              </Field>
              <Field label="Payment Type">
                <input value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={inputClass} placeholder="Select Payment Type" />
              </Field>
              <Field label="Select Installment">
                <input value={installment} onChange={(e) => setInstallment(e.target.value)} className={inputClass} placeholder="Select Invoice" />
              </Field>
            </div>
          </div>

          <div className="flex gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : (editingId ? 'Update Voucher' : 'Submit Voucher')}
            </button>
            {editingId && (
              <button type="button" onClick={resetFormForCreate} className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium px-6 py-2.5 rounded-lg transition-colors">
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="w-full flex items-center justify-between px-6 py-4"
          >
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-indigo-500" />
              Filters
              {activeFilterCount > 0 && (
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">{activeFilterCount} active</span>
              )}
            </span>
            {filtersOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>

          {filtersOpen && (
            <div className="px-6 pb-6 border-t border-slate-100 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <Field label="From">
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="To">
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Credit Accounts">
                  <select value={filterCredit} onChange={(e) => setFilterCredit(e.target.value)} className={inputClass}>
                    <option value="">Select Chart Of Account</option>
                    {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </Field>
                <Field label="Debit Accounts">
                  <select value={filterDebit} onChange={(e) => setFilterDebit(e.target.value)} className={inputClass}>
                    <option value="">Select Chart Of Account</option>
                    {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Field label="Select Project">
                  <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className={inputClass}>
                    <option value="">Select Project</option>
                    {projects.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Title/Name of Work">
                  <input value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)} className={inputClass} placeholder="Select Title/Name of Work" />
                </Field>
                <Field label="Site">
                  <select value={filterSite} onChange={(e) => setFilterSite(e.target.value)} className={inputClass}>
                    <option value="">Select Site</option>
                    {sites.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Task">
                  <select value={filterTask} onChange={(e) => setFilterTask(e.target.value)} className={inputClass}>
                    <option value="">Select Task</option>
                  </select>
                </Field>
              </div>
              <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
                <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  <FileText size={14} /> PDF
                </button>
                <button type="button" onClick={exportExcel} className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>
            </div>
          )}
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
                placeholder="Search vouchers..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {['SL', 'Date', 'Project', 'Code', 'Credit', 'Debit', 'Total', 'Ref', 'Cheque/Receipt',
                    'Comment', 'Added By', 'Edited By', 'Approve', 'Attachment', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-sm">Loading vouchers…</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Receipt size={28} strokeWidth={1.5} />
                        <p className="text-sm">No entries found. Try adjusting filters, or create a voucher above.</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map((v, i) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap align-top">
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-4 py-3.5 text-slate-600">{fmtDate(v.date)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{v.project}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">{v.voucherNo}</td>
                    <td className="px-4 py-3.5 text-indigo-600">{v.creditAccount}</td>
                    <td className="px-4 py-3.5 text-indigo-600">{v.debitAccount}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">{Number(v.amount || 0).toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-slate-600">{v.titleOfWork}</td>
                    <td className="px-4 py-3.5 text-slate-600">{v.chequeReceiptNo}</td>
                    <td className="px-4 py-3.5 text-slate-600">{v.comment}</td>
                    <td className="px-4 py-3.5 text-slate-600">{v.addedBy}</td>
                    <td className="px-4 py-3.5 text-slate-600">{v.editedBy}</td>
                    <td className="px-4 py-3.5">
                      {(v.approvals || []).length === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        v.approvals.map((a, idx) => (
                          <div key={idx} className={`flex items-center gap-1 ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                            {a.approved ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {a.name}
                          </div>
                        ))
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {v.attachment ? (
                        <a href={v.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline text-sm">
                          <Paperclip size={12} /> View
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-medium ring-1 ring-inset ring-indigo-600/10 capitalize">
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => handleSendMail(v)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-cyan-100 text-slate-500 hover:text-cyan-600 transition-colors" title="Send Mail">
                          <Mail size={14} />
                        </button>
                        <button onClick={() => loadForEdit(v.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={handlePrint} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Print">
                          <Printer size={14} />
                        </button>
                        <button onClick={() => handleDuplicate(v.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-500 hover:text-teal-600 transition-colors" title="Duplicate">
                          <Copy size={14} />
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => loadForEdit(v.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors" title="View">
                          <Eye size={14} />
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

      <Modal open={quickAddOpen} title="Quick Add Chart of Account" onClose={() => setQuickAddOpen(false)}>
        <form onSubmit={handleQuickAddSubmit}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Chart of Group</label>
              <select
                required
                value={quickAddForm.chartOfGroup}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, chartOfGroup: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select value</option>
                {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Code</label>
              <input
                value={quickAddForm.code}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, code: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Account Name</label>
              <input
                required
                value={quickAddForm.name}
                onChange={(e) => setQuickAddForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setQuickAddOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">Close</button>
            <button type="submit" disabled={quickAddSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors">
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
      <label className={labelClass}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}