// client/src/pages/InvestmentDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getInvestmentById, getInvestmentMoney } from '../api/investor';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { PaymentModal, PaymentLinesView, formatBDT, fmtDate } from '../components/InvestorMoneyForms';

const TYPE_LABELS = {
  profit_distribution: 'Profit payout',
  principal_return: 'Capital return',
  combined: 'Capital + profit',
};

export default function InvestmentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [money, setMoney] = useState({ receipts: [], payouts: [], receivedTotal: 0, receivedDue: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'payout' | 'receipt' | null

  const loadData = useCallback(async () => {
    try {
      const [inv, mon] = await Promise.all([getInvestmentById(id), getInvestmentMoney(id)]);
      setData(inv.data);
      setMoney(mon.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  const cancelled = data.status === 'cancelled';

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
              {(data.status || '').replace(/_/g, ' ')}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-2">
              Investment {data.investmentCode} — {data.investor?.name}
            </h1>
            <p className="text-sm text-slate-500">
              Project: <span className="font-semibold">{data.project?.name || 'General Operations'}</span> | Date: {data.investmentDate}
            </p>
          </div>
          {!cancelled && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModal('receipt')}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg font-medium shadow-sm transition"
              >
                Record Payment Received
              </button>
              <button
                onClick={() => setModal('payout')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition"
              >
                Pay Investor
              </button>
            </div>
          )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Received from Investor</p>
            <p className="text-2xl font-bold text-teal-600">{formatBDT(money.receivedTotal)}</p>
            <p className="text-xs text-slate-400">
              {money.receivedDue > 0
                ? `Still to receive: ${formatBDT(money.receivedDue)} of ${formatBDT(m.principal)}`
                : 'Full investment amount received'}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Current Investment Value</p>
            <p className="text-2xl font-bold text-slate-800">{formatBDT(m.currentInvestmentValue)}</p>
            <p className="text-xs text-slate-400">Remaining Capital (৳{m.remainingPrincipal?.toLocaleString()}) + Remaining Profit (৳{m.remainingProfit?.toLocaleString()})</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Paid to Investor</p>
            <p className="text-2xl font-bold text-emerald-600">{formatBDT(m.totalPaid)}</p>
            <p className="text-xs text-slate-400">Principal returned: ৳{m.principalPaid?.toLocaleString()} | Profit paid: ৳{m.profitPaid?.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
            <p className="text-xs uppercase font-bold text-slate-500">Expected Final Return</p>
            <p className="text-2xl font-bold text-blue-600">{formatBDT(m.expectedReturn)}</p>
            <p className="text-xs text-slate-400">Target Return on Maturity</p>
          </div>
        </div>

        {/* Payouts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800">Payouts to Investor</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Payment ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Paid by</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {money.payouts.map((p) => (
                  <tr key={p.id} className="align-top">
                    <td className="p-3 font-semibold text-slate-800">{p.paymentCode}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(p.paymentDate)}</td>
                    <td className="p-3">
                      {TYPE_LABELS[p.paymentType] || p.paymentType}
                      {p.paymentType === 'combined' && (
                        <span className="block text-xs text-slate-400">
                          Capital {formatBDT(p.principalPaid)} · Profit {formatBDT(p.profitPaid)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <PaymentLinesView lines={p.lines} fallbackMethod={p.paymentMethod} fallbackRef={p.referenceNo} />
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatBDT(p.amount)}</td>
                  </tr>
                ))}
                {money.payouts.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      No payouts recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receipts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800">Payments Received from Investor</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3">Receipt ID</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Paid by</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {money.receipts.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="p-3 font-semibold text-slate-800">{r.receiptCode}</td>
                    <td className="p-3 whitespace-nowrap">{fmtDate(r.receiptDate)}</td>
                    <td className="p-3">
                      <PaymentLinesView lines={r.lines} fallbackMethod={r.paymentMethod} />
                    </td>
                    <td className="p-3 text-xs text-slate-500">{r.notes || '—'}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatBDT(r.amount)}</td>
                  </tr>
                ))}
                {money.receipts.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400">
                      No payments received from the investor yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal && (
        <PaymentModal
          direction={modal}
          investorId={data.investorId}
          investorName={data.investor?.name}
          investments={[data]}
          investmentId={data.id}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}