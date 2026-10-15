import React, { useEffect, useState } from 'react';
import { getInvestorPayments } from '../api/portalInvestor';
import AmountText from '../investor/components/AmountText';
import EmptyState from '../investor/components/EmptyState';
import { CardSkeleton } from '../investor/components/SkeletonLoader';

const PortalInvestorPayments = () => {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await getInvestorPayments();
        setPayments(res.data.payments || []);
        setTotal(res.data.totalAmount || 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0B1530] font-wealth-display">Payout History</h1>
          <p className="text-xs text-slate-500">Disbursed profits and returned capital</p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Statement
        </button>
      </div>

      {/* Statement Header Card */}
      <div id="printable-statement" className="rounded-2xl border border-[#E3E8F2] bg-white p-6 shadow-xs">
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-[#0B1530] font-wealth-display">TRIKON CAPITAL STATEMENT</h2>
            <p className="text-[11px] text-slate-400">Total Payout Disbursements Realized</p>
          </div>
          <AmountText amount={total} className="text-2xl font-bold text-emerald-600 font-wealth-display" />
        </div>

        {loading ? (
          <CardSkeleton count={3} />
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payouts recorded yet"
            description="When profit distributions or capital returns are credited, they will be itemized here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase text-slate-400">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Project / Reference</th>
                  <th className="py-2.5">Disbursement Type</th>
                  <th className="py-2.5">Channel</th>
                  <th className="py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-800 block">{p.projectName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.referenceNo}</span>
                    </td>
                    <td className="py-3 capitalize text-slate-600">
                      {p.paymentType.replace('_', ' ')}
                    </td>
                    <td className="py-3 capitalize text-slate-500">
                      {p.paymentMethod}
                    </td>
                    <td className="py-3 text-right">
                      <AmountText amount={p.amount} className="font-bold text-slate-900" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalInvestorPayments;