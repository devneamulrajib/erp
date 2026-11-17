import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Receipt, Clock, CalendarDays, Download, X, Banknote } from 'lucide-react';
import { getPortalEarnings } from '../api/portalPurchaseOrders';
import { getPortalUser } from '../api/portalAuth';
import PortalLayout from '../components/PortalLayout';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 2026-11-15 -> "15 Nov 26"
function shortDate(value) {
  if (!value) return '-';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1].slice(2)}`;
  return String(value);
}

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

// The last `n` calendar months (oldest first), used for the bar chart.
function lastMonths(n) {
  const now = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: MONTHS[d.getMonth()],
    });
  }
  return out;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(payments) {
  const header = ['Date', 'Invoice', 'Order', 'Method', 'Cheque/Receipt No', 'Amount'];
  const lines = payments.map((p) => [
    p.date, p.billCode, p.purchaseOrderCode, p.method, p.chequeReceiptNo, p.amount,
  ].map(csvCell).join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'my-payments-received.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function StatTile({ icon: Icon, label, value, tone = 'text-slate-900' }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <Icon size={14} className="text-slate-300" />
      </div>
      <p className={`text-lg md:text-xl font-bold leading-none ${tone}`}>{value}</p>
    </div>
  );
}

export default function PortalEarnings() {
  const user = getPortalUser();
  const isSupplier = user?.role === 'supplier' || user?.role === 'vendor';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (!isSupplier) return;
    setLoading(true);
    setError('');
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    getPortalEarnings(params)
      .then(setData)
      .catch(() => setError('Could not load your earnings right now.'))
      .finally(() => setLoading(false));
  }, [isSupplier, from, to]);

  const months = useMemo(() => {
    const map = Object.fromEntries((data?.monthly || []).map((m) => [m.month, m.received]));
    return lastMonths(6).map((m) => ({ ...m, value: map[m.key] || 0 }));
  }, [data]);
  const maxMonth = Math.max(...months.map((m) => m.value), 1);

  if (!isSupplier) {
    return (
      <PortalLayout>
        <p className="text-sm text-slate-400">Earnings are only available for supplier/vendor accounts.</p>
      </PortalLayout>
    );
  }

  const summary = data?.summary;
  const payments = data?.payments || [];
  const filtered = !!(from || to);

  return (
    <PortalLayout>
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">My Earnings</h1>
        <p className="text-sm text-slate-400 mt-0.5">Payments you have received from us</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
      )}

      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">Loading…</div>
      ) : data && (
        <>
          {/* Hero: total received */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-5 mb-3 shadow-sm">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute right-6 -bottom-8 w-20 h-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-1.5 text-white/80">
                <TrendingUp size={14} />
                <p className="text-[11px] font-semibold uppercase tracking-wide">Total Received</p>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-white tracking-tight mt-1">{money(summary.totalReceived)}</p>
              <p className="text-xs text-white/80 mt-1.5">
                {summary.paymentsCount === 0
                  ? 'No payments received yet'
                  : `${summary.paymentsCount} payment${summary.paymentsCount === 1 ? '' : 's'} · last on ${shortDate(summary.lastPaymentDate)}`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 md:gap-4 mb-5">
            <StatTile icon={Receipt} label="Total Invoiced" value={money(summary.totalInvoiced)} />
            <StatTile
              icon={Clock}
              label="Still To Receive"
              value={money(summary.outstanding)}
              tone={summary.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}
            />
          </div>

          {/* Month by month */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 mb-5">
            <p className="text-sm font-semibold text-slate-800 mb-4">Received per month</p>
            <div className="flex items-end gap-2 md:gap-4 h-36">
              {months.map((m) => (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                  <span className="text-[10px] font-medium text-slate-500 mb-1 truncate max-w-full">
                    {m.value > 0 ? Number(m.value).toLocaleString() : ''}
                  </span>
                  <div
                    className={`w-full rounded-t-md ${m.value > 0 ? 'bg-emerald-500' : 'bg-slate-100'}`}
                    style={{ height: m.value > 0 ? `${Math.max((m.value / maxMonth) * 100, 4)}%` : '4px' }}
                  />
                  <span className="text-[10px] text-slate-400 mt-1.5">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment history */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 md:px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Banknote size={15} className="text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-800">Payment History</h2>
              </div>
              <button
                onClick={() => downloadCsv(payments)}
                disabled={payments.length === 0}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40"
              >
                <Download size={13} /> Download CSV
              </button>
            </div>

            {/* Date filter */}
            <div className="flex flex-wrap items-end gap-3 px-4 md:px-5 py-3 border-b border-slate-100">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-wide text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              {filtered && (
                <>
                  <button
                    onClick={() => { setFrom(''); setTo(''); }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 pb-1.5"
                  >
                    <X size={12} /> Clear
                  </button>
                  <p className="text-xs text-slate-500 pb-1.5 ml-auto">
                    In this period: <span className="font-semibold text-emerald-600">{money(summary.rangeTotal)}</span>
                    {' '}({summary.rangeCount})
                  </p>
                </>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                {filtered ? 'No payments in this period' : 'No payments received yet'}
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {payments.map((p) => (
                    <div key={p.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.billCode || '-'}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <CalendarDays size={11} /> {shortDate(p.date)}
                          <span>·</span>
                          <span className="truncate">{p.method || '-'}{p.chequeReceiptNo ? ` (${p.chequeReceiptNo})` : ''}</span>
                        </p>
                        {p.purchaseOrderId && (
                          <Link to={`/portal/orders/${p.purchaseOrderId}`} className="text-[11px] font-mono text-indigo-600 hover:text-indigo-700">
                            {p.purchaseOrderCode}
                          </Link>
                        )}
                      </div>
                      <p className="text-sm font-bold text-emerald-600 shrink-0">+{money(p.amount)}</p>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-left font-medium">Invoice</th>
                        <th className="px-4 py-3 text-left font-medium">Order</th>
                        <th className="px-4 py-3 text-left font-medium">Method</th>
                        <th className="px-4 py-3 text-left font-medium">Cheque / Receipt No</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{shortDate(p.date)}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.billCode || '-'}</td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {p.purchaseOrderId ? (
                              <Link to={`/portal/orders/${p.purchaseOrderId}`} className="text-indigo-600 hover:text-indigo-700">
                                {p.purchaseOrderCode}
                              </Link>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{p.method || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{p.chequeReceiptNo || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-600">+{money(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </PortalLayout>
  );
}