import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-emerald-50 text-emerald-700',
  'bg-blue-50 text-blue-700',
  'bg-violet-50 text-violet-700',
  'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-700',
];

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function BankBalanceTable({ accounts, total }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? accounts : accounts.slice(0, 3);

  return (
    <div>
      {/* Hero reserves box */}
      <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 px-4 py-3.5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">Total Liquid Reserves</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">Audited Daily</span>
        </div>
        <p className="mt-1 text-2xl font-extrabold tabular-nums">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-blue-100">{accounts.length} Active Accounts</p>
      </div>

      {/* Account list */}
      <div className="mt-3 space-y-2">
        {accounts.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No bank accounts found.</p>
        )}
        {visible.map((a, i) => (
          <div key={a._id || i} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {initials(a.name) || '—'}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{a.name}</p>
                <p className="truncate text-[11px] text-slate-400">
                  {a.accountNumber ? `Acct •••• ${String(a.accountNumber).slice(-4)}` : 'Account'}
                  {a.lastUpdated && ` · As of ${new Date(a.lastUpdated).toLocaleDateString('en-GB')}`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <p className="text-sm font-bold tabular-nums text-slate-900">
                ${a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] font-semibold text-emerald-600">Reconciled</span>
            </div>
          </div>
        ))}
      </div>

      {accounts.length > 3 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          {showAll ? 'Show Less' : 'Show More Accounts'}
          <ChevronDown size={13} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}