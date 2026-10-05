// src/pages/OfficeBudgetPage.jsx
import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Wallet,
  CreditCard,
  TrendingUp,
  AlertCircle,
  FileText,
  Pencil,
  Eye,
  Trash2,
  X,
  History,
  Clock,
  Plus,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Folder,
  ArrowDownLeft,
  Coins,
  BadgeDollarSign,
  Users,
  TriangleAlert,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import {
  getMonthlyBudgetSummary,
  saveMonthlyBudget,
  deleteMonthlyBudget,
  getMonthlyBudgetLogs,
  getCashReceipts,
  saveCashReceipt,
  deleteCashReceipt,
  approveMonthlyBudget,
  rejectMonthlyBudget,
} from '../api/monthlyBudget';
import { previewPaySlips } from '../api/paySlip';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const money = (val) =>
  Number(val || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

// Modal to record a partial cash installment received
function ReceiveCashModal({ initialData, rows = [], year, month, onClose, onSaved }) {
  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [receivedDate, setReceivedDate] = useState(
    initialData?.receivedDate || new Date().toISOString().slice(0, 10)
  );
  const [receivedFrom, setReceivedFrom] = useState(initialData?.receivedFrom || 'Management');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'Cash');
  const [referenceNo, setReferenceNo] = useState(initialData?.referenceNo || '');
  const [budgetCategoryId, setBudgetCategoryId] = useState(
    initialData?.budgetCategoryId ? String(initialData.budgetCategoryId) : ''
  );
  const [note, setNote] = useState(initialData?.note || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!initialData?.id;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid cash amount');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      await saveCashReceipt({
        id: initialData?.id,
        year,
        month,
        amount: Number(amount),
        receivedDate,
        receivedFrom,
        paymentMethod,
        referenceNo,
        budgetCategoryId: budgetCategoryId || null,
        note,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save cash receipt');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownLeft size={16} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Cash Receipt' : 'Record Cash Inflow (Disbursement)'}
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-10">
          For {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cash Received Amount (৳) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 20000"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date Received *
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Received From
              </label>
              <input
                type="text"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="e.g. MD Sir / Bank Withdrawal"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="Cash">Cash in Hand</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Banking">bKash / Nagad</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / Cheque / Voucher #
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. CHQ-98124 or VR-01"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tag to Category (Optional)
              </label>
              <select
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">General Office Fund (All Categories)</option>
                {rows.map((cat) => (
                  <option key={cat.budgetCategoryId} value={cat.budgetCategoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Note / Remarks
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. First tranche of office operating cash for this month..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Cash Received'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal showing the list of all cash receipts for the month
function CashReceiptsListModal({ year, month, rows = [], onClose, onReceiptUpdated }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReceipt, setEditingReceipt] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const categoryNameById = useMemo(() => {
    const map = {};
    rows.forEach((r) => { map[r.budgetCategoryId] = r.name; });
    return map;
  }, [rows]);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCashReceipts(year, month);
      setReceipts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleDelete = async (id, amt) => {
    if (!window.confirm(`Delete cash receipt of ৳${money(amt)}?`)) return;
    try {
      await deleteCashReceipt(id);
      await fetchReceipts();
      onReceiptUpdated();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  const totalReceiptsAmount = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center justify-between mb-4 pr-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins size={16} />
              </span>
              <h2 className="text-base font-bold text-slate-900">Cash Inflow Receipts History</h2>
            </div>
            <p className="text-xs text-slate-500 ml-10">
              Installments disbursed to Accounts for {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus size={13} />
            Receive Cash
          </button>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between mb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Cash Received in Tranches
            </span>
            <span className="text-xl font-extrabold text-emerald-600">
              ৳{money(totalReceiptsAmount)}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {receipts.length} installment{receipts.length !== 1 ? 's' : ''} logged
          </span>
        </div>

        {/* Receipts List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading cash receipts…</div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No cash receipts recorded yet for this month. Click "+ Receive Cash" above to log one.
            </div>
          ) : (
            receipts.map((rcpt) => (
              <div
                key={rcpt.id}
                className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white transition"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">
                      ৳{money(rcpt.amount)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      {rcpt.paymentMethod}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        rcpt.budgetCategoryId
                          ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                          : 'bg-slate-100 text-slate-500 border-slate-200/60'
                      }`}
                    >
                      {rcpt.budgetCategoryId
                        ? categoryNameById[rcpt.budgetCategoryId] || 'Category'
                        : 'General Office Fund'}
                    </span>
                    {rcpt.referenceNo && (
                      <span className="text-[11px] font-mono text-slate-400">
                        Ref: {rcpt.referenceNo}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    From: <span className="font-semibold text-slate-800">{rcpt.receivedFrom || 'Management'}</span>
                    {' • '}
                    Date: <span className="text-slate-500">{rcpt.receivedDate}</span>
                  </p>

                  {rcpt.note && (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">"{rcpt.note}"</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingReceipt(rcpt)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rcpt.id, rcpt.amount)}
                    className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Single Receipt Modal */}
      {editingReceipt && (
        <ReceiveCashModal
          initialData={editingReceipt}
          rows={rows}
          year={year}
          month={month}
          onClose={() => setEditingReceipt(null)}
          onSaved={() => {
            fetchReceipts();
            onReceiptUpdated();
          }}
        />
      )}

      {/* Add Single Receipt from inside History Modal */}
      {isAddingNew && (
        <ReceiveCashModal
          rows={rows}
          year={year}
          month={month}
          onClose={() => setIsAddingNew(false)}
          onSaved={() => {
            fetchReceipts();
            onReceiptUpdated();
          }}
        />
      )}
    </div>
  );
}

// Modal for Setting / Editing Budget Limit
function EditBudgetModal({ row, rows = [], year, month, onClose, onSaved }) {
  const [selectedCatId, setSelectedCatId] = useState(
    row?.budgetCategoryId || rows?.[0]?.budgetCategoryId || ''
  );

  const selectedCategory = useMemo(() => {
    if (row && row.budgetCategoryId) return row;
    return rows.find((r) => String(r.budgetCategoryId) === String(selectedCatId)) || {};
  }, [row, rows, selectedCatId]);

  const [amount, setAmount] = useState(
    selectedCategory.allocatedAmount !== undefined && selectedCategory.allocatedAmount !== null
      ? String(selectedCategory.allocatedAmount)
      : ''
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isNew = !selectedCategory.monthlyBudgetId;

  const handleCategoryChange = (e) => {
    const catId = e.target.value;
    setSelectedCatId(catId);
    const cat = rows.find((r) => String(r.budgetCategoryId) === String(catId));
    if (cat) {
      setAmount(
        cat.allocatedAmount !== undefined && cat.allocatedAmount !== null
          ? String(cat.allocatedAmount)
          : ''
      );
    } else {
      setAmount('');
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const targetCatId = selectedCategory.budgetCategoryId || selectedCatId;
    if (!targetCatId) {
      setError('Please select a category');
      setSubmitting(false);
      return;
    }

    try {
      await saveMonthlyBudget({
        budgetCategoryId: targetCatId,
        year,
        month,
        allocatedAmount: amount === '' ? 0 : Number(amount),
        note,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save allocation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <X size={16} />
        </button>
        <h2 className="text-lg font-bold text-slate-900 mb-0.5">
          {isNew ? 'Set Budget Allocation' : 'Edit Budget Allocation'}
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          For {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!row?.budgetCategoryId ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Budget Category
              </label>
              <select
                value={selectedCatId}
                onChange={handleCategoryChange}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {rows.map((cat) => (
                  <option key={cat.budgetCategoryId} value={cat.budgetCategoryId}>
                    {cat.name} {cat.allocatedAmount ? `(Current: ৳${money(cat.allocatedAmount)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Category
              </span>
              <span className="text-sm font-bold text-slate-900">{selectedCategory.name}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Monthly Budget Amount (৳)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for setting or adjusting this budget..."
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
            >
              {submitting ? 'Saving…' : isNew ? 'Set Budget' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BudgetLogModal({ row, year, month, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMonthlyBudgetLogs(row.budgetCategoryId, year, month)
      .then(setLogs)
      .catch(() => setError('Failed to load history'))
      .finally(() => setLoading(false));
  }, [row.budgetCategoryId, year, month]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={16} />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600">
            <History size={16} />
          </span>
          <h2 className="text-base font-bold text-slate-900">Budget Change History</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-10">
          {row.name} — {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 mb-4 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Loading history…</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No changes recorded yet for this period.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      log.action === 'Created'
                        ? 'bg-emerald-50 text-emerald-700'
                        : log.action === 'Deleted' || log.action === 'Rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock size={11} />
                    {new Date(log.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-700 pt-0.5">
                  {log.action === 'Deleted' ? (
                    <>
                      Removed allocation of <strong className="font-semibold">৳{money(log.previousAmount)}</strong>
                    </>
                  ) : log.action === 'Rejected' ? (
                    <>
                      Rejected a request of <strong className="font-semibold">৳{money(log.previousAmount)}</strong>
                    </>
                  ) : log.action === 'Created' ? (
                    <>
                      Set allocation to <strong className="font-semibold">৳{money(log.newAmount)}</strong>
                    </>
                  ) : (
                    <>
                      Changed allocation from <span className="font-semibold">৳{money(log.previousAmount)}</span> to{' '}
                      <strong className="font-semibold">৳{money(log.newAmount)}</strong>
                    </>
                  )}
                </p>
                {log.note && <p className="text-[11px] text-slate-500 italic">"{log.note}"</p>}
                <p className="text-[10px] text-slate-400 text-right">By {log.performedBy || 'Admin'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Review modal for a Pending (or previously Rejected) budget request — shows
// the actual preview payslip breakdown when the category is Salary, lets the
// admin adjust the approved figure, and offers Approve or Reject.
function BudgetRequestReviewModal({ row, year, month, onClose, onDone }) {
  const isSalary = (row.name || '').trim().toLowerCase() === 'salary';
  const requested = Number(row.requestedAmount) || 0;

  const [approvedAmount, setApprovedAmount] = useState(String(requested));
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState(null); // null | 'approve' | 'reject'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [payslips, setPaySlips] = useState([]);
  const [loadingSlips, setLoadingSlips] = useState(isSalary);

  useEffect(() => {
    if (!isSalary) return;
    let cancelled = false;
    setLoadingSlips(true);
    previewPaySlips(year, month)
      .then((data) => {
        if (!cancelled) setPaySlips(data || []);
      })
      .catch(() => {
        if (!cancelled) setPaySlips([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlips(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSalary, year, month]);

  const slipTotals = useMemo(() => {
    return payslips.reduce(
      (acc, s) => ({
        gross: acc.gross + (Number(s.grossSalary) || 0),
        advanceDeduction: acc.advanceDeduction + (Number(s.advanceDeduction) || 0),
        otherDeduction: acc.otherDeduction + (Number(s.otherDeduction) || 0),
        otherAddition: acc.otherAddition + (Number(s.otherAddition) || 0),
        net: acc.net + (Number(s.netSalary) || 0),
      }),
      { gross: 0, advanceDeduction: 0, otherDeduction: 0, otherAddition: 0, net: 0 }
    );
  }, [payslips]);

  const mismatch = isSalary && !loadingSlips && Math.abs(slipTotals.net - requested) > 0.5;

  async function handleApprove(e) {
    e.preventDefault();
    const amt = approvedAmount === '' ? requested : Number(approvedAmount);
    if (amt < 0) {
      setError('Approved amount cannot be negative');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await approveMonthlyBudget(row.monthlyBudgetId, { approvedAmount: amt, note });
      onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for rejecting this request');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await rejectMonthlyBudget(row.monthlyBudgetId, { reason: reason.trim() });
      onDone();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col p-6 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-1 pr-8">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600">
            <ClipboardCheck size={16} />
          </span>
          <h2 className="text-base font-bold text-slate-900">Review Budget Request</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4 ml-10">
          {row.name} — {MONTH_NAMES[month - 1]} {year}
        </p>

        <div className="overflow-y-auto space-y-4 pr-1 flex-1">
          {/* Request summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Requested Amount
              </span>
              <span className="text-xl font-extrabold text-slate-900">৳{money(requested)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Requested By
              </span>
              <span className="text-sm font-semibold text-slate-700">{row.requestedBy || 'Admin'}</span>
            </div>
          </div>

          {row.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs">
              <strong className="font-semibold">Previously rejected</strong> by {row.rejectedBy || 'Admin'}: {row.rejectionReason}
            </div>
          )}

          {/* Salary payslip preview breakdown */}
          {isSalary && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-slate-400" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Payslip Preview — {MONTH_NAMES[month - 1]} {year}
                </h3>
              </div>

              {loadingSlips ? (
                <div className="text-center py-8 text-slate-400 text-xs border border-slate-200/80 rounded-xl">
                  Loading payslip breakdown…
                </div>
              ) : payslips.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs border border-slate-200/80 rounded-xl">
                  No preview payslips found for this month.
                </div>
              ) : (
                <div className="border border-slate-200/80 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2.5 px-3">Employee</th>
                          <th className="py-2.5 px-3">Gross</th>
                          <th className="py-2.5 px-3">Advance Ded.</th>
                          <th className="py-2.5 px-3">Other Ded.</th>
                          <th className="py-2.5 px-3">Addition</th>
                          <th className="py-2.5 px-3 text-right">Net Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payslips.map((s, idx) => (
                          <tr key={s.id || s.employeeId || s.code || idx}>
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-slate-800">{s.name || s.employee?.name}</p>
                              <p className="text-[10px] text-slate-400">{s.code || s.employee?.code}</p>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">৳{money(s.grossSalary)}</td>
                            <td className="py-2.5 px-3 text-rose-500">
                              {s.advanceDeduction > 0 ? `-৳${money(s.advanceDeduction)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-rose-500">
                              {s.otherDeduction > 0 ? `-৳${money(s.otherDeduction)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600">
                              {s.otherAddition > 0 ? `+৳${money(s.otherAddition)}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ৳{money(s.netSalary)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t border-slate-200">
                          <td className="py-2.5 px-3 text-slate-700" colSpan={5}>
                            Total ({payslips.length} employee{payslips.length !== 1 ? 's' : ''})
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-900">
                            ৳{money(slipTotals.net)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {mismatch && (
                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-3 text-xs">
                  <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                  <span>
                    The current preview payslip total (৳{money(slipTotals.net)}) doesn't match the requested amount
                    (৳{money(requested)}) — deductions or employees may have changed since the request was submitted.
                    {' '}
                    <button
                      type="button"
                      onClick={() => setApprovedAmount(String(slipTotals.net))}
                      className="font-semibold underline underline-offset-2"
                    >
                      Use ৳{money(slipTotals.net)} instead
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Approve form */}
          {mode === 'approve' && (
            <form onSubmit={handleApprove} className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Approved Amount (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Defaults to the requested amount — adjust if it doesn't match the payslip total above.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Note <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Any remarks for this approval..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {submitting ? 'Approving…' : `Confirm Approve ৳${money(approvedAmount === '' ? requested : approvedAmount)}`}
                </button>
              </div>
            </form>
          )}

          {/* Reject form */}
          {mode === 'reject' && (
            <form onSubmit={handleReject} className="space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason for Rejection *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Deductions look incomplete, please re-generate payslips first..."
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {submitting ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          )}
        </div>

        {mode === null && (
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={() => setMode('reject')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold border border-rose-200/60 transition"
            >
              <XCircle size={14} />
              Reject
            </button>
            <button
              type="button"
              onClick={() => setMode('approve')}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            >
              <CheckCircle2 size={14} />
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OfficeBudgetPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({
    allocatedAmount: 0,
    spentAmount: 0,
    remainingAmount: 0,
    cashReceivedAmount: 0,
    generalCashReceived: 0,
    cashInHand: 0,
    pendingCash: 0,
  });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [editingRow, setEditingRow] = useState(null);
  const [viewingLogsRow, setViewingLogsRow] = useState(null);
  const [reviewingRow, setReviewingRow] = useState(null);
  const [isReceivingCash, setIsReceivingCash] = useState(false);
  const [isViewingReceipts, setIsViewingReceipts] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMonthlyBudgetSummary(year, month);
      setRows(data.rows || []);
      setTotals(
        data.totals || {
          allocatedAmount: 0,
          spentAmount: 0,
          remainingAmount: 0,
          cashReceivedAmount: 0,
          generalCashReceived: 0,
          cashInHand: 0,
          pendingCash: 0,
        }
      );
    } catch (err) {
      console.error('Failed to load budget summary', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  async function handleDelete(row) {
    if (!row.monthlyBudgetId) return;
    if (!window.confirm(`Remove the ৳${money(row.allocatedAmount)} allocation for ${row.name}?`)) return;
    setDeletingId(row.monthlyBudgetId);
    try {
      await deleteMonthlyBudget(row.monthlyBudgetId);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete allocation');
    } finally {
      setDeletingId(null);
    }
  }

  function toggleExpanded(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(term));
  }, [rows, search]);

  const summaryTotals = useMemo(() => {
    let calcAllocated = 0;
    let calcSpent = 0;

    rows.forEach((r) => {
      const rAlloc = Number(r.allocatedAmount) || 0;
      const subSpent = (r.subcategories || []).reduce(
        (sum, s) => sum + (Number(s.spentAmount) || 0),
        0
      );
      const rSpent = Number(r.spentAmount) || subSpent || 0;
      calcAllocated += rAlloc;
      calcSpent += rSpent;
    });

    const finalAllocated = totals.allocatedAmount > 0 ? Number(totals.allocatedAmount) : calcAllocated;
    const finalSpent = totals.spentAmount > 0 ? Number(totals.spentAmount) : calcSpent;
    const finalCashReceived = Number(totals.cashReceivedAmount) || 0;
    const finalCashInHand = finalCashReceived - finalSpent;

    return {
      allocatedAmount: finalAllocated,
      spentAmount: finalSpent,
      remainingAmount: finalAllocated - finalSpent,
      cashReceivedAmount: finalCashReceived,
      generalCashReceived: Number(totals.generalCashReceived) || 0,
      cashInHand: finalCashInHand,
      pendingCash: Math.max(0, finalAllocated - finalCashReceived),
    };
  }, [rows, totals]);

  const totalBurnRate =
    summaryTotals.allocatedAmount > 0
      ? Math.min(100, (summaryTotals.spentAmount / summaryTotals.allocatedAmount) * 100)
      : 0;

  const allWithinBudget = rows.every((r) => {
    const allocated = Number(r.allocatedAmount) || 0;
    const spent = Number(r.spentAmount) || 0;
    return allocated - spent >= 0;
  });

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      <Topbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Office Budget' },
          ]}
        />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Office Budget
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              Track allocated limits, cash received in installments, and actual expenses
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsViewingReceipts(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <Coins size={15} className="text-emerald-600" />
              Cash Inflow Log
            </button>

            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-expense-list')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <FileText size={15} className="text-slate-400" />
              Expense Ledger
            </button>

            <button
              type="button"
              onClick={() => navigate('/accounts-module/budget-categories')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
            >
              <Settings size={15} />
              Manage Categories
            </button>
          </div>
        </div>

        {/* Budget Month Selector Bar with Receive Cash CTA */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:px-6 sm:py-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Budget Month
              </p>
              <p className="text-sm font-bold text-slate-900">
                {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="relative inline-flex items-center border border-slate-200 rounded-lg px-3 py-1.5 bg-white shadow-2xs">
              <select
                value={`${month}-${year}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-');
                  setMonth(Number(m));
                  setYear(Number(y));
                }}
                className="appearance-none bg-transparent text-xs font-bold text-slate-800 pr-5 focus:outline-none cursor-pointer"
              >
                {[-1, 0, 1].map((yearOffset) => {
                  const targetYear = now.getFullYear() + yearOffset;
                  return MONTH_NAMES.map((mName, mIdx) => (
                    <option key={`${mIdx + 1}-${targetYear}`} value={`${mIdx + 1}-${targetYear}`}>
                      {mName} {targetYear}
                    </option>
                  ));
                })}
              </select>
              <ChevronDown size={13} className="text-slate-400 absolute right-2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ChevronRight size={16} />
            </button>

            {/* Quick Receive Cash Action */}
            <button
              type="button"
              onClick={() => setIsReceivingCash(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition ml-1 cursor-pointer"
            >
              <ArrowDownLeft size={14} />
              Receive Cash
            </button>

            <button
              type="button"
              onClick={() => setEditingRow({})}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <Plus size={14} />
              Set Budget
            </button>
          </div>
        </div>

        {/* 4 Metric Cards for Real-World Cash Flow & Budget Control */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL ALLOCATED BUDGET */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Wallet size={15} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Budget
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                ৳{money(summaryTotals.allocatedAmount)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Approved limit
              </span>
            </div>
          </div>

          {/* Card 2: CASH RECEIVED (TRANCHES) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Coins size={15} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cash Received
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReceivingCash(true)}
                className="text-[10px] font-bold text-emerald-600 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 tracking-tight">
                ৳{money(summaryTotals.cashReceivedAmount)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {summaryTotals.pendingCash > 0
                  ? `৳${money(summaryTotals.pendingCash)} pending`
                  : 'Fully disbursed'}
              </span>
            </div>
            {summaryTotals.generalCashReceived > 0 && (
              <p className="text-[10px] text-slate-400 mt-1.5">
                ৳{money(summaryTotals.generalCashReceived)} untagged (General Office Fund)
              </p>
            )}
          </div>

          {/* Card 3: TOTAL SPENT */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={15} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Spent
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <span className="text-xl sm:text-2xl font-extrabold text-blue-600 tracking-tight">
                ৳{money(summaryTotals.spentAmount)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {totalBurnRate.toFixed(0)}% of budget
              </span>
            </div>
          </div>

          {/* Card 4: CASH IN HAND (RECEIVED - SPENT) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    summaryTotals.cashInHand < 0
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <BadgeDollarSign size={15} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cash in Hand
                </span>
              </div>

              {summaryTotals.cashInHand < 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 ring-1 ring-rose-500/20">
                  Deficit
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20">
                  Available
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between mt-3">
              <span
                className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                  summaryTotals.cashInHand < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ৳{money(summaryTotals.cashInHand)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Received − Spent
              </span>
            </div>
          </div>
        </div>

        {/* Category Allocations Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 sm:px-6 sm:py-4.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Category Allocations</h2>
              <p className="text-xs text-slate-400 font-normal">
                {rows.length} budget heads defined for this period
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search categories..."
                  className="w-48 sm:w-64 h-9 pl-8 pr-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                />
              </div>

              <button
                type="button"
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 transition"
                title="Filters"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6 min-w-[220px]">Category</th>
                  <th className="py-3.5 px-4 min-w-[110px]">Budget</th>
                  <th className="py-3.5 px-4 min-w-[120px]">Cash Received</th>
                  <th className="py-3.5 px-4 min-w-[110px]">Spent</th>
                  <th className="py-3.5 px-4 min-w-[110px]">Remaining</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Utilization</th>
                  <th className="py-3.5 pr-6 pl-2 min-w-[220px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400 text-xs">
                      Loading budget entries...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400 text-xs">
                      No categories found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const subSpentTotal = (row.subcategories || []).reduce(
                      (acc, s) => acc + (Number(s.spentAmount) || 0),
                      0
                    );
                    const allocated = Number(row.allocatedAmount) || 0;
                    const spent = Number(row.spentAmount) || subSpentTotal || 0;
                    const cashReceived = Number(row.cashReceivedAmount) || 0;
                    const remaining = allocated - spent;
                    const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
                    const overBudget = remaining < 0;
                    const hasSubs = row.subcategories && row.subcategories.length > 0;
                    const isOpen = !!expanded[row.budgetCategoryId];

                    let statusLabel = 'On track';
                    let statusColor = 'text-emerald-600';
                    let barColor = 'bg-emerald-500';

                    if (allocated === 0 && spent === 0) {
                      statusLabel = 'Not allocated';
                      statusColor = 'text-slate-400';
                      barColor = 'bg-slate-200';
                    } else if (spent === 0) {
                      statusLabel = 'Unspent';
                      statusColor = 'text-slate-400';
                      barColor = 'bg-slate-200';
                    } else if (overBudget) {
                      statusLabel = 'Over budget';
                      statusColor = 'text-rose-600';
                      barColor = 'bg-rose-500';
                    } else if (pct > 80) {
                      statusLabel = 'High spend';
                      statusColor = 'text-amber-600';
                      barColor = 'bg-amber-500';
                    }

                    return (
                      <Fragment key={row.budgetCategoryId}>
                        <tr className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {hasSubs ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(row.budgetCategoryId)}
                                  className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                                >
                                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                              ) : (
                                <span className="w-5 shrink-0" />
                              )}

                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Folder size={15} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                    {row.name}
                                  </p>
                                  {row.status === 'Pending' && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                      Pending Approval
                                    </span>
                                  )}
                                  {row.status === 'Rejected' && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                                      Rejected
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                                  {row.description || 'General office operations'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4 font-bold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                            ৳{money(allocated)}
                          </td>

                          <td className="py-4 px-4 font-semibold text-emerald-600 text-xs sm:text-sm whitespace-nowrap">
                            {cashReceived > 0 ? `৳${money(cashReceived)}` : <span className="text-slate-300 font-normal">—</span>}
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                            ৳{money(spent)}
                          </td>

                          <td className="py-4 px-4 font-bold text-xs sm:text-sm whitespace-nowrap">
                            <span className={overBudget ? 'text-rose-600' : 'text-emerald-600'}>
                              ৳{money(remaining)}
                            </span>
                          </td>

                          <td className="py-4 px-4">
                            <div className="w-full max-w-[130px]">
                              <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                                <span className={statusColor}>{statusLabel}</span>
                                <span className="font-bold text-slate-700">
                                  {pct.toFixed(pct % 1 === 0 ? 0 : 1)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-4 pr-6 pl-2 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5 shrink-0">
                              {(row.status === 'Pending' || row.status === 'Rejected') && (
                                <button
                                  type="button"
                                  onClick={() => setReviewingRow(row)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer shadow-2xs ${
                                    row.status === 'Pending'
                                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                                      : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  }`}
                                  title={`Requested: ৳${money(row.requestedAmount)}`}
                                >
                                  <ClipboardCheck size={12} />
                                  {row.status === 'Pending' ? `Review ৳${money(row.requestedAmount)}` : 'Reconsider'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setViewingLogsRow(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition whitespace-nowrap"
                                title="View change history"
                              >
                                <Eye size={13} />
                                View
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingRow(row)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition whitespace-nowrap"
                              >
                                <Pencil size={12} />
                                {row.monthlyBudgetId ? 'Edit' : 'Set Budget'}
                              </button>

                              {row.monthlyBudgetId ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  disabled={deletingId === row.monthlyBudgetId}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60 shadow-2xs transition whitespace-nowrap cursor-pointer"
                                  title="Remove budget allocation"
                                >
                                  <Trash2 size={12} />
                                  {deletingId === row.monthlyBudgetId ? 'Deleting…' : 'Delete'}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100/80 text-slate-400 border border-slate-200/60 cursor-not-allowed transition whitespace-nowrap"
                                  title="No budget allocated to delete for this month"
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isOpen &&
                          hasSubs &&
                          row.subcategories.map((sub) => {
                            const subAlloc = Number(sub.allocatedAmount) || 0;
                            const subSp = Number(sub.spentAmount) || 0;
                            const subRem = subAlloc > 0 ? subAlloc - subSp : null;

                            return (
                              <tr key={sub.budgetCategoryId} className="bg-slate-50/50">
                                <td className="py-2.5 px-6 pl-14 text-xs text-slate-600 flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  {sub.name}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">
                                  {subAlloc > 0 ? `৳${money(subAlloc)}` : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-400 font-mono">—</td>
                                <td className="py-2.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                  ৳{money(subSp)}
                                </td>
                                <td className="py-2.5 px-4 text-xs font-medium whitespace-nowrap">
                                  {subRem !== null ? (
                                    <span className={subRem < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                      ৳{money(subRem)}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-400 font-mono">—</td>
                                <td className="py-2.5 pr-6 pl-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setEditingRow(sub)}
                                    className="text-[11px] font-semibold text-blue-600 hover:underline px-2 py-1"
                                  >
                                    {sub.monthlyBudgetId ? 'Edit' : 'Set'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2
                size={15}
                className={allWithinBudget ? 'text-emerald-500' : 'text-amber-500'}
              />
              <span>
                {allWithinBudget
                  ? 'All category budgets are currently within allocated limits.'
                  : 'One or more category budgets have exceeded their allocated limits.'}
              </span>
            </div>
            <span className="text-slate-400">
              Showing {filteredRows.length} of {rows.length} categories
            </span>
          </div>
        </div>
      </main>

      {/* Receive Cash Modal */}
      {isReceivingCash && (
        <ReceiveCashModal
          rows={rows}
          year={year}
          month={month}
          onClose={() => setIsReceivingCash(false)}
          onSaved={load}
        />
      )}

      {/* Cash Inflow Receipts History Modal */}
      {isViewingReceipts && (
        <CashReceiptsListModal
          year={year}
          month={month}
          rows={rows}
          onClose={() => setIsViewingReceipts(false)}
          onReceiptUpdated={load}
        />
      )}

      {/* Set / Edit Budget Modal */}
      {editingRow && (
        <EditBudgetModal
          row={editingRow}
          rows={rows}
          year={year}
          month={month}
          onClose={() => setEditingRow(null)}
          onSaved={load}
        />
      )}

      {/* Budget History Modal */}
      {viewingLogsRow && (
        <BudgetLogModal
          row={viewingLogsRow}
          year={year}
          month={month}
          onClose={() => setViewingLogsRow(null)}
        />
      )}

      {/* Review (Approve / Reject) Modal */}
      {reviewingRow && (
        <BudgetRequestReviewModal
          row={reviewingRow}
          year={year}
          month={month}
          onClose={() => setReviewingRow(null)}
          onDone={load}
        />
      )}
    </div>
  );
}