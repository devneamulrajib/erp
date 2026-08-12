import { useState } from 'react';
import { Search, Eye, Check, X } from 'lucide-react';

const TABS = ['Today', 'Weekly', 'Monthly', 'Yearly', 'All'];
const TYPE_BADGE = { PurchaseRequisition: 'bg-orange-500', Expense: 'bg-gray-500' };

function VoucherCard({ voucher }) {
  const badgeColor = TYPE_BADGE[voucher.type] || 'bg-gray-400';
  return (
    <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-white text-sm text-left">
      <div className="flex justify-between items-start mb-1">
        <div className="font-semibold text-gray-700">Reference:</div>
        <span className={`${badgeColor} text-white text-xs px-2 py-0.5 rounded`}>
          {voucher.type}{voucher.amount ? ` ${voucher.amount}` : ''}
        </span>
      </div>
      <div className="text-gray-600">Project: <span className="font-medium">{voucher.project}</span></div>
      {voucher.drAccount && (
        <div className="text-gray-600">
          Dr-<span className="text-blue-600">{voucher.drAccount}</span>, Cr-<span className="text-blue-600">{voucher.crAccount}</span>
        </div>
      )}
      <div className="text-gray-500 text-xs mt-1">{voucher.reference}</div>
      <div className="text-gray-500 text-xs">Added By: <span className="font-medium">{voucher.addedBy}</span></div>
      <div className="text-gray-500 text-xs mb-2">
        {voucher.date ? new Date(voucher.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
      </div>
      {(voucher.approvals || []).map((a, i) => (
        <div key={i} className={`flex items-center gap-1 text-xs ${a.approved ? 'text-green-600' : 'text-red-500'}`}>
          {a.approved ? <Check size={13} /> : <X size={13} />}
          {a.name}
        </div>
      ))}
      <button className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded flex items-center justify-center w-fit">
        <Eye size={14} />
      </button>
    </div>
  );
}

export default function PendingVoucherPanel({ vouchers }) {
  const [activeTab, setActiveTab] = useState('Today');
  const [search, setSearch] = useState('');

  const filtered = vouchers.filter((v) =>
    (v.project || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.reference || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="font-semibold text-center py-2 border-b border-gray-200">Pending Voucher/Invoice</div>
      <div className="p-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search with Project/Code/Reference..."
            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>
      <div className="px-2 pb-2 overflow-y-auto flex-1 max-h-[480px]">
        {filtered.length === 0 && <div className="text-gray-400 text-sm text-center py-8">No pending vouchers</div>}
        {filtered.map((v, i) => <VoucherCard key={v._id || i} voucher={v} />)}
      </div>
    </div>
  );
}