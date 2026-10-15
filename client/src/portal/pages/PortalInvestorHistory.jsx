import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getInvestorHistory } from '../api/portalInvestor';
import AmountText from '../investor/components/AmountText';
import EmptyState from '../investor/components/EmptyState';
import ReturnTypeBadge from '../investor/components/ReturnTypeBadge';
import { CardSkeleton } from '../investor/components/SkeletonLoader';

const TYPE_TABS = [
  ['all', 'All'],
  ['investment', 'Investments'],
  ['payment', 'Payouts'],
  ['maturity', 'Maturity'],
];

const STYLE = {
  investment: { tone: 'bg-indigo-50 text-indigo-600', path: 'M12 5v14M6 13l6 6 6-6', label: 'Deposit' },
  payment: { tone: 'bg-emerald-50 text-emerald-600', path: 'M12 19V5M6 11l6-6 6 6', label: 'Payout' },
  maturity: { tone: 'bg-amber-50 text-amber-600', path: 'M5 21V4M5 4h11l-2 4 2 4H5', label: 'Maturity' },
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const monthLabel = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const PortalInvestorHistory = () => {
  const [searchParams] = useSearchParams();
  const [type, setType] = useState('all');
  const [investmentId, setInvestmentId] = useState(searchParams.get('investmentId') || 'all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { type };
        if (investmentId !== 'all') params.investmentId = investmentId;
        if (from) params.from = from;
        if (to) params.to = to;
        const res = await getInvestorHistory(params);
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('We could not load your history. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [type, investmentId, from, to]);

  const events = data?.events || [];

  const grouped = useMemo(() => {
    const map = new Map();
    events.forEach((ev) => {
      const key = String(ev.date).slice(0, 7);
      if (!map.has(key)) map.set(key, { label: monthLabel(ev.date), items: [] });
      map.get(key).items.push(ev);
    });
    return [...map.values()];
  }, [events]);

  const exportCsv = () => {
    const header = ['Date', 'Type', 'Description', 'Project', 'Agreement', 'Amount', 'Reference'];
    const lines = events.map((e) =>
      [e.date, STYLE[e.type]?.label, e.title, e.projectName, e.agreementRef, e.amount, e.referenceNo || '']
        .map(csvCell)
        .join(',')
    );
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investment-history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setType('all');
    setInvestmentId('all');
    setFrom('');
    setTo('');
  };

  const hasFilters = type !== 'all' || investmentId !== 'all' || from || to;

  return (
    <div id="printable-statement" className="space-y-6 text-[#0B1530]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/portal/investor/dashboard"
            className="no-print text-xs font-medium text-slate-500 transition-colors hover:text-indigo-600"
          >
            ← Back to Home
          </Link>
          <h1 className="mt-1 font-wealth-display text-xl font-bold md:text-2xl">Investment History</h1>
          <p className="text-xs text-slate-500">Every deposit, payout and maturity across your agreements</p>
        </div>
        <div className="no-print flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={events.length === 0}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-[#3347B8] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#263691]"
          >
            Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print space-y-3 rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto">
          {TYPE_TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                type === key ? 'bg-[#3347B8] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            value={investmentId}
            onChange={(e) => setInvestmentId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-indigo-600 sm:col-span-2"
          >
            <option value="all">All agreements</option>
            {(data?.investments || []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-indigo-600"
          />
        </div>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Clear filters
          </button>
        )}
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500">Invested</p>
            <AmountText amount={data.summary.totalInvested} className="mt-1 block font-wealth-display text-base font-bold sm:text-xl" />
          </div>
          <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500">Received</p>
            <AmountText amount={data.summary.totalReceived} className="mt-1 block font-wealth-display text-base font-bold text-emerald-600 sm:text-xl" />
          </div>
          <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500">Entries</p>
            <span className="mt-1 block font-wealth-display text-base font-bold sm:text-xl">{data.summary.eventsCount}</span>
          </div>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <CardSkeleton count={3} />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{error}</div>
      ) : events.length === 0 ? (
        <EmptyState title="No history found" description="Nothing matches the selected filters." />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.label}</h2>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
                {group.items.map((ev) => {
                  const s = STYLE[ev.type];
                  return (
                    <li key={ev.key} className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.tone}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d={s.path} />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-bold">{ev.title}</p>
                          {ev.upcoming && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Upcoming</span>
                          )}
                          {ev.status === 'pending' && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Pending</span>
                          )}
                          {ev.type === 'investment' && <ReturnTypeBadge type={ev.investmentType} />}
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          <Link to={`/portal/investor/investments/${ev.investmentId}`} className="font-medium hover:text-indigo-600">
                            {ev.projectName}
                          </Link>{' '}
                          · <span className="font-mono">{ev.agreementRef}</span> · {formatDate(ev.date)}
                        </p>
                        {ev.type === 'payment' && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            {ev.method}
                            {ev.referenceNo ? ` · Ref ${ev.referenceNo}` : ''}
                            {ev.principalPaid > 0 && ev.profitPaid > 0 && (
                              <>
                                {' · Capital '}
                                <AmountText amount={ev.principalPaid} />
                                {' · Profit '}
                                <AmountText amount={ev.profitPaid} />
                              </>
                            )}
                          </p>
                        )}
                        {ev.type === 'maturity' && (
                          <p className="mt-1 text-[11px] text-slate-400">Expected total return at maturity</p>
                        )}
                      </div>
                      <AmountText
                        amount={ev.amount}
                        className={`shrink-0 text-sm font-bold ${ev.type === 'payment' ? 'text-emerald-600' : 'text-[#0B1530]'}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default PortalInvestorHistory;