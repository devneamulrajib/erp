import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import RichTextEditor from '../components/RichTextEditor';
import SearchableSelect from '../components/SearchableSelect';
import { Plus, Trash2, ArrowLeft, ImagePlus, X, Loader2 } from 'lucide-react';

const EMPTY_PARTY = { selectParty: '', name: '', phone: '', email: '', nid: '', position: '', image: '', address: '', type: '', details: '' };
const EMPTY_PAYMENT = { details: '', amount: '' };
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

export default function AgreementForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [date, setDate] = useState('');
  const [project, setProject] = useState('');
  const [reference, setReference] = useState('');
  const [title, setTitle] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [footer, setFooter] = useState('');
  const [parties, setParties] = useState([{ ...EMPTY_PARTY }]);
  const [payments, setPayments] = useState([{ ...EMPTY_PAYMENT }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/agreements/${id}`).then((res) => {
      const a = res.data;
      setDate(a.date ? a.date.slice(0, 10) : '');
      setProject(a.project || '');
      setReference(a.reference || '');
      setTitle(a.title || '');
      setTermsConditions(a.termsConditions || '');
      setFooter(a.footer || '');
      setParties(a.parties && a.parties.length ? a.parties.map((p) => ({ ...EMPTY_PARTY, ...p })) : [{ ...EMPTY_PARTY }]);
      setPayments(a.payments && a.payments.length ? a.payments.map((p) => ({ ...EMPTY_PAYMENT, ...p })) : [{ ...EMPTY_PAYMENT }]);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load agreement.');
    });
  }, [id, isEdit]);

  function updateParty(index, key, value) {
    setParties((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  }
  function addPartyRow() {
    setParties((prev) => [...prev, { ...EMPTY_PARTY }]);
  }
  function removePartyRow(index) {
    setParties((prev) => prev.filter((_, i) => i !== index));
  }
  function handlePartyImage(index, file) {
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      alert('Image must be smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateParty(index, 'image', reader.result);
    reader.readAsDataURL(file);
  }
  function clearPartyImage(index) {
    updateParty(index, 'image', '');
  }

  function updatePayment(index, key, value) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  }
  function addPaymentRow() {
    setPayments((prev) => [...prev, { ...EMPTY_PAYMENT }]);
  }
  function removePaymentRow(index) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  const paymentsTotal = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      date, project, reference, title, termsConditions, footer,
      parties: parties.filter((p) => Object.values(p).some((v) => v)),
      payments: payments.filter((p) => p.details || p.amount),
    };
    try {
      if (isEdit) {
        await api.put(`/agreements/${id}`, payload);
      } else {
        await api.post('/agreements', payload);
      }
      navigate('/accounts-module/agreement_list');
    } catch (err) {
      console.error(err);
      setError('Failed to save agreement.');
    } finally {
      setSubmitting(false);
    }
  }

  const projectOptions = projects.map((p) => ({ value: p.name, label: p.name }));

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />

      <div className="max-w-6xl mx-auto px-6 pt-6 pb-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/accounts-module/agreement_list' },
                { label: isEdit ? 'Edit Agreement' : 'Create Agreement' },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              {isEdit ? 'Edit Agreement' : 'Create Agreement'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEdit ? 'Update the details of this agreement' : 'Fill in the details to create a new agreement'}
            </p>
          </div>

          <button
            onClick={() => navigate('/accounts-module/agreement_list')}
            className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            Agreement List
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Basic info card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Project</label>
                <SearchableSelect options={projectOptions} value={project} onChange={setProject} placeholder="Select Project" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Reference</label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>

          {/* Content card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Agreement Content</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Write title..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Terms & Conditions</label>
                  <RichTextEditor value={termsConditions} onChange={setTermsConditions} placeholder="Write terms..." />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5">Footer</label>
                  <RichTextEditor value={footer} onChange={setFooter} placeholder="Write footer..." />
                </div>
              </div>
            </div>
          </div>

          {/* Agreement Party cards */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Agreement Party</h2>
              <button
                type="button"
                onClick={addPartyRow}
                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add Party
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {parties.map((p, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Party #{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePartyRow(i)}
                      className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 p-1.5 rounded-lg border border-gray-100 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Select Party</label>
                      <input
                        value={p.selectParty}
                        onChange={(e) => updateParty(i, 'selectParty', e.target.value)}
                        placeholder="e.g. Buyer, Seller, Witness"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input
                        value={p.name}
                        onChange={(e) => updateParty(i, 'name', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <input
                        value={p.type}
                        onChange={(e) => updateParty(i, 'type', e.target.value)}
                        placeholder="e.g. Individual, Company"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Phone</label>
                      <input
                        value={p.phone}
                        onChange={(e) => updateParty(i, 'phone', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email</label>
                      <input
                        value={p.email}
                        onChange={(e) => updateParty(i, 'email', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">NID</label>
                      <input
                        value={p.nid}
                        onChange={(e) => updateParty(i, 'nid', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Position</label>
                      <input
                        value={p.position}
                        onChange={(e) => updateParty(i, 'position', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Address</label>
                      <input
                        value={p.address}
                        onChange={(e) => updateParty(i, 'address', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Details</label>
                      <textarea
                        value={p.details}
                        onChange={(e) => updateParty(i, 'details', e.target.value)}
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Photo</label>
                      {p.image ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={p.image}
                            alt="Preview"
                            className="w-11 h-11 rounded-lg object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => clearPartyImage(i)}
                            className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 p-1.5 rounded-lg border border-gray-100 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-lg px-2.5 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                          <ImagePlus size={14} />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePartyImage(i, e.target.files?.[0])}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment details table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment Details</h2>
              <button
                type="button"
                onClick={addPaymentRow}
                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add Row
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400 text-xs">Details</th>
                  <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400 text-xs w-48">Amount</th>
                  <th className="px-5 py-2.5 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-2">
                      <input
                        value={p.details}
                        onChange={(e) => updatePayment(i, 'details', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>
                    <td className="px-5 py-2">
                      <input
                        value={p.amount}
                        onChange={(e) => updatePayment(i, 'amount', e.target.value)}
                        inputMode="decimal"
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>
                    <td className="px-5 py-2">
                      <button
                        type="button"
                        onClick={() => removePaymentRow(i)}
                        className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 p-1.5 rounded-lg border border-gray-100 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-5 py-2.5 text-sm font-semibold text-gray-700">Total</td>
                  <td className="px-5 py-2.5 text-sm font-bold text-indigo-600">{paymentsTotal.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}