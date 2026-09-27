import { useState } from 'react';
import { Search, Eye } from 'lucide-react';

const TABS = ['Today', 'Weekly', 'Monthly', 'Yearly', 'All'];

const TYPE_BADGE = {
  Payment: 'bg-blue-600',
  Receipt: 'bg-emerald-600',
  Expense: 'bg-slate-500',
  PurchaseRequisition: 'bg-amber-500',
  Journal: 'bg-violet-600',
  Contra: 'bg-sky-600',
};

function withinRange(dateStr, tab) {
  if (tab === 'All' || !dateStr) return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (tab === 'Today') return d.toDateString() === now.toDateString();
  const diffDays = (now - d) / 86400000;
  if (tab === 'Weekly') return diffDays <= 7;
  if (tab === 'Monthly') return diffDays <= 31;
  if (tab === 'Yearly') return diffDays <= 366;
  return true;
}

function VoucherCard({ voucher, onApprove }) {
  const badgeColor = TYPE_BADGE[voucher.type] || 'bg-slate-400';
  return (
    <div className="mb-3 rounded-xl border border-slate-100 p-3.5 text-sm">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-slate-800">{voucher.reference}</span>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold text-white ${badgeColor}`}>
          {voucher.type}{voucher.amount ? ` $${Number(voucher.amount).toLocaleString()}` : ''}
        </span>
      </div>

      <p className="text-slate-600">Project: <span className="font-semibold text-slate-800">{voucher.project}</span></p>
      {voucher.drAccount && (
        <p className="text-slate-500">
          Dr-<span className="text-blue-600 font-medium">{voucher.drAccount}</span>, Cr-<span className="text-blue-600 font-medium">{voucher.crAccount}</span>
        </p>
      )}
      <p className="mt-1 text-[11px] text-slate-400">
        Added By: <span className="font-medium text-slate-500">{voucher.addedBy}</span>
        {voucher.date && ` · ${new Date(voucher.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          title="View details"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <Eye size={14} />
        </button>
        <button
          onClick={() => (onApprove ? onApprove(voucher) : window.alert('Wire this button to your approve-voucher endpoint.'))}
          className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700"
        >
          Approve Voucher
        </button>
      </div>
    </div>
  );
}

export default function PendingVoucherPanel({ vouchers, onApprove }) {
  const [activeTab, setActiveTab] = useState('Today');
  const [search, setSearch] = useState('');

  const filtered = vouchers.filter((v) => {
    const matchesSearch = (v.project || '').toLowerCase().includes(search.toLowerCase())
      || (v.reference || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch && withinRange(v.date, activeTab);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-5 gap-1 rounded-lg bg-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-2 py-1.5 text-center text-[11px] font-bold transition-colors ${
              activeTab === tab ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search with Project/Code/Reference..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      <div className="mt-3 max-h-[520px] flex-1 overflow-y-auto pr-0.5">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No pending vouchers</p>
        )}
        {filtered.map((v, i) => <VoucherCard key={v._id || i} voucher={v} onApprove={onApprove} />)}
      </div>
    </div>
  );
}