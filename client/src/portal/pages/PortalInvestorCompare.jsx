import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvestorCompare } from '../api/portalInvestor';
import { useInvestorPrivacy } from '../investor/context/InvestorPrivacyContext';
import AmountText from '../investor/components/AmountText';
import EmptyState from '../investor/components/EmptyState';
import ReturnTypeBadge, { rateLabel } from '../investor/components/ReturnTypeBadge';
import { CardSkeleton } from '../investor/components/SkeletonLoader';

const PERIODS = [
  ['6m', '6 months'],
  ['1y', '1 year'],
  ['3y', '3 years'],
  ['full', 'Till maturity'],
];

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const compact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
};

const termText = (months) => {
  if (months < 12) return `${months} mo`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}y ${m}m` : `${y}y`;
};

/* -------------------------------------------------------------------------- */
/*  Growth chart (inline SVG)                                                 */
/* -------------------------------------------------------------------------- */

const W = 720;
const H = 300;
const PAD = { l: 52, r: 16, t: 16, b: 32 };

const LINES = [
  { key: 'invested', label: 'Invested', color: '#94A3B8', dash: '' },
  { key: 'expectedValue', label: 'Expected value', color: '#3347B8', dash: '' },
  { key: 'received', label: 'Received', color: '#12B886', dash: '' },
];

function GrowthChart({ series, asOf }) {
  const { isMasked } = useInvestorPrivacy();
  const svgRef = useRef(null);
  const todayIdx = series.findIndex((p) => p.date === asOf);
  const [hover, setHover] = useState(null);

  if (series.length < 2) return null;

  const maxRaw = Math.max(...series.flatMap((p) => [p.invested, p.expectedValue, p.received || 0]), 1);
  const mag = Math.pow(10, Math.floor(Math.log10(maxRaw)));
  const unit = mag / 2;
  const maxY = Math.ceil(maxRaw / unit) * unit;

  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i) => PAD.l + (i / (series.length - 1)) * innerW;
  const y = (v) => PAD.t + (1 - v / maxY) * innerH;

  const pathFor = (key) => {
    let d = '';
    let pen = false;
    series.forEach((p, i) => {
      const v = p[key];
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const labelCount = Math.min(5, series.length);
  const labelIdx = Array.from({ length: labelCount }, (_, k) =>
    Math.round((k / (labelCount - 1)) * (series.length - 1))
  );

  const handleMove = (clientX) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((px - PAD.l) / innerW) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, idx)));
  };

  const activeIdx = hover ?? (todayIdx >= 0 ? todayIdx : series.length - 1);
  const active = series[activeIdx];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {LINES.map((l) => (
          <span key={l.key} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="Invested amount compared with expected value over time"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#E3E8F2" strokeWidth="1" />
            {!isMasked && (
              <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#94A3B8">
                {compact(t)}
              </text>
            )}
          </g>
        ))}

        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#94A3B8">
            {new Date(series[i].date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
          </text>
        ))}

        {todayIdx >= 0 && (
          <g>
            <line x1={x(todayIdx)} x2={x(todayIdx)} y1={PAD.t} y2={H - PAD.b} stroke="#F59F00" strokeWidth="1" strokeDasharray="4 4" />
            <text x={x(todayIdx)} y={PAD.t - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#F59F00">
              Today
            </text>
          </g>
        )}

        {LINES.map((l) => (
          <path
            key={l.key}
            d={pathFor(l.key)}
            fill="none"
            stroke={l.color}
            strokeWidth={l.key === 'expectedValue' ? 2.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        <line x1={x(activeIdx)} x2={x(activeIdx)} y1={PAD.t} y2={H - PAD.b} stroke="#CBD5E1" strokeWidth="1" />
        {LINES.map((l) =>
          active[l.key] != null ? (
            <circle key={l.key} cx={x(activeIdx)} cy={y(active[l.key])} r="4" fill="#fff" stroke={l.color} strokeWidth="2" />
          ) : null
        )}
      </svg>

      <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-slate-400">Date</p>
          <p className="font-semibold">{formatDate(active.date)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Invested</p>
          <AmountText amount={active.invested} className="font-semibold text-slate-700" />
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Expected value</p>
          <AmountText amount={active.expectedValue} className="font-semibold text-indigo-700" />
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Received</p>
          {active.received == null ? (
            <span className="font-semibold text-slate-400">—</span>
          ) : (
            <AmountText amount={active.received} className="font-semibold text-emerald-600" />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

const PortalInvestorCompare = () => {
  const [period, setPeriod] = useState('1y');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await getInvestorCompare({ period });
        if (!cancelled) setData(res.data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('We could not load the comparison. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const s = data?.summary;
  const items = data?.items || [];
  const periodLabel = PERIODS.find(([k]) => k === period)?.[1];

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
          <h1 className="mt-1 font-wealth-display text-xl font-bold md:text-2xl">Compare Returns</h1>
          <p className="text-xs text-slate-500">What you invested versus what you can expect to receive</p>
        </div>

        <div className="no-print flex gap-1 rounded-xl border border-[#E3E8F2] bg-white p-1 shadow-sm">
          {PERIODS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:flex-none ${
                period === key ? 'bg-[#3347B8] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">{error}</div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing to compare yet" description="Once you have an investment agreement, projections appear here." />
      ) : (
        <>
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500">You invested</p>
              <AmountText amount={s.invested} className="mt-1 block font-wealth-display text-lg font-bold sm:text-xl" />
              <p className="mt-1 text-[11px] text-slate-400">{items.length} agreement{items.length === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm">
              <p className="text-[11px] font-medium text-indigo-700">
                {period === 'full' ? 'Expected at maturity' : `Expected in ${periodLabel}`}
              </p>
              <AmountText amount={s.expectedValueAtHorizon} className="mt-1 block font-wealth-display text-lg font-bold text-indigo-800 sm:text-xl" />
              <p className="mt-1 text-[11px] text-indigo-600/70">by {formatDate(data.horizonDate)}</p>
            </div>
            <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500">Expected profit</p>
              <AmountText amount={s.expectedProfitAtHorizon} className="mt-1 block font-wealth-display text-lg font-bold text-emerald-600 sm:text-xl" />
              <p className="mt-1 text-[11px] text-slate-400">over this period</p>
            </div>
            <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm">
              <p className="text-[11px] font-medium text-slate-500">Received so far</p>
              <AmountText amount={s.receivedToDate} className="mt-1 block font-wealth-display text-lg font-bold sm:text-xl" />
              <p className="mt-1 text-[11px] text-slate-400">of full-term return</p>
            </div>
          </div>

          {/* Chart */}
          <section className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 font-wealth-display text-[15px] font-semibold">Invested vs. expected value</h3>
            <GrowthChart series={data.series} asOf={data.asOf} />
          </section>

          {/* All horizons */}
          <section className="rounded-2xl border border-[#E3E8F2] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="font-wealth-display text-[15px] font-semibold">Value by time period</h3>
            <p className="mb-4 text-xs text-slate-500">Total expected value of all your agreements</p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {data.horizons.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setPeriod(h.key)}
                  className={`rounded-xl border p-3.5 text-left transition ${
                    h.key === period ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-100 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h.label}</p>
                  <AmountText amount={h.expectedValue} className="mt-1 block font-wealth-display text-base font-bold" />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Profit <AmountText amount={h.expectedProfit} className="font-semibold text-emerald-600" />
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Per agreement */}
          <section className="overflow-hidden rounded-2xl border border-[#E3E8F2] bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
              <h3 className="font-wealth-display text-[15px] font-semibold">By agreement</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Expected figures for {period === 'full' ? 'the full term' : periodLabel}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Agreement</th>
                    <th className="px-4 py-3">Return type</th>
                    <th className="px-4 py-3 text-right">Invested</th>
                    <th className="px-4 py-3 text-right">Term</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-right">Profit by then</th>
                    <th className="px-6 py-3 text-right">Value by then</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <tr key={it.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-3.5">
                        <Link to={`/portal/investor/investments/${it.id}`} className="font-semibold hover:text-indigo-600">
                          {it.projectName}
                        </Link>
                        <p className="font-mono text-[11px] text-slate-400">{it.agreementRef}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <ReturnTypeBadge type={it.investmentType} />
                        <p className="mt-1 text-[11px] text-slate-500">{rateLabel(it)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold">
                        <AmountText amount={it.principal} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-600">
                        {termText(it.termMonths)}
                        <p className="text-[11px] text-slate-400">
                          {it.maturityDate ? `to ${formatDate(it.maturityDate)}` : 'maturity not set'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-emerald-700">
                        <AmountText amount={it.received} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-emerald-600">
                        <AmountText amount={it.profitAtHorizon} />
                        {it.estimated && <span className="ml-1 text-amber-600" title="Estimate">*</span>}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3.5 text-right font-bold text-indigo-700">
                        <AmountText amount={it.valueAtHorizon} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Projections spread the agreed profit evenly across each agreement's term; actual payout dates follow your
            signed agreement.
            {s.anyEstimated && ' * Project-based returns without an agreed amount are estimated from current project performance and may change.'}
            {items.some((i) => i.maturityAssumed) && ' Agreements with no maturity date are assumed to run for 12 months.'}
          </p>
        </>
      )}
    </div>
  );
};

export default PortalInvestorCompare;