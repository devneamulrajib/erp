import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAsset, createAsset, updateAsset,
  addDepreciationEntry, addMovementEntry, addRevaluationEntry,
  getItemOptions, getProjectOptions, getSiteOptions,
} from '../api/asset';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getJournalVouchers } from '../api/journalVoucher';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Plus } from 'lucide-react';

const TABS = ['Asset', 'Depreciation Board', 'Movement History', 'Revaluations History'];
const METHOD_OPTIONS = ['Straight Line', 'Declining Balance', 'Double Declining Balance'];
const COMPUTATION_OPTIONS = ['Monthly', 'Yearly'];

const EMPTY_FORM = {
  item: '', originalValue: '', acquisitionDate: new Date().toISOString().slice(0, 10), project: '',
  method: '', duration: '', computation: '', notDepreciableValue: '',
  expenseAccount: '', voucherNo: '',
};

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

function computeSuggestedDepreciation(asset) {
  if (!asset) return '';
  const original = Number(asset.originalValue) || 0;
  const notDepreciable = Number(asset.notDepreciableValue) || 0;
  const duration = Number(asset.duration) || 0;
  if (!duration) return '';

  const periodsPerYear = asset.computation === 'Monthly' ? 12 : 1;
  const totalPeriods = duration * periodsPerYear;
  if (!totalPeriods) return '';

  if (asset.method === 'Declining Balance' || asset.method === 'Double Declining Balance') {
    const rateMultiplier = asset.method === 'Double Declining Balance' ? 2 : 1;
    const periodRate = (rateMultiplier / duration) / periodsPerYear;
    const currentBookValue = Number(asset.bookValue ?? original);
    const amount = currentBookValue * periodRate;
    return amount > 0 ? Math.round(amount * 100) / 100 : 0;
  }

  // Straight Line (default)
  const depreciableBase = original - notDepreciable;
  const amount = depreciableBase / totalPeriods;
  return amount > 0 ? Math.round(amount * 100) / 100 : 0;
}

const REVALUATION_TYPE_OPTIONS = ['Appraisal', 'Insurance Valuation', 'Market Adjustment', 'Other'];
const REVALUATION_REASON_OPTIONS = ['Market Reappraisal', 'Damage', 'Upgrade', 'Depreciation Correction', 'Insurance Claim', 'Other'];

const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition";
const readOnlyClass = "w-40 border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 text-sm text-right text-slate-500";
const labelClass = "block text-xs font-medium text-slate-500 mb-1.5";
const sectionTitleClass = "font-semibold text-slate-800 mb-3";

export default function AssetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [activeTab, setActiveTab] = useState('Asset');
  const [asset, setAsset] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [itemOptions, setItemOptions] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [journalVoucherOptions, setJournalVoucherOptions] = useState([]);

  const loadAsset = useCallback(async () => {
    if (!isEdit) return;
    try {
      const { data } = await getAsset(id);
      setAsset(data);
      setForm({
        item: data.item?.id || data.item || '',
        originalValue: data.originalValue ?? '',
        acquisitionDate: data.acquisitionDate ? data.acquisitionDate.slice(0, 10) : '',
        project: data.project?.id || data.project || '',
        method: data.method || '',
        duration: data.duration ?? '',
        computation: data.computation || '',
        notDepreciableValue: data.notDepreciableValue ?? '',
        expenseAccount: data.expenseAccount?.id || data.expenseAccount || '',
        voucherNo: data.voucherNo || '',
      });
    } catch (err) {
      console.error('Failed to load asset', err);
    }
  }, [id, isEdit]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  useEffect(() => {
    getItemOptions().then((res) => setItemOptions(asArray(res))).catch((err) => console.error('Failed to load items', err));
    getProjectOptions().then((res) => setProjectOptions(asArray(res))).catch((err) => console.error('Failed to load projects', err));
    getChartOfAccounts().then((res) => setAccountOptions(asArray(res))).catch((err) => console.error('Failed to load accounts', err));
    getSiteOptions().then((res) => setSiteOptions(asArray(res))).catch((err) => console.error('Failed to load sites', err));
    getJournalVouchers().then((res) => setJournalVoucherOptions(asArray(res))).catch((err) => console.error('Failed to load journal vouchers', err));
  }, []);

  async function handleSave() {
    if (!form.originalValue || !form.acquisitionDate) {
      setError('Original Value and Acquisition Date are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        const { data } = await updateAsset(id, form);
        setAsset(data);
      } else {
        const { data } = await createAsset(form);
        navigate(`/accounts-module/asset_list_add/${data.id}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Asset List', to: '/accounts-module/asset_list' },
              { label: 'Assets' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
            {isEdit ? 'Edit Asset' : 'New Asset'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage asset value, depreciation, and history</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 px-2">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={!isEdit && tab !== 'Asset'}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 -mb-px disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'Asset' && (
              <AssetTab
                form={form}
                setForm={setForm}
                error={error}
                saving={saving}
                onSave={handleSave}
                itemOptions={itemOptions}
                projectOptions={projectOptions}
                accountOptions={accountOptions}
                asset={asset}
              />
            )}
            {activeTab === 'Depreciation Board' && (
              <DepreciationBoardTab
                assetId={id}
                asset={asset}
                reload={loadAsset}
                fmtDate={fmtDate}
                journalVoucherOptions={journalVoucherOptions}
              />
            )}
            {activeTab === 'Movement History' && (
              <MovementHistoryTab assetId={id} asset={asset} reload={loadAsset} fmtDate={fmtDate} siteOptions={siteOptions} />
            )}
            {activeTab === 'Revaluations History' && (
              <RevaluationsHistoryTab assetId={id} asset={asset} reload={loadAsset} fmtDate={fmtDate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetTab({
  form, setForm, error, saving, onSave, itemOptions, projectOptions, accountOptions, asset,
}) {
  return (
    <div>
      {error && (
        <div className="mb-5 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <h3 className={sectionTitleClass}>Asset Value</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Item Name</label>
              <select
                value={form.item}
                onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select Item</option>
                {itemOptions.map((it) => (
                  <option key={it.id} value={it.id}>{it.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Original Value</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.originalValue}
                onChange={(e) => setForm((f) => ({ ...f, originalValue: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Acquisition Date</label>
              <input
                type="date"
                value={form.acquisitionDate}
                onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Project</label>
              <select
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select a project</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 className={`${sectionTitleClass} mt-8`}>Depreciation Method</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Method</label>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select</option>
                {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  className={`${inputClass} w-1/2`}
                />
                <select
                  value="Year"
                  disabled
                  className={`${inputClass} w-1/2 bg-slate-50 text-slate-500`}
                >
                  <option>Year</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Computation</label>
              <select
                value={form.computation}
                onChange={(e) => setForm((f) => ({ ...f, computation: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select</option>
                {COMPUTATION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className={sectionTitleClass}>Current Values</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Not Depreciable Value</label>
              <input
                type="number"
                value={form.notDepreciableValue}
                onChange={(e) => setForm((f) => ({ ...f, notDepreciableValue: e.target.value }))}
                className="w-40 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-right bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Book Value</label>
              <div className={readOnlyClass}>{asset?.bookValue ?? '0.00'}</div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Depreciable Value</label>
              <div className={readOnlyClass}>{asset?.depreciableValue ?? '0.00'}</div>
            </div>
          </div>

          <h3 className={`${sectionTitleClass} mt-8`}>Accounting</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Expense Account</label>
              <select
                value={form.expenseAccount}
                onChange={(e) => setForm((f) => ({ ...f, expenseAccount: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select Account</option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>If Tag Voucher No</label>
              <input
                placeholder="Voucher No (optional)"
                value={form.voucherNo}
                onChange={(e) => setForm((f) => ({ ...f, voucherNo: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-8 pt-6 border-t border-slate-100">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-6 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          disabled
          className="bg-slate-100 text-slate-400 text-sm font-medium px-6 py-2.5 rounded-lg cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DepreciationBoardTab({ assetId, asset, reload, fmtDate, journalVoucherOptions }) {
  const [form, setForm] = useState({ date: '', reference: '', depreciation: '', journalEntry: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const suggested = useMemo(() => computeSuggestedDepreciation(asset), [asset]);

  useEffect(() => {
    if (!asset) return;
    setForm((f) => (f.depreciation === '' ? { ...f, depreciation: suggested } : f));
  }, [asset, suggested]);

  async function handleAdd(e) {
    e.preventDefault();
    setFormError('');
    if (!form.date || !form.depreciation) {
      setFormError('Date and Depreciation are required');
      return;
    }
    setSaving(true);
    try {
      await addDepreciationEntry(assetId, form);
      setForm({ date: '', reference: '', depreciation: '', journalEntry: '' });
      await reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add entry');
      console.error('Failed to add depreciation entry', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {formError && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>}
      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5 items-end">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Reference</label>
          <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>
            Depreciation
            {suggested !== '' && <span className="text-slate-400 font-normal ml-1">(suggested: {suggested})</span>}
          </label>
          <input type="number" value={form.depreciation} onChange={(e) => setForm((f) => ({ ...f, depreciation: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Journal Entry</label>
          <select value={form.journalEntry} onChange={(e) => setForm((f) => ({ ...f, journalEntry: e.target.value }))} className={inputClass}>
            <option value="">Select voucher</option>
            {journalVoucherOptions.map((v) => (
              <option key={v.id} value={v.code || v.voucherNo || v.id}>{v.code || v.voucherNo || v.id}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors">
          <Plus size={14} strokeWidth={2.5} /> Add
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Depreciation Date</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Reference</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Depreciation</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Cumulative Depreciation</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Depreciable Value</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Journal Entry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!asset?.depreciationEntries || asset.depreciationEntries.length === 0) ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No entries found</td></tr>
            ) : asset.depreciationEntries.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 text-slate-600">{fmtDate(e.date)}</td>
                <td className="px-4 py-3 text-slate-600">{e.reference}</td>
                <td className="px-4 py-3 text-slate-600">{e.depreciation}</td>
                <td className="px-4 py-3 text-slate-600">{e.cumulativeDepreciation}</td>
                <td className="px-4 py-3 text-slate-600">{e.depreciableValue}</td>
                <td className="px-4 py-3 text-slate-600">{e.journalEntry}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MovementHistoryTab({ assetId, asset, reload, fmtDate, siteOptions }) {
  const [form, setForm] = useState({ date: '', from: '', to: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    setFormError('');
    if (!form.date || !form.to) {
      setFormError('Date and To are required');
      return;
    }
    setSaving(true);
    try {
      await addMovementEntry(assetId, form);
      setForm({ date: '', from: '', to: '' });
      await reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add entry');
      console.error('Failed to add movement entry', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {formError && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>}
      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 items-end">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>From</label>
          <select value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} className={inputClass}>
            <option value="">Select site</option>
            {siteOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>To</label>
          <select value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} className={inputClass}>
            <option value="">Select site</option>
            {siteOptions.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors">
          <Plus size={14} strokeWidth={2.5} /> Add
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">From</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!asset?.movementEntries || asset.movementEntries.length === 0) ? (
              <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">No entries found</td></tr>
            ) : asset.movementEntries.map((e, i) => (
              <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 text-slate-600">{fmtDate(e.date)}</td>
                <td className="px-4 py-3 text-slate-600">{e.from}</td>
                <td className="px-4 py-3 text-slate-600">{e.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RevaluationsHistoryTab({ assetId, asset, reload, fmtDate }) {
  const [form, setForm] = useState({ date: '', newValue: '', revaluationType: '', noteReason: '', customNote: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function handleAdd(e) {
    e.preventDefault();
    setFormError('');
    if (!form.date || !form.newValue) {
      setFormError('Date and New Value are required');
      return;
    }
    setSaving(true);
    try {
      const note = form.noteReason === 'Other' ? form.customNote : form.noteReason;
      await addRevaluationEntry(assetId, {
        date: form.date,
        newValue: form.newValue,
        revaluationType: form.revaluationType,
        note,
      });
      setForm({ date: '', newValue: '', revaluationType: '', noteReason: '', customNote: '' });
      await reload();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add entry');
      console.error('Failed to add revaluation entry', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {formError && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</div>}
      <form onSubmit={handleAdd} className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-5 items-end">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>New Value</label>
          <input type="number" value={form.newValue} onChange={(e) => setForm((f) => ({ ...f, newValue: e.target.value }))} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select value={form.revaluationType} onChange={(e) => setForm((f) => ({ ...f, revaluationType: e.target.value }))} className={inputClass}>
            <option value="">Select type</option>
            {REVALUATION_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Note</label>
          <select value={form.noteReason} onChange={(e) => setForm((f) => ({ ...f, noteReason: e.target.value }))} className={inputClass}>
            <option value="">Select reason</option>
            {REVALUATION_REASON_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {form.noteReason === 'Other' && (
          <div>
            <label className={labelClass}>Custom Note</label>
            <input value={form.customNote} onChange={(e) => setForm((f) => ({ ...f, customNote: e.target.value }))} className={inputClass} placeholder="Describe reason" />
          </div>
        )}
        <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors">
          <Plus size={14} strokeWidth={2.5} /> Add
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Old Value</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">New Value</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Change</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wide">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!asset?.revaluationEntries || asset.revaluationEntries.length === 0) ? (
              <tr><td colSpan={7} className="text-center py-10 text-slate-400 text-sm">No entries found</td></tr>
            ) : asset.revaluationEntries.map((e, i) => (
              <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                <td className="px-4 py-3 text-slate-600">{fmtDate(e.date)}</td>
                <td className="px-4 py-3 text-slate-600">{e.oldValue}</td>
                <td className="px-4 py-3 text-slate-600">{e.newValue}</td>
                <td className="px-4 py-3 text-slate-600">{e.change}</td>
                <td className="px-4 py-3 text-slate-600">{e.revaluationType}</td>
                <td className="px-4 py-3 text-slate-600">{e.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}