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
  FileText,
  Pencil,
  Eye,
  Trash2,
  X,
  History,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Folder,
  ArrowDownLeft,
  Coins,
  BadgeDollarSign,
  Users,
  TriangleAlert,
  Download,
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

// Export CSV Report Helper
function exportBudgetReport({ year, month, rows, summaryTotals }) {
  const monthName = MONTH_NAMES[month - 1];
  const dateStr = new Date().toLocaleString('en-GB');

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [
    ['OFFICE BUDGET & CASH INFLOW REPORT'],
    [`Period: ${monthName} ${year}`, `Generated At: ${dateStr}`],
    [],
    ['EXECUTIVE SUMMARY'],
    ['Metric', 'Amount (BDT)', 'Notes'],
    ['Total Budget Allocation', summaryTotals.allocatedAmount, 'Approved category limits'],
    ['Total Cash Received (Tranches)', summaryTotals.cashReceivedAmount, 'Disbursed to Accounts'],
    ['Untagged General Cash', summaryTotals.generalCashReceived, 'Not tied to specific head'],
    ['Total Spent', summaryTotals.spentAmount, 'Actual recorded expenses'],
    ['Cash in Hand (Net Liquidity)', summaryTotals.cashInHand, 'Cash Received - Spent'],
    ['Pending Cash Disbursement', summaryTotals.pendingCash, 'Budget - Cash Received'],
    [],
    ['CATEGORY ALLOCATIONS BREAKDOWN'],
    [
      'Category Name',
      'Type',
      'Status',
      'Allocated Budget (BDT)',
      'Cash Received (BDT)',
      'Spent (BDT)',
      'Cash Remaining (BDT)',
      'Budget Remaining (BDT)',
      'Burn Rate (%)',
      'Description / Notes',
    ],
  ];

  rows.forEach((r) => {
    const subSpentTotal = (r.subcategories || []).reduce(
      (acc, s) => acc + (Number(s.spentAmount) || 0),
      0
    );
    const allocated = Number(r.allocatedAmount) || 0;
    const spent = Number(r.spentAmount) || subSpentTotal || 0;
    const cashReceived = Number(r.cashReceivedAmount) || 0;
    const budgetRemaining = allocated - spent;
    const cashRemaining = cashReceived - spent;
    const pct = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : '0';

    lines.push([
      r.name,
      'Main Category',
      r.status || 'Active',
      allocated,
      cashReceived,
      spent,
      cashRemaining,
      budgetRemaining,
      `${pct}%`,
      r.description || '',
    ]);

    if (r.subcategories && r.subcategories.length > 0) {
      r.subcategories.forEach((sub) => {
        const subAlloc = Number(sub.allocatedAmount) || 0;
        const subSp = Number(sub.spentAmount) || 0;
        const subRem = subAlloc > 0 ? subAlloc - subSp : 0;
        const subPct = subAlloc > 0 ? ((subSp / subAlloc) * 100).toFixed(1) : '0';

        lines.push([
          `   - ${sub.name}`,
          'Subcategory',
          sub.status || 'Active',
          subAlloc,
          '-',
          subSp,
          '-',
          subRem,
          `${subPct}%`,
          sub.description || '',
        ]);
      });
    }
  });

  const csvContent =
    '\uFEFF' + lines.map((row) => row.map(escapeCsv).join(',')).join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Office_Budget_Report_${monthName}_${year}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 sm:p-5 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-2 mb-0.5">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft size={14} />
          </div>
          <h2 className="text-sm font-bold text-slate-900">
            {isEdit ? 'Edit Cash Receipt' : 'Record Cash Inflow'}
          </h2>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 ml-8">
          For {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-2.5 mb-3 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cash Amount (৳) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 20000"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Date Received *
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Received From
              </label>
              <input
                type="text"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="e.g. MD / Bank"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="Cash">Cash in Hand</option>
                <option value="Cheque">Cheque</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Banking">bKash / Nagad</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ref / Cheque #
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. CHQ-98124"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Tag to Category
              </label>
              <select
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">General Fund (All Heads)</option>
                {rows.map((cat) => (
                  <option key={cat.budgetCategoryId} value={cat.budgetCategoryId}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Note / Remarks
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Installment notes..."
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 transition"
            >
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Record Receipt'}
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
    rows.forEach((r) => {
      map[r.budgetCategoryId] = r.name;
    });
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-5 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={14} />
        </button>

        <div className="flex items-center justify-between mb-3 pr-6">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins size={14} />
              </span>
              <h2 className="text-sm font-bold text-slate-900">Cash Inflow Log</h2>
            </div>
            <p className="text-[11px] text-slate-500 ml-7.5">
              Disbursed for {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingNew(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition"
          >
            <Plus size={12} />
            Receive Cash
          </button>
        </div>

        {/* Compact Summary Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between mb-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Cash Received
            </span>
            <span className="text-base font-extrabold text-emerald-600">
              ৳{money(totalReceiptsAmount)}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-500">
            {receipts.length} installment{receipts.length !== 1 ? 's' : ''} logged
          </span>
        </div>

        {/* Receipts List */}
        <div className="overflow-y-auto space-y-2 pr-1 flex-1">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">Loading cash receipts…</div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No cash receipts recorded yet. Click "+ Receive Cash" above.
            </div>
          ) : (
            receipts.map((rcpt) => (
              <div
                key={rcpt.id}
                className="border border-slate-200/70 hover:border-slate-300 rounded-lg p-2.5 flex items-center justify-between gap-2.5 bg-white transition"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      ৳{money(rcpt.amount)}
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                      {rcpt.paymentMethod}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                        rcpt.budgetCategoryId
                          ? 'bg-blue-50 text-blue-700 border-blue-200/50'
                          : 'bg-slate-100 text-slate-600 border-slate-200/50'
                      }`}
                    >
                      {rcpt.budgetCategoryId
                        ? categoryNameById[rcpt.budgetCategoryId] || 'Category'
                        : 'General Fund'}
                    </span>
                    {rcpt.referenceNo && (
                      <span className="text-[10px] font-mono text-slate-400">
                        Ref: {rcpt.referenceNo}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 mt-0.5">
                    From: <span className="font-semibold text-slate-700">{rcpt.receivedFrom || 'Management'}</span>
                    {' • '}
                    <span className="text-slate-400">{rcpt.receivedDate}</span>
                  </p>

                  {rcpt.note && (
                    <p className="text-[10px] text-slate-400 italic truncate mt-0.5">"{rcpt.note}"</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingReceipt(rcpt)}
                    className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rcpt.id, rcpt.amount)}
                    className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 sm:p-5 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
        >
          <X size={14} />
        </button>
        <h2 className="text-sm font-bold text-slate-900 mb-0.5">
          {isNew ? 'Set Budget Allocation' : 'Edit Budget Allocation'}
        </h2>
        <p className="text-[11px] text-slate-500 mb-3">
          For {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-2.5 mb-3 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!row?.budgetCategoryId ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Budget Category
              </label>
              <select
                value={selectedCatId}
                onChange={handleCategoryChange}
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                {rows.map((cat) => (
                  <option key={cat.budgetCategoryId} value={cat.budgetCategoryId}>
                    {cat.name} {cat.allocatedAmount ? `(৳${money(cat.allocatedAmount)})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Category
              </span>
              <span className="text-xs font-bold text-slate-900">{selectedCategory.name}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Monthly Budget Amount (৳)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Note <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reason for adjustment..."
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-50 transition"
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col p-4 sm:p-5 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={14} />
        </button>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <History size={14} />
          </span>
          <h2 className="text-sm font-bold text-slate-900">Change History</h2>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 ml-7.5">
          {row.name} — {MONTH_NAMES[month - 1]} {year}
        </p>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-2.5 mb-3 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-8 text-slate-400 text-xs">Loading history…</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No changes recorded for this period.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border border-slate-200/70 rounded-lg p-2.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                      log.action === 'Created'
                        ? 'bg-emerald-50 text-emerald-700'
                        : log.action === 'Deleted' || log.action === 'Rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {log.action}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} />
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
                      Changed from <span className="font-semibold">৳{money(log.previousAmount)}</span> to{' '}
                      <strong className="font-semibold">৳{money(log.newAmount)}</strong>
                    </>
                  )}
                </p>
                {log.note && <p className="text-[10px] text-slate-500 italic">"{log.note}"</p>}
                <p className="text-[9px] text-slate-400 text-right">By {log.performedBy || 'Admin'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Review modal for a Pending budget request
function BudgetRequestReviewModal({ row, year, month, onClose, onDone }) {
  const isSalary = (row.name || '').trim().toLowerCase() === 'salary';
  const requested = Number(row.requestedAmount) || 0;

  const [approvedAmount, setApprovedAmount] = useState(String(requested));
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState(null);
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
      setError('Please provide a reason for rejection');
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col p-4 sm:p-5 relative border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X size={14} />
        </button>

        <div className="flex items-center gap-1.5 mb-0.5 pr-6">
          <span className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <ClipboardCheck size={14} />
          </span>
          <h2 className="text-sm font-bold text-slate-900">Review Budget Request</h2>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 ml-7.5">
          {row.name} — {MONTH_NAMES[month - 1]} {year}
        </p>

        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Requested Amount
              </span>
              <span className="text-lg font-extrabold text-slate-900">৳{money(requested)}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                Requested By
              </span>
              <span className="text-xs font-semibold text-slate-700">{row.requestedBy || 'Admin'}</span>
            </div>
          </div>

          {row.rejectionReason && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-2.5 text-xs">
              <strong className="font-semibold">Previously rejected</strong> by {row.rejectedBy || 'Admin'}: {row.rejectionReason}
            </div>
          )}

          {isSalary && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Users size={12} className="text-slate-400" />
                <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Payslip Preview Breakdown
                </h3>
              </div>

              {loadingSlips ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-slate-200/70 rounded-lg">
                  Loading payslips…
                </div>
              ) : payslips.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-slate-200/70 rounded-lg">
                  No preview payslips found.
                </div>
              ) : (
                <div className="border border-slate-200/70 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-2.5">Employee</th>
                          <th className="py-2 px-2">Gross</th>
                          <th className="py-2 px-2">Advance</th>
                          <th className="py-2 px-2">Net Salary</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payslips.map((s, idx) => (
                          <tr key={s.id || s.employeeId || s.code || idx}>
                            <td className="py-1.5 px-2.5">
                              <p className="font-medium text-slate-800">{s.name || s.employee?.name}</p>
                              <p className="text-[9px] text-slate-400">{s.code || s.employee?.code}</p>
                            </td>
                            <td className="py-1.5 px-2 text-slate-600">৳{money(s.grossSalary)}</td>
                            <td className="py-1.5 px-2 text-rose-500">
                              {s.advanceDeduction > 0 ? `-৳${money(s.advanceDeduction)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 font-bold text-slate-900">
                              ৳{money(s.netSalary)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                          <td className="py-2 px-2.5 text-slate-700" colSpan={3}>
                            Total ({payslips.length})
                          </td>
                          <td className="py-2 px-2 text-slate-900">
                            ৳{money(slipTotals.net)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {mismatch && (
                <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 text-xs">
                  <TriangleAlert size={12} className="shrink-0 mt-0.5" />
                  <span>
                    Current preview (৳{money(slipTotals.net)}) differs from requested (৳{money(requested)}).{' '}
                    <button
                      type="button"
                      onClick={() => setApprovedAmount(String(slipTotals.net))}
                      className="font-semibold underline"
                    >
                      Use ৳{money(slipTotals.net)}
                    </button>
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-2.5 text-xs font-medium">
              {error}
            </div>
          )}

          {mode === 'approve' && (
            <form onSubmit={handleApprove} className="space-y-2.5 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Approved Amount (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Note <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Approval note..."
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                >
                  {submitting ? 'Approving…' : `Confirm ৳${money(approvedAmount === '' ? requested : approvedAmount)}`}
                </button>
              </div>
            </form>
          )}

          {mode === 'reject' && (
            <form onSubmit={handleReject} className="space-y-2.5 border-t border-slate-100 pt-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Reason..."
                  className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:rose-500/20 focus:border-rose-500 resize-none"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs"
                >
                  {submitting ? 'Rejecting…' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          )}
        </div>

        {mode === null && (
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={() => setMode('reject')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold border border-rose-200/50"
            >
              <XCircle size={13} />
              Reject
            </button>
            <button
              type="button"
              onClick={() => setMode('approve')}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
            >
              <CheckCircle2 size={13} />
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

      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-3.5">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Accounts Module', to: '/dashboard' },
            { label: 'Office Budget' },
          ]}
        />

        {/* Compact Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Office Budget
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Monthly limits, cash flow tranches, and actual expenses
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => exportBudgetReport({ year, month, rows, summaryTotals })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
              title="Download CSV report of current view"
            >
              <Download size={13} className="text-blue-600" />
              Download Report
            </button>

            <button
              type="button"
              onClick={() => setIsViewingReceipts(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <Coins size={13} className="text-emerald-600" />
              Cash Inflow Log
            </button>

            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-expense-list')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/90 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
            >
              <FileText size={13} className="text-slate-400" />
              Expense Ledger
            </button>

            <button
              type="button"
              onClick={() => navigate('/accounts-module/budget-categories')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
            >
              <Settings size={13} />
              Categories
            </button>
          </div>
        </div>

        {/* Compact Budget Month Selector Bar */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 sm:px-4 sm:py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={15} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Budget Month
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handlePrevMonth}
              title="Previous Month"
              className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ChevronLeft size={14} />
            </button>

            <div className="relative inline-flex items-center border border-slate-200 rounded-md px-2.5 py-1 bg-white shadow-2xs">
              <select
                value={`${month}-${year}`}
                onChange={(e) => {
                  const [m, y] = e.target.value.split('-');
                  setMonth(Number(m));
                  setYear(Number(y));
                }}
                className="appearance-none bg-transparent text-xs font-semibold text-slate-800 pr-4 focus:outline-none cursor-pointer"
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
              <ChevronDown size={11} className="text-slate-400 absolute right-1.5 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              title="Next Month"
              className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
            >
              <ChevronRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => setIsReceivingCash(true)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition ml-1"
            >
              <ArrowDownLeft size={13} />
              Receive Cash
            </button>

            <button
              type="button"
              onClick={() => setEditingRow({})}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
            >
              <Plus size={13} />
              Set Budget
            </button>
          </div>
        </div>

        {/* Compact KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: TOTAL ALLOCATED BUDGET */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                <Wallet size={13} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Budget
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                ৳{money(summaryTotals.allocatedAmount)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Approved limit
              </span>
            </div>
          </div>

          {/* Card 2: CASH RECEIVED (TRANCHES) */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Coins size={13} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cash Received
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsReceivingCash(true)}
                className="text-[10px] font-semibold text-emerald-600 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-bold text-emerald-600 tracking-tight">
                ৳{money(summaryTotals.cashReceivedAmount)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {summaryTotals.pendingCash > 0
                  ? `৳${money(summaryTotals.pendingCash)} pending`
                  : 'Fully disbursed'}
              </span>
            </div>
          </div>

          {/* Card 3: TOTAL SPENT */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={13} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total Spent
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-lg sm:text-xl font-bold text-blue-600 tracking-tight">
                ৳{money(summaryTotals.spentAmount)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {totalBurnRate.toFixed(0)}% of budget
              </span>
            </div>
          </div>

          {/* Card 4: CASH IN HAND */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    summaryTotals.cashInHand < 0
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <BadgeDollarSign size={13} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cash in Hand
                </span>
              </div>

              {summaryTotals.cashInHand < 0 ? (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-50 text-rose-600 ring-1 ring-rose-500/20">
                  Deficit
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20">
                  Available
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <span
                className={`text-lg sm:text-xl font-bold tracking-tight ${
                  summaryTotals.cashInHand < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ৳{money(summaryTotals.cashInHand)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Received − Spent
              </span>
            </div>
          </div>
        </div>

        {/* Compact Table Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-3 sm:px-4 sm:py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Category Allocations</h2>
              <p className="text-[11px] text-slate-400">
                {rows.length} budget heads defined for this period
              </p>
            </div>

            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full sm:w-56 h-8 pl-7.5 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-4 min-w-[200px]">Category</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Budget</th>
                  <th className="py-2.5 px-3 min-w-[100px]">Cash Received</th>
                  <th className="py-2.5 px-3 min-w-[95px]">Spent</th>
                  <th className="py-2.5 px-3 min-w-[105px]">Cash Rem.</th>
                  <th className="py-2.5 px-3 min-w-[105px]">Budget Rem.</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Utilization</th>
                  <th className="py-2.5 pr-4 pl-2 min-w-[170px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                      Loading budget entries...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
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
                    const budgetRemaining = allocated - spent;
                    const cashRemaining = cashReceived - spent;
                    const pct = allocated > 0 ? (spent / allocated) * 100 : 0;
                    const overBudget = budgetRemaining < 0;
                    const hasSubs = row.subcategories && row.subcategories.length > 0;
                    const isOpen = !!expanded[row.budgetCategoryId];

                    let statusLabel = 'On track';
                    let statusColor = 'text-emerald-600';
                    let barColor = 'bg-emerald-500';

                    if (allocated === 0 && spent === 0) {
                      statusLabel = 'Unallocated';
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
                        <tr className="hover:bg-slate-50/60 transition">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2">
                              {hasSubs ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(row.budgetCategoryId)}
                                  className="w-4 h-4 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 transition shrink-0"
                                >
                                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                </button>
                              ) : (
                                <span className="w-4 shrink-0" />
                              )}

                              <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Folder size={13} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {row.name}
                                  </p>
                                  {row.status === 'Pending' && (
                                    <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
                                      Pending
                                    </span>
                                  )}
                                  {row.status === 'Rejected' && (
                                    <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                                      Rejected
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {row.description || 'General office operations'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            ৳{money(allocated)}
                          </td>

                          <td className="py-2.5 px-3 font-medium text-emerald-600 whitespace-nowrap">
                            {cashReceived > 0 ? `৳${money(cashReceived)}` : <span className="text-slate-300 font-normal">—</span>}
                          </td>

                          <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                            ৳{money(spent)}
                          </td>

                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            {cashReceived > 0 || spent > 0 ? (
                              <span className={cashRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                ৳{money(cashRemaining)}
                              </span>
                            ) : (
                              <span className="text-slate-300 font-normal">—</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <span className={budgetRemaining < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              ৳{money(budgetRemaining)}
                            </span>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="w-full max-w-[110px]">
                              <div className="flex items-center justify-between text-[10px] mb-1 font-medium">
                                <span className={statusColor}>{statusLabel}</span>
                                <span className="font-bold text-slate-700">
                                  {pct.toFixed(pct % 1 === 0 ? 0 : 1)}%
                                </span>
                              </div>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 pr-4 pl-2 text-right">
                            <div className="inline-flex items-center justify-end gap-1 shrink-0">
                              {(row.status === 'Pending' || row.status === 'Rejected') && (
                                <button
                                  type="button"
                                  onClick={() => setReviewingRow(row)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition whitespace-nowrap shadow-2xs ${
                                    row.status === 'Pending'
                                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                                      : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                  }`}
                                  title={`Requested: ৳${money(row.requestedAmount)}`}
                                >
                                  <ClipboardCheck size={11} />
                                  {row.status === 'Pending' ? `Review` : 'Reconsider'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setViewingLogsRow(row)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition whitespace-nowrap"
                                title="View change history"
                              >
                                <Eye size={11} />
                                Log
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingRow(row)}
                                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition whitespace-nowrap"
                              >
                                <Pencil size={11} />
                                {row.monthlyBudgetId ? 'Edit' : 'Set'}
                              </button>

                              {row.monthlyBudgetId ? (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(row)}
                                  disabled={deletingId === row.monthlyBudgetId}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-[11px] font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition whitespace-nowrap"
                                  title="Remove allocation"
                                >
                                  <Trash2 size={11} />
                                  {deletingId === row.monthlyBudgetId ? '…' : 'Del'}
                                </button>
                              ) : null}
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
                                <td className="py-1.5 px-4 pl-12 text-[11px] text-slate-600 flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                                  {sub.name}
                                </td>
                                <td className="py-1.5 px-3 text-[11px] text-slate-600 font-medium whitespace-nowrap">
                                  {subAlloc > 0 ? `৳${money(subAlloc)}` : '—'}
                                </td>
                                <td className="py-1.5 px-3 text-[11px] text-slate-300 font-mono">—</td>
                                <td className="py-1.5 px-3 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                                  ৳{money(subSp)}
                                </td>
                                <td className="py-1.5 px-3 text-[11px] text-slate-300 font-mono">—</td>
                                <td className="py-1.5 px-3 text-[11px] font-medium whitespace-nowrap">
                                  {subRem !== null ? (
                                    <span className={subRem < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                      ৳{money(subRem)}
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="py-1.5 px-3 text-[11px] text-slate-300 font-mono">—</td>
                                <td className="py-1.5 pr-4 pl-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setEditingRow(sub)}
                                    className="text-[10px] font-semibold text-blue-600 hover:underline px-1.5 py-0.5"
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

          <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <CheckCircle2
                size={13}
                className={allWithinBudget ? 'text-emerald-500' : 'text-amber-500'}
              />
              <span>
                {allWithinBudget
                  ? 'All categories are currently within allocated limits.'
                  : 'One or more categories have exceeded their allocated limits.'}
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

      {/* Review Modal */}
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