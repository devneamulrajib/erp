// client/src/pages/InvestorListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getInvestors, createInvestor, updateInvestor, deleteInvestor } from '../api/investor';

const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function InvestorListPage() {
  const navigate = useNavigate();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    nidPassport: '',
    startDate: new Date().toISOString().slice(0, 10),
    investmentType: 'project_based',
    profitSharePercent: '',
    fixedReturnPercent: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getInvestors();
      setInvestors(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingInvestor(null);
    setForm({
      name: '',
      phone: '',
      email: '',
      address: '',
      nidPassport: '',
      startDate: new Date().toISOString().slice(0, 10),
      investmentType: 'project_based',
      profitSharePercent: '',
      fixedReturnPercent: '',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (inv) => {
    setEditingInvestor(inv);
    setForm({
      name: inv.name,
      phone: inv.phone,
      email: inv.email || '',
      address: inv.address || '',
      nidPassport: inv.nidPassport || '',
      startDate: inv.startDate,
      investmentType: inv.investmentType || 'project_based',
      profitSharePercent: inv.profitSharePercent || '',
      fixedReturnPercent: inv.fixedReturnPercent || '',
      notes: inv.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInvestor) {
        await updateInvestor(editingInvestor.id, form);
      } else {
        await createInvestor(form);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const handleToggleStatus = async (inv) => {
    try {
      const newStatus = inv.status === 'active' ? 'inactive' : 'active';
      await updateInvestor(inv.id, { status: newStatus });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this investor?')) return;
    try {
      await deleteInvestor(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const filtered = investors.filter((i) =>
    (i.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.phone || '').includes(search) ||
    (i.investorCode || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Topbar renders the header and the single floating navigation menu */}
      <Topbar />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Investor Management', path: '/investors/dashboard' },
            { label: 'Investor Directory' },
          ]}
        />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Investor Directory</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage registered investors, contact information, and investment terms
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition"
          >
            + Register Investor
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <input
            type="text"
            placeholder="Search by name, phone, or investor ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
          />
          <span className="text-sm text-slate-500 font-medium">{filtered.length} Investors</span>
        </div>

        {/* Investors Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">ID</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Phone / Email</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Total Invested</th>
                <th className="p-3.5">Investments</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-bold text-slate-900">{inv.investorCode}</td>
                  <td className="p-3.5 font-semibold text-slate-800">{inv.name}</td>
                  <td className="p-3.5">
                    <div>{inv.phone}</div>
                    <div className="text-xs text-slate-400">{inv.email || '-'}</div>
                  </td>
                  <td className="p-3.5 capitalize text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {(inv.investmentType || 'project_based').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-emerald-700">
                    {formatBDT(inv.totalInvestedAmount)}
                  </td>
                  <td className="p-3.5 font-medium">{inv.investmentsCount || 0}</td>
                  <td className="p-3.5">
                    <button
                      onClick={() => handleToggleStatus(inv)}
                      className={`px-2.5 py-0.5 text-xs font-semibold rounded cursor-pointer ${
                        inv.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {inv.status}
                    </button>
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => navigate(`/investors/dashboard?investorId=${inv.id}`)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Portfolio
                    </button>
                    <button
                      onClick={() => openEditModal(inv)}
                      className="text-xs text-slate-700 hover:underline font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="text-xs text-rose-600 hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-400">
                    {loading ? 'Loading...' : 'No investors found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Investor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {editingInvestor ? 'Edit Investor Details' : 'Register New Investor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NID / Passport</label>
                  <input
                    type="text"
                    value={form.nidPassport}
                    onChange={(e) => setForm({ ...form, nidPassport: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <textarea
                  rows="2"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={form.investmentType}
                    onChange={(e) => setForm({ ...form, investmentType: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="project_based">Project Based</option>
                    <option value="fixed_return">Fixed Return</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Profit %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.profitSharePercent}
                    onChange={(e) => setForm({ ...form, profitSharePercent: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
                >
                  {editingInvestor ? 'Update Investor' : 'Register Investor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}