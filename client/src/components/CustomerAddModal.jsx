import { useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { createCustomer, getNextCustomerCode } from '../api/customer';

const EMPTY_NOMINEE = { name: '', nid: '', relation: '', percentage: '' };

const EMPTY_FORM = {
  code: '', name: '', mobile: '', email: '', nid: '', address: '',
  buyerReference: '', creditLimit: '', dueDate: '', openingBalance: '',
  chartOfGroup: '', createUser: false,
};

export default function CustomerAddModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [nominees, setNominees] = useState([{ ...EMPTY_NOMINEE }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setNominees([{ ...EMPTY_NOMINEE }]);
    setError('');
    getNextCustomerCode()
      .then((code) => setForm((f) => ({ ...f, code })))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function updateNominee(index, key, value) {
    setNominees((prev) => prev.map((n, i) => (i === index ? { ...n, [key]: value } : n)));
  }
  function addNomineeRow() {
    setNominees((prev) => [...prev, { ...EMPTY_NOMINEE }]);
  }
  function removeNomineeRow(index) {
    setNominees((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    // NID is now optional — only Name, Mobile, and Chart Of Groups are required
    if (!form.name || !form.mobile || !form.chartOfGroup) {
      setError('Name, Mobile and Chart Of Groups are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        nominees: nominees.filter((n) => n.name),
      };
      const customer = await createCustomer(payload);
      onCreated?.(customer);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Customer Add</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          {error && (
            <div className="col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Field label="Code" required>
            <input value={form.code} onChange={(e) => updateField('code', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Name" required>
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>

          <Field label="Mobile" required>
            <input value={form.mobile} onChange={(e) => updateField('mobile', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="E-mail">
            <input value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>

          <Field label="NID">
            <input value={form.nid} onChange={(e) => updateField('nid', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Address">
            <input value={form.address} onChange={(e) => updateField('address', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>

          <Field label="Buyer Reference">
            <input value={form.buyerReference} onChange={(e) => updateField('buyerReference', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Credit Limit">
            <input type="number" value={form.creditLimit} onChange={(e) => updateField('creditLimit', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>

          <Field label="Due Date">
            <input type="date" value={form.dueDate} onChange={(e) => updateField('dueDate', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>
          <Field label="Opening Balance">
            <input type="number" value={form.openingBalance} onChange={(e) => updateField('openingBalance', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>

          <Field label="Chart Of Groups" required>
            <input value={form.chartOfGroup} onChange={(e) => updateField('chartOfGroup', e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </Field>

          <div className="flex items-center gap-2 mt-6">
            <input
              id="create-user"
              type="checkbox"
              checked={form.createUser}
              onChange={(e) => updateField('createUser', e.target.checked)}
            />
            <label htmlFor="create-user" className="text-sm text-gray-700">Create User</label>
          </div>

          <div className="col-span-2 mt-2">
            <div className="bg-indigo-500 text-white text-sm font-semibold px-3 py-2 rounded-t-md flex items-center justify-between">
              Nominee Details
              <button type="button" onClick={addNomineeRow} className="bg-white/20 hover:bg-white/30 rounded p-1">
                <Plus size={14} />
              </button>
            </div>
            <div className="border border-t-0 border-gray-200 rounded-b-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600">
                    <th className="px-2 py-2 text-left font-medium">Nominee Name</th>
                    <th className="px-2 py-2 text-left font-medium">Nominee NID</th>
                    <th className="px-2 py-2 text-left font-medium">Relation</th>
                    <th className="px-2 py-2 text-left font-medium">Percentage</th>
                    <th className="px-2 py-2 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {nominees.map((n, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">
                        <input value={n.name} onChange={(e) => updateNominee(i, 'name', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={n.nid} onChange={(e) => updateNominee(i, 'nid', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={n.relation} onChange={(e) => updateNominee(i, 'relation', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={n.percentage} onChange={(e) => updateNominee(i, 'percentage', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                      </td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => removeNomineeRow(i)} className="text-red-500 hover:text-red-700">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm rounded-md bg-indigo-500 hover:bg-indigo-600 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
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