import { useState } from 'react';
import { updateReconciliationStatus } from '../api/voucher';

function StatusChip({ status }) {
  const s = (status || 'Clearing');
  const map = {
    Clearing: 'bg-amber-50 text-amber-700',
    'In Transit': 'bg-blue-50 text-blue-700',
    Pending: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${map[s] || 'bg-slate-100 text-slate-600'}`}>
      {s}
    </span>
  );
}

export default function PendingChequeTable({ cheques, onUpdated }) {
  const [busyId, setBusyId] = useState(null);

  async function handleAction(id, status) {
    setBusyId(id);
    try {
      await updateReconciliationStatus(id, status);
      onUpdated?.();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to update cheque status');
    } finally {
      setBusyId(null);
    }
  }

  if (cheques.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">No pending cheques</p>;
  }

  return (
    <div className="space-y-3">
      {cheques.map((c) => (
        <div key={c._id} className="rounded-xl border border-slate-100 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Chq #{c.voucherNo}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusChip status={c.status} />
              <span className="text-sm font-bold tabular-nums text-slate-900">
                ${Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <p className="mt-1.5 text-xs text-slate-500">
            Payee: <span className="font-semibold text-slate-700">{c.description}</span>
            {c.chequeDate && `, Due: ${new Date(c.chequeDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Bank: <span className="font-medium text-slate-600">{c.bank}</span>
            {c.voucherNo && ` · Voucher: ${c.voucherNo}`}
          </p>

          <div className="mt-2.5 flex gap-2">
            <button
              disabled={busyId === c._id}
              onClick={() => handleAction(c._id, 'Honour')}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              Honour
            </button>
            <button
              disabled={busyId === c._id}
              onClick={() => handleAction(c._id, 'DisHonour')}
              className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              DisHonour
            </button>
          </div>
        </div>
      ))}
      <p className="pt-1 text-center text-[11px] text-slate-400">Showing {cheques.length} of {cheques.length} pending items</p>
    </div>
  );
}