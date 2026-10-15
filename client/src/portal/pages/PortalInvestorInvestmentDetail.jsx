import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInvestorInvestmentDetail } from '../api/portalInvestor';
import StatusChip from '../investor/components/StatusChip';
import AmountText from '../investor/components/AmountText';
import ProgressBar from '../investor/components/ProgressBar';
import MilestoneTimeline from '../investor/components/MilestoneTimeline';
import PlainTooltip from '../investor/components/PlainTooltip';
import ReturnTypeBadge, { getReturnType, rateLabel } from '../investor/components/ReturnTypeBadge';

const fmt = (value, fallback = 'N/A') => {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PAYOUT_TITLES = {
  profit_distribution: 'Profit Payout',
  principal_return: 'Capital Returned',
  combined: 'Capital + Profit Paid',
};

const Row = ({ label, children, strong = false, last = false }) => (
  <div className={`flex justify-between gap-3 py-1.5 ${last ? '' : 'border-b border-slate-100'}`}>
    <span className={strong ? 'font-medium text-slate-700' : 'text-slate-500'}>{label}</span>
    {children}
  </div>
);

const PortalInvestorInvestmentDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getInvestorInvestmentDetail(id);
        setData(res.data);
      } catch (err) {
        setError('Investment agreement could not be located.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200" />;
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
        {error || 'Unable to load investment details.'}
        <div className="mt-3">
          <Link to="/portal/investor/investments" className="font-semibold text-indigo-600 underline">
            ← Return to Investments
          </Link>
        </div>
      </div>
    );
  }

  const m = data.metrics || {};
  const returnType = getReturnType(data.investmentType);

  const milestones = [
    {
      title: 'Principal Deposited',
      date: fmt(data.investmentDate, 'Initiation'),
      amount: data.amount,
      status: 'completed',
    },
    ...(data.payouts || []).map((p) => ({
      title: `${PAYOUT_TITLES[p.paymentType] || 'Payout'} (${p.paymentMethod})`,
      date: fmt(p.paymentDate, '—'),
      amount: p.amount,
      status: p.status === 'pending' ? 'upcoming' : 'completed',
    })),
    {
      title: 'Contract Maturity & Final Return',
      date: fmt(data.maturityDate, 'Future'),
      amount: data.expectedReturnAmount || data.amount,
      status: data.status === 'matured' || data.status === 'fully_returned' ? 'completed' : 'upcoming',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to="/portal/investor/investments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
        >
          ← Back to Investments
        </Link>
        <div className="flex gap-2">
          <Link
            to={`/portal/investor/history?investmentId=${data.id}`}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            History for this agreement
          </Link>
          <Link
            to="/portal/investor/compare"
            className="rounded-xl bg-[#3347B8] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#263691]"
          >
            Compare returns
          </Link>
        </div>
      </div>

      {/* Hero Overview */}
      <div className="rounded-3xl border border-[#E3E8F2] bg-white p-6 md:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-mono text-slate-400">{data.agreementRef}</span>
            <h1 className="text-xl md:text-2xl font-bold text-[#0B1530] font-wealth-display">{data.projectName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ReturnTypeBadge type={data.investmentType} />
              <span className="text-xs font-medium text-slate-500">{rateLabel(data)}</span>
            </div>
          </div>
          <StatusChip status={data.status} />
        </div>

        <div className="my-4">
          <span className="text-xs text-slate-400 block mb-1">Principal Capital</span>
          <AmountText amount={data.amount} className="text-3xl font-bold text-[#0B1530] font-wealth-display" />
        </div>

        <ProgressBar startDate={data.investmentDate} maturityDate={data.maturityDate} />
      </div>

      {/* How your return works */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">How your return works</p>
        <p className="mt-1.5 text-sm font-semibold text-[#0B1530]">{returnType.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{returnType.description}</p>
      </div>

      {/* Expected vs Actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Agreed Contract Terms</h3>
            <PlainTooltip term="Agreed Terms" explanation="Expected values based on the initial investment contract." />
          </div>
          <div className="text-xs">
            <Row label="Return Type">
              <span className="font-semibold text-slate-800">{returnType.label}</span>
            </Row>
            <Row label="Agreed Rate">
              <span className="font-semibold text-slate-800">{rateLabel(data) || '—'}</span>
            </Row>
            <Row label="Anticipated Profit">
              <AmountText amount={data.expectedProfit} className="font-semibold text-slate-800" />
            </Row>
            <Row label="Total Anticipated Return" strong last>
              <AmountText amount={data.expectedReturnAmount} className="font-bold text-indigo-700" />
            </Row>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Received So Far</h3>
            <PlainTooltip term="Received" explanation="Actual disbursements and funds deposited to your account to date." />
          </div>
          <div className="text-xs">
            <Row label="Disbursed to Date">
              <AmountText amount={data.totalPaidOut} className="font-semibold text-emerald-600" />
            </Row>
            <Row label="Remaining to Receive">
              <AmountText
                amount={Math.max(0, (data.expectedReturnAmount || 0) - (data.totalPaidOut || 0))}
                className="font-semibold text-slate-800"
              />
            </Row>
            <Row label="Start Date">
              <span className="font-medium text-slate-700">{fmt(data.investmentDate)}</span>
            </Row>
            <Row label="Maturity Date" strong last>
              <span className="font-semibold text-slate-800">{fmt(data.maturityDate)}</span>
            </Row>
          </div>
        </div>
      </div>

      {/* Capital vs profit split */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Capital returned', m.principalPaid, 'text-slate-800'],
          ['Profit paid', m.profitPaid, 'text-emerald-600'],
          ['Capital remaining', m.remainingPrincipal, 'text-slate-800'],
          ['Profit remaining', m.remainingProfit, 'text-amber-600'],
        ].map(([label, amount, tone]) => (
          <div key={label} className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-xs">
            <p className="text-[11px] font-medium text-slate-500">{label}</p>
            <AmountText amount={amount} className={`mt-1 block font-wealth-display text-lg font-bold ${tone}`} />
          </div>
        ))}
      </div>

      {/* Milestone Trail */}
      <div className="rounded-2xl border border-[#E3E8F2] bg-white p-6 shadow-xs">
        <h3 className="text-sm font-semibold text-[#0B1530] font-wealth-display mb-6">Investment Milestone Journey</h3>
        <MilestoneTimeline milestones={milestones} />
      </div>
    </div>
  );
};

export default PortalInvestorInvestmentDetail;