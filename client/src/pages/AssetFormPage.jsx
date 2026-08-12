import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ModuleNav from '../components/ModuleNav';
import {
  getAsset, createAsset, updateAsset,
  addDepreciationEntry, addMovementEntry, addRevaluationEntry,
  getItemOptions, getProjectOptions,
} from '../api/asset';
import { getChartOfAccounts } from '../api/chartOfAccounts';

const TABS = ['Asset', 'Depreciation Board', 'Movement History', 'Revaluations History'];
const METHOD_OPTIONS = ['Straight Line', 'Declining Balance', 'Double Declining Balance'];
const COMPUTATION_OPTIONS = ['Monthly', 'Yearly'];

const EMPTY_FORM = {
  item: '', originalValue: '', acquisitionDate: new Date().toISOString().slice(0, 10), project: '',
  method: '', duration: '', computation: '', notDepreciableValue: '',
  expenseAccount: '', voucherNo: '',
};

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

  const loadAsset = useCallback(async () => {
    if (!isEdit) return;
    try {
      const { data } = await getAsset(id);
      setAsset(data);
      setForm({
        item: data.item?._id || data.item || '',
        originalValue: data.originalValue ?? '',
        acquisitionDate: data.acquisitionDate ? data.acquisitionDate.slice(0, 10) : '',
        project: data.project?._id || data.project || '',
        method: data.method || '',
        duration: data.duration ?? '',
        computation: data.computation || '',
        notDepreciableValue: data.notDepreciableValue ?? '',
        expenseAccount: data.expenseAccount?._id || data.expenseAccount || '',
        voucherNo: data.voucherNo || '',
      });
    } catch (err) {
      console.error('Failed to load asset', err);
    }
  }, [id, isEdit]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  useEffect(() => {
    getItemOptions().then(({ data }) => setItemOptions(data)).catch(console.error);
    getProjectOptions().then(({ data }) => setProjectOptions(data)).catch(console.error);
    getChartOfAccounts().then(({ data }) => setAccountOptions(data)).catch(console.error);
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
        navigate(`/accounts-module/asset_list_add/${data._id}`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

  return (
    <div>
      <ModuleNav />

      <div className="px-6 py-4">
        <div className="text-sm text-gray-500 flex items-center gap-1 mb-4">
          <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
          <span>&gt;</span>
          <Link to="/accounts-module/asset_list" className="text-indigo-600 hover:underline">Asset List</Link>
          <span>&gt;</span>
          <span className="text-gray-700">Assets</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={!isEdit && tab !== 'Asset'}
                className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === tab ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
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
              <DepreciationBoardTab assetId={id} asset={asset} reload={loadAsset} fmtDate={fmtDate} />
            )}
            {activeTab === 'Movement History' && (
              <MovementHistoryTab assetId={id} asset={asset} reload={loadAsset} fmtDate={fmtDate} />
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
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-12 gap-y-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Asset Value</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <select
                value={form.item}
                onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Item</option>
                {itemOptions.map((it) => (
                  <option key={it._id} value={it._id}>{it.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Original Value</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.originalValue}
                onChange={(e) => setForm((f) => ({ ...f, originalValue: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Acquisition Date</label>
              <input
                type="date"
                value={form.acquisitionDate}
                onChange={(e) => setForm((f) => ({ ...f, acquisitionDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a project</option>
                {projectOptions.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <h3 className="font-semibold text-gray-700 mt-8 mb-3">Depreciation Method</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select
                value={form.method}
                onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <select
                  value="Year"
                  disabled
                  className="w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50"
                >
                  <option>Year</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Computation</label>
              <select
                value={form.computation}
                onChange={(e) => setForm((f) => ({ ...f, computation: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select</option>
                {COMPUTATION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Current Values</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm">Not Depreciable Value</label>
              <input
                type="number"
                value={form.notDepreciableValue}
                onChange={(e) => setForm((f) => ({ ...f, notDepreciableValue: e.target.value }))}
                className="w-40 border border-gray-300 rounded-md px-3 py-2 text-sm text-right"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Book Value</label>
              <div className="w-40 border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-right text-gray-500">
                {asset?.bookValue ?? '0.00'}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Depreciable Value</label>
              <div className="w-40 border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-right text-gray-500">
                {asset?.depreciableValue ?? '0.00'}
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-gray-700 mt-8 mb-3">Accounting</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expense Account</label>
              <select
                value={form.expenseAccount}
                onChange={(e) => setForm((f) => ({ ...f, expenseAccount: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select Account</option>
                {accountOptions.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">If Tag Voucher No</label>
              <input
                placeholder="Voucher No (optional)"
                value={form.voucherNo}
                onChange={(e) => setForm((f) => ({ ...f, voucherNo: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          disabled
          className="bg-gray-100 text-gray-400 text-sm font-medium px-6 py-2 rounded-md cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DepreciationBoardTab({ assetId, asset, reload, fmtDate }) {
  const [form, setForm] = useState({ date: '', reference: '', depreciation: '', journalEntry: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.date || !form.depreciation) return;
    setSaving(true);
    try {
      await addDepreciationEntry(assetId, form);
      setForm({ date: '', reference: '', depreciation: '', journalEntry: '' });
      await reload();
    } catch (err) {
      console.error('Failed to add depreciation entry', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="grid grid-cols-5 gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Reference</label>
          <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Depreciation</label>
          <input type="number" value={form.depreciation} onChange={(e) => setForm((f) => ({ ...f, depreciation: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Journal Entry</label>
          <input value={form.journalEntry} onChange={(e) => setForm((f) => ({ ...f, journalEntry: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50">
          + Add
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-indigo-500 text-white text-left text-sm">
            <th className="px-3 py-2 font-medium">DEPRECIATION DATE</th>
            <th className="px-3 py-2 font-medium">REFERENCE</th>
            <th className="px-3 py-2 font-medium">DEPRECIATION</th>
            <th className="px-3 py-2 font-medium">COMULATIVE DEPRECIATION</th>
            <th className="px-3 py-2 font-medium">DEPRECIABLE VALUE</th>
            <th className="px-3 py-2 font-medium">JOURNAL ENTRY</th>
          </tr>
        </thead>
        <tbody>
          {(!asset?.depreciationEntries || asset.depreciationEntries.length === 0) ? (
            <tr><td colSpan={6} className="text-center py-6 text-gray-400">No entries found</td></tr>
          ) : asset.depreciationEntries.map((e) => (
            <tr key={e._id} className="border-b border-gray-100 text-sm">
              <td className="px-3 py-2">{fmtDate(e.date)}</td>
              <td className="px-3 py-2">{e.reference}</td>
              <td className="px-3 py-2">{e.depreciation}</td>
              <td className="px-3 py-2">{e.cumulativeDepreciation}</td>
              <td className="px-3 py-2">{e.depreciableValue}</td>
              <td className="px-3 py-2">{e.journalEntry}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementHistoryTab({ assetId, asset, reload, fmtDate }) {
  const [form, setForm] = useState({ date: '', from: '', to: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.date || !form.to) return;
    setSaving(true);
    try {
      await addMovementEntry(assetId, form);
      setForm({ date: '', from: '', to: '' });
      await reload();
    } catch (err) {
      console.error('Failed to add movement entry', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">From</label>
          <input value={form.from} onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">To</label>
          <input value={form.to} onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50">
          + Add
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-indigo-500 text-white text-left text-sm">
            <th className="px-3 py-2 font-medium">SL.</th>
            <th className="px-3 py-2 font-medium">DATE</th>
            <th className="px-3 py-2 font-medium">FROM</th>
            <th className="px-3 py-2 font-medium">TO</th>
          </tr>
        </thead>
        <tbody>
          {(!asset?.movementEntries || asset.movementEntries.length === 0) ? (
            <tr><td colSpan={4} className="text-center py-6 text-gray-400">No entries found</td></tr>
          ) : asset.movementEntries.map((e, i) => (
            <tr key={e._id} className="border-b border-gray-100 text-sm">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{fmtDate(e.date)}</td>
              <td className="px-3 py-2">{e.from}</td>
              <td className="px-3 py-2">{e.to}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RevaluationsHistoryTab({ assetId, asset, reload, fmtDate }) {
  const [form, setForm] = useState({ date: '', newValue: '', note: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.date || !form.newValue) return;
    setSaving(true);
    try {
      await addRevaluationEntry(assetId, form);
      setForm({ date: '', newValue: '', note: '' });
      await reload();
    } catch (err) {
      console.error('Failed to add revaluation entry', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="grid grid-cols-4 gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium mb-1">Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">New Value</label>
          <input type="number" value={form.newValue} onChange={(e) => setForm((f) => ({ ...f, newValue: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Note</label>
          <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50">
          + Add
        </button>
      </form>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-indigo-500 text-white text-left text-sm">
            <th className="px-3 py-2 font-medium">SL.</th>
            <th className="px-3 py-2 font-medium">DATE.</th>
            <th className="px-3 py-2 font-medium">OLD VALUE</th>
            <th className="px-3 py-2 font-medium">NEW VALUE</th>
            <th className="px-3 py-2 font-medium">CHANGE</th>
            <th className="px-3 py-2 font-medium">NOTE</th>
          </tr>
        </thead>
        <tbody>
          {(!asset?.revaluationEntries || asset.revaluationEntries.length === 0) ? (
            <tr><td colSpan={6} className="text-center py-6 text-gray-400">No entries found</td></tr>
          ) : asset.revaluationEntries.map((e, i) => (
            <tr key={e._id} className="border-b border-gray-100 text-sm">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{fmtDate(e.date)}</td>
              <td className="px-3 py-2">{e.oldValue}</td>
              <td className="px-3 py-2">{e.newValue}</td>
              <td className="px-3 py-2">{e.change}</td>
              <td className="px-3 py-2">{e.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}