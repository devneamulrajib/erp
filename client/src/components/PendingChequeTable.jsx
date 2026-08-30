import { useState } from 'react';
import { updateReconciliationStatus } from '../api/voucher';

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

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-indigo-500 text-white font-semibold text-center py-2">Pending Cheque</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-indigo-500 text-white text-left text-xs">
              <th className="px-3 py-2 font-medium">SL</th>
              <th className="px-3 py-2 font-medium">Voucher No</th>
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium">Bank</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Cheque Date</th>
              <th className="px-3 py-2 font-medium text-right">Amount</th>
              <th className="px-3 py-2 font-medium text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {cheques.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-6">No pending cheques</td>
              </tr>
            )}
            {cheques.map((c, i) => (
              <tr key={c._id} className="border-b border-gray-100">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 text-blue-600">{c.voucherNo}</td>
                <td className="px-3 py-2">{c.description}</td>
                <td className="px-3 py-2 text-blue-600">{c.bank}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {c.date ? new Date(c.date).toLocaleDateString('en-GB') : ''}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {c.chequeDate ? new Date(c.chequeDate).toLocaleDateString('en-GB') : ''}
                </td>
                <td className="px-3 py-2 text-right">
                  {Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1 items-center">
                    <button
                      disabled={busyId === c._id}
                      onClick={() => handleAction(c._id, 'Honour')}
                      className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded w-24"
                    >
                      Honour
                    </button>
                    <button
                      disabled={busyId === c._id}
                      onClick={() => handleAction(c._id, 'DisHonour')}
                      className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1 rounded w-24"
                    >
                      DisHonour
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-center text-xs text-gray-500 py-2">
        Showing 1 to {cheques.length} of {cheques.length} entries
      </div>
    </div>
  );
}