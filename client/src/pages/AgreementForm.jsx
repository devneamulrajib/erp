import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import RichTextEditor from '../components/RichTextEditor';
import SearchableSelect from '../components/SearchableSelect';
import { Plus, X } from 'lucide-react';

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
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/accounts-module/agreement_list' },
            { label: 'Agreement' },
          ]}
        />
        <button
          onClick={() => navigate('/accounts-module/agreement_list')}
          className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          « Agreement List
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <SearchableSelect options={projectOptions} value={project} onChange={setProject} placeholder="Select Project" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Reference</label>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Reference name"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Title</label>
            <RichTextEditor value={title} onChange={setTitle} placeholder="Write title..." />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Terms & Conditions</label>
            <RichTextEditor value={termsConditions} onChange={setTermsConditions} placeholder="Write terms..." />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Footer</label>
            <RichTextEditor value={footer} onChange={setFooter} placeholder="Write footer..." />
          </div>
        </div>

        {/* Agreement Party table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="bg-cyan-500 text-white text-sm font-semibold px-3 py-2 flex items-center justify-between">
            Agreement Party
            <button type="button" onClick={addPartyRow} className="bg-white/20 hover:bg-white/30 rounded p-1">
              <Plus size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-indigo-500 text-white whitespace-nowrap">
                  {['Select Party', 'Name', 'Phone', 'Email', 'NID', 'Position', 'Image', 'Address', 'Type', 'Details', ''].map((h) => (
                    <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parties.map((p, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {['selectParty', 'name', 'phone', 'email', 'nid', 'position', 'address', 'type', 'details'].map((key) => (
                      <td key={key} className="px-2 py-1.5">
                        <input
                          value={p[key]}
                          onChange={(e) => updateParty(i, key, e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5">
                      <input
                        type="file"
                        onChange={(e) => updateParty(i, 'image', e.target.files?.[0]?.name || '')}
                        className="text-xs w-28"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <button type="button" onClick={() => removePartyRow(i)} className="text-red-500 hover:text-red-700">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment details table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
          <div className="bg-cyan-500 text-white text-sm font-semibold px-3 py-2 flex items-center justify-between">
            Payment Details
            <button type="button" onClick={addPaymentRow} className="bg-white/20 hover:bg-white/30 rounded p-1">
              <Plus size={14} />
            </button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-indigo-500 text-white">
                <th className="px-2 py-2 text-left font-medium">Details</th>
                <th className="px-2 py-2 text-left font-medium">Amount</th>
                <th className="px-2 py-2 text-left font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-2 py-1.5">
                    <input
                      value={p.details}
                      onChange={(e) => updatePayment(i, 'details', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      value={p.amount}
                      onChange={(e) => updatePayment(i, 'amount', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button type="button" onClick={() => removePaymentRow(i)} className="text-red-500 hover:text-red-700">
                      <X size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}