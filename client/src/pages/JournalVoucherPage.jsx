import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import { Trash2 } from 'lucide-react';
import {
  getJournalVoucher, getNextJournalVoucherCode, createJournalVoucher, updateJournalVoucher,
} from '../api/journalVoucher';
import { getChartOfAccounts, createChartOfAccount } from '../api/chartOfAccounts';
import { getChartOfGroupOptions } from '../api/chartOfGroup';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const TYPE_OPTIONS = ['Debit', 'Credit'];

export default function JournalVoucherPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [projectType, setProjectType] = useState('');
  const [titleOfWork, setTitleOfWork] = useState('');
  const [project, setProject] = useState('');
  const [site, setSite] = useState('');
  const [task, setTask] = useState('');

  const [rowType, setRowType] = useState('');
  const [rowAccount, setRowAccount] = useState('');
  const [rowAmount, setRowAmount] = useState('');

  const [lines, setLines] = useState([]);
  const [comment, setComment] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ chartOfGroup: '', code: '', name: '' });
  const [quickAddSaving, setQuickAddSaving] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reloadAccounts() {
    getChartOfAccounts().then((res) => setAccounts(res.data)).catch(() => {});
  }

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    reloadAccounts();
    getChartOfGroupOptions().then((res) => setGroupOptions(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) return;
    getNextJournalVoucherCode().then(setVoucherNo).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getJournalVoucher(id).then((v) => {
      setVoucherNo(v.voucherNo || '');
      setDate(v.date ? new Date(v.date).toISOString().slice(0, 10) : '');
      setProjectType(v.projectType || '');
      setTitleOfWork(v.titleOfWork || '');
      setProject(v.project || '');
      setSite(v.site || '');
      setTask(v.task || '');
      setLines(v.lines || []);
      setComment(v.comment || '');
    }).catch((err) => {
      console.error(err);
      setError('Failed to load journal voucher.');
    });
  }, [id, isEdit]);

  const totalDebit = useMemo(() => lines.reduce((sum, l) => sum + num(l.debit), 0), [lines]);
  const totalCredit = useMemo(() => lines.reduce((sum, l) => sum + num(l.credit), 0), [lines]);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  function addLine() {
    if (!rowType || !rowAccount || num(rowAmount) <= 0) return;
    setLines((prev) => [...prev, {
      account: rowAccount,
      debit: rowType === 'Debit' ? num(rowAmount) : 0,
      credit: rowType === 'Credit' ? num(rowAmount) : 0,
      chequeReceiptNo: '',
      note: '',
    }]);
    setRowType('');
    setRowAccount('');
    setRowAmount('');
  }

  function updateLine(i, key, value) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  }
  function removeLine(i) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleQuickAddSubmit(e) {
    e.preventDefault();
    if (!quickAddForm.chartOfGroup || !quickAddForm.name) return;
    setQuickAddSaving(true);
    try {
      const { data } = await createChartOfAccount(quickAddForm);
      reloadAccounts();
      setRowAccount(data.name);
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
    setError('');
    if (lines.length < 2) {
      setError('Add at least two account lines (one Debit, one Credit)');
      return;
    }
    if (!balanced) {
      setError(`Voucher does not balance: Debit ${totalDebit.toFixed(2)} vs Credit ${totalCredit.toFixed(2)}`);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        voucherNo, date, projectType, project, titleOfWork, site, task,
        lines, comment, attachmentFile,
      };
      if (isEdit) {
        await updateJournalVoucher(id, payload);
      } else {
        await createJournalVoucher(payload);
      }
      navigate('/accounts-module/journal_list');
    } catch (err) {
      console.error('Failed to save journal voucher', err);
      setError(err.response?.data?.message || err.message || 'Failed to save journal voucher');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Journal Voucher' },
          ]}
        />
        <button
          type="button"
          onClick={() => navigate('/accounts-module/journal_list')}
          className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          Back to previous
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-4">
            <Field label="Voucher No">
              <input value={voucherNo} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Project">
              <select value={project} onChange={(e) => setProject(e.target.value)} className="input">
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </Field>
            <Field label="Site">
              <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
                <option value="">Select Site</option>
                {sites.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Project Type">
              <input value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input" placeholder="Select Project Type" />
            </Field>
            <Field label="If Task">
              <input value={task} onChange={(e) => setTask(e.target.value)} className="input" placeholder="Select Task" />
            </Field>
            <Field label="Title/Name of Work">
              <input value={titleOfWork} onChange={(e) => setTitleOfWork(e.target.value)} className="input" placeholder="Select Title/Name of Work" />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <Field label="Select Type">
              <select value={rowType} onChange={(e) => setRowType(e.target.value)} className="input">
                <option value="">Select Type</option>
                {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Select Chart Of Account">
              <div className="flex gap-2">
                <select value={rowAccount} onChange={(e) => setRowAccount(e.target.value)} className="input flex-1">
                  <option value="">Select Chart Of Account</option>
                  {accounts.map((a) => <option key={a._id} value={a.name}>{a.name}</option>)}
                </select>
                <button type="button" onClick={() => setQuickAddOpen(true)} className="px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-bold">+</button>
              </div>
            </Field>
            <Field label="Amount">
              <input type="number" value={rowAmount} onChange={(e) => setRowAmount(e.target.value)} className="input" placeholder="Amount" />
            </Field>
            <button
              type="button"
              onClick={addLine}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 rounded-md"
            >
              Add
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md overflow-hidden mb-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white">
                {['Accounts', 'Debit', 'Credit', 'Chq/Receipt', 'Note', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-gray-400">No accounts added</td></tr>
              ) : (
                lines.map((l, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 text-indigo-600">{l.account}</td>
                    <td className="px-3 py-1.5">{num(l.debit).toFixed(2)}</td>
                    <td className="px-3 py-1.5">{num(l.credit).toFixed(2)}</td>
                    <td className="px-3 py-1.5">
                      <input value={l.chequeReceiptNo} onChange={(e) => updateLine(i, 'chequeReceiptNo', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={l.note} onChange={(e) => updateLine(i, 'note', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1" />
                    </td>
                    <td className="px-3 py-1.5">
                      <button type="button" onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
              {lines.length > 0 && (
                <tr className="border-t border-gray-200 font-medium">
                  <td className="px-3 py-1.5">Total</td>
                  <td className="px-3 py-1.5">{totalDebit.toFixed(2)}</td>
                  <td className="px-3 py-1.5">{totalCredit.toFixed(2)}</td>
                  <td colSpan={3} className={balanced ? 'px-3 py-1.5 text-emerald-600' : 'px-3 py-1.5 text-red-600'}>
                    {balanced ? 'Balanced' : `Out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Comment">
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} className="input" />
            </Field>
            <Field label="Attachment">
              <input type="file" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} className="input" />
            </Field>
          </div>
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-10 py-2.5 rounded-md disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      </form>

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
                {groupOptions.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}