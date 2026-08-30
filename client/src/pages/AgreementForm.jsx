import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import RichTextEditor from '../components/RichTextEditor';
import SearchableSelect from '../components/SearchableSelect';
import { Plus, X, ArrowLeft } from 'lucide-react';

const EMPTY_PARTY = { selectParty: '', name: '', phone: '', email: '', nid: '', position: '', image: '', address: '', type: '', details: '' };
const EMPTY_PAYMENT = { details: '', amount: '' };

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
      setDate(a.date || '');
      setProject(a.project || '');
      setReference(a.reference || '');
      setTitle(a.title || '');
      setTermsConditions(a.termsConditions || '');
      setFooter(a.footer || '');
      setParties(a.parties && a.parties.length ? a.parties : [{ ...EMPTY_PARTY }]);
      setPayments(a.payments && a.payments.length ? a.payments : [{ ...EMPTY_PAYMENT }]);
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

  function updatePayment(index, key, value) {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  }
  function addPaymentRow() {
    setPayments((prev) => [...prev, { ...EMPTY_PAYMENT }]);
  }
  function removePaymentRow(index) {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

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

      <div className="px-6 pt-6 pb-10">
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
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Title</label>
                <RichTextEditor value={title} onChange={setTitle} placeholder="Write title..." />
              </div>
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

          {/* Agreement Party table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Agreement Party</h2>
              <button
                type="button"
                onClick={addPartyRow}
                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Select Party', 'Name', 'Phone', 'Email', 'NID', 'Position', 'Image', 'Address', 'Type', 'Details', ''].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parties.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      {['selectParty', 'name', 'phone', 'email', 'nid', 'position', 'address', 'type', 'details'].map((key) => (
                        <td key={key} className="px-3 py-2">
                          <input
                            value={p[key]}
                            onChange={(e) => updateParty(i, key, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <input
                          type="file"
                          onChange={(e) => updateParty(i, 'image', e.target.files?.[0]?.name || '')}
                          className="text-xs w-28"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removePartyRow(i)}
                          className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 p-1.5 rounded-lg border border-gray-100 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400">Details</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-3 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400">Action</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2">
                      <input
                        value={p.details}
                        onChange={(e) => updatePayment(i, 'details', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={p.amount}
                        onChange={(e) => updatePayment(i, 'amount', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removePaymentRow(i)}
                        className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 p-1.5 rounded-lg border border-gray-100 transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}