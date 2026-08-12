import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { payInstallment } from '../api/flatSale';

export default function OverduePaymentModal({ open, saleId, installmentId, defaultAmount, onClose, onPaid }) {
  const [method, setMethod] = useState('Cash');
  const [ifCheque, setIfCheque] = useState(false);
  const [amount, setAmount] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMethod('Cash');
    setIfCheque(false);
    setAmount(defaultAmount != null ? String(defaultAmount) : '');
    setReceiptNo('');
    setComment('');
    setError('');
  }, [open, defaultAmount]);

  if (!open) return null;

  function toggleCheque(checked) {
    setIfCheque(checked);
    setMethod(checked ? 'Cheque' : 'Cash');
  }

  function selectMethod(value) {
    setMethod(value);
    setIfCheque(value === 'Cheque');
  }

  async function handleSubmit() {
    const numAmount = Number(amount);
    if (!method) {
      setError('Payment Method is required');
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError('Amount is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updatedSale = await payInstallment(saleId, installmentId, {
        amount: numAmount,
        method,
        receiptNo,
        comment,
      });
      onPaid?.(updatedSale);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Overdue Payment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-1">
              Payment Method<span className="text-red-500">*</span>
              <span className="ml-2 flex items-center gap-1 text-xs font-normal">
                <input type="checkbox" checked={ifCheque} onChange={(e) => toggleCheque(e.target.checked)} />
                if Cheque
              </span>
            </label>
            <select
              value={method}
              onChange={(e) => selectMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="Cash">Cash</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Amount<span className="text-red-500">*</span></label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Amount"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Cheque/Receipt No</label>
            <input
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter Cheque/Receipt No"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Comment</label>
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              placeholder="Enter Comment"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 text-sm rounded-md bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}