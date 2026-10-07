// client/src/pages/InvestmentDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getInvestmentById, recordInvestorPayment } from '../api/investor';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function InvestmentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentType: 'profit_distribution',
    paymentMethod: 'Bank',
    referenceNo: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      const res = await getInvestmentById(id);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await recordInvestorPayment({
        investmentId: id,
        ...paymentForm,
      });
      setShowPayModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-left">
        <Topbar />
        <div className="p-8 text-center text-slate-500">
          {loading ? 'Loading investment details...' : 'Investment not found.'}
        </div>
      </div>
    );
  }

  const m = data.metrics || {};

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Investments', to: '/investors/dashboard' },
            { label: data.investmentCode },
          ]}
        />

        {/* Top Header */}
        <div className="flex flex-wrap gap-4 justify-between items-center bg-white p-5 rounded-xl border border-slate-200">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              {(data.status || '').replace('_', ' ')}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">
              Investment {data.investmentCode} — {data.investor?.name}
            </h1>
            <p className="text-sm text-slate-500">
              Project: <span className="font-semibold">{data.project?.name || 'General Operations'}</span> | Date: {data.investmentDate}
            </p>
          </div>
          <button
            onClick={() => setShowPayModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition"
          >
            Disburse Payment to Investor
          </button>
        </div>

        {/* FINANCIAL CALCULATION WATERFALL */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Financial Calculation Engine & Profit Flow</h2>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-center">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs uppercase text-slate-500 font-bold">1. Investment</span>
              <p className="text-lg font-bold text-slate-800 mt-1">{formatBDT(m.principal)}</p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-xs uppercase text-blue-600 font-bold">2. Project Revenue</span>
              <p className="text-lg font-bold text-blue-700 mt-1">{formatBDT(m.projectRevenue)}</p>
            </div>

            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
              <span className="text-xs uppercase text-rose-600 font-bold">3. Project Expenses</span>
              <p className="text-lg font-bold text-rose-700 mt-1">{formatBDT(m.projectExpenses)}</p>
            </div>

            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <span className="text-xs uppercase text-indigo-600 font-bold">4. Net Profit</span>
              <p className="text-lg font-bold text-indigo-700 mt-1">{formatBDT(m.projectNetProfit)}</p>
            </div>

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-xs uppercase text-emerald-600 font-bold">5. Investor Share ({m.profitSharePercent}%)</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">{formatBDT(m.profitGenerated)}</p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-xs uppercase text-amber-600 font-bold">6. Realized ROI</span>
              <p className="text-lg font-bold text-amber-700 mt-1">{m.roiPercent}%</p>
            </div>
          </div>
        </div>

        {/* Summary Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Current Investment Value</p>
            <p className="text-2xl font-bold text-slate-800">{formatBDT(m.currentInvestmentValue)}</p>
            <p className="text-xs text-slate-400">Remaining Capital (৳{m.remainingPrincipal?.toLocaleString()}) + Remaining Profit (৳{m.remainingProfit?.toLocaleString()})</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Disbursed to Date</p>
            <p className="text-2xl font-bold text-emerald-600">{formatBDT(m.totalPaid)}</p>
            <p className="text-xs text-slate-400">Principal returned: ৳{m.principalPaid?.toLocaleString()} | Profit paid: ৳{m.profitPaid?.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Expected Final Return</p>
            <p className="text-2xl font-bold text-blue-600">{formatBDT(m.expectedReturn)}</p>
            <p className="text-xs text-slate-400">Target Return on Maturity</p>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800">
            Payment & Disbursement History
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.payments || []).map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-semibold text-slate-800">{p.paymentCode}</td>
                    <td className="p-3">{p.paymentDate}</td>
                    <td className="p-3 capitalize">{(p.paymentType || '').replace('_', ' ')}</td>
                    <td className="p-3">{p.paymentMethod}</td>
                    <td className="p-3 font-bold text-slate-900">{formatBDT(p.amount)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!data.payments || data.payments.length === 0) && (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-400">
                      No payment disbursements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-xl p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Record Payment to Investor</h3>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Amount (৳)</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 50000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Disbursement Type</label>
                <select
                  value={paymentForm.paymentType}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentType: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="profit_distribution">Profit Distribution</option>
                  <option value="principal_return">Principal Capital Return</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Reference / Cheque No.</label>
                <input
                  type="text"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Transaction or Cheque #"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold"
                >
                  Save & Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}