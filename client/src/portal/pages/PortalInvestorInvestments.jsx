import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvestorInvestments } from '../api/portalInvestor';
import StatusChip from '../investor/components/StatusChip';
import AmountText from '../investor/components/AmountText';
import ProgressBar from '../investor/components/ProgressBar';
import EmptyState from '../investor/components/EmptyState';
import ReturnTypeBadge, { rateLabel } from '../investor/components/ReturnTypeBadge';
import { CardSkeleton } from '../investor/components/SkeletonLoader';

const FILTERS = [
  ['all', 'All'],
  ['active', 'Active'],
  ['matured', 'Matured'],
  ['fully_returned', 'Returned'],
];

const PortalInvestorInvestments = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const res = await getInvestorInvestments({ status: filterStatus });
      setInvestments(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, [filterStatus]);

  const filtered = investments.filter(
    (inv) =>
      inv.projectName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.agreementRef?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[#0B1530] font-wealth-display">Your Investments</h1>
          <p className="text-xs text-slate-500">Agreements, return terms and maturity lifecycles</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/portal/investor/history"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Investment history
          </Link>
          <Link
            to="/portal/investor/compare"
            className="rounded-xl bg-[#3347B8] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#263691]"
          >
            Compare returns
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                filterStatus === key
                  ? 'bg-[#3347B8] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by project or reference..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600"
        />
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No investments found"
          description="There are currently no investment agreements matching the selected filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((inv) => (
            <Link
              key={inv.id}
              to={`/portal/investor/investments/${inv.id}`}
              className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#0B1530] font-wealth-display group-hover:text-indigo-600 transition-colors">
                      {inv.projectName}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">{inv.agreementRef}</span>
                  </div>
                  <StatusChip status={inv.status} />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ReturnTypeBadge type={inv.investmentType} />
                  <span className="text-[11px] font-medium text-slate-500">{rateLabel(inv)}</span>
                </div>

                <div className="my-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Principal Invested</span>
                  <AmountText amount={inv.amount} className="text-xl font-bold text-[#0B1530] font-wealth-display" />
                </div>

                <div className="my-3">
                  <ProgressBar startDate={inv.investmentDate} maturityDate={inv.maturityDate} />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Paid</span>
                    <AmountText amount={inv.paidAmount} className="text-sm font-semibold text-slate-800" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Due</span>
                    <AmountText
                      amount={inv.dueAmount}
                      className={`text-sm font-semibold ${inv.dueAmount > 0 ? 'text-rose-600' : 'text-slate-800'}`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  {inv.maturityDate
                    ? `Matures ${new Date(inv.maturityDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    : 'No maturity date'}
                </span>
                <span className="font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  View Details →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalInvestorInvestments;