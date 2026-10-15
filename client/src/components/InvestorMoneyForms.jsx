// client/src/components/InvestorMoneyForms.jsx
// Shared by the investment detail page and the investor profile:
//  - PaymentModal       : pay the investor (payout) or record money received from them
//  - PaymentLinesView   : shows the Cash / Bank / Cheque lines of a saved payment
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getInvestorBankAccounts,
  getCompanyBanks,
  getInvestmentMoney,
  recordInvestorPayment,
  recordInvestmentReceipt,
  downloadPaymentAttachment,
} from '../api/investor';

/* ------------------------------ Helpers ------------------------------ */

export const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const errMsg = (err) => err.response?.data?.message || err.message || 'Something went wrong.';

const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

const maskAccount = (n) => {
  const s = String(n || '');
  return s.length > 4 ? `••${s.slice(-4)}` : s;
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition hover:border-slate-300 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10';

const btnPrimary =
  'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-500/25 transition hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50';

const btnGhost =
  'inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300';

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}

let keySeq = 0;
const newLine = (method = 'Bank') => ({
  key: `line-${++keySeq}`,
  method,
  amount: '',
  bankAccountId: '',
  investorBankAccountId: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  branch: '',
  referenceNo: '',
  chequeNo: '',
  chequeDate: '',
  saveBank: false,
  file: null,
});

const toPayload = (l) => ({
  method: l.method,
  amount: l.amount,
  bankAccountId: l.bankAccountId,
  investorBankAccountId: l.investorBankAccountId,
  bankName: l.bankName,
  accountName: l.accountName,
  accountNumber: l.accountNumber,
  branch: l.branch,
  referenceNo: l.referenceNo,
  chequeNo: l.chequeNo,
  chequeDate: l.chequeDate,
  saveBank: l.saveBank,
});

const METHOD_LABELS = { Cash: '💵 Cash', Bank: '🏦 Bank transfer', Cheque: '📝 Cheque' };

/* ------------------------- Saved payment lines ------------------------- */

async function openAttachment(line) {
  try {
    const res = await downloadPaymentAttachment(line.id);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = line.attachmentName || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    alert('Could not download this attachment. It may have been removed from the server.');
  }
}

export function PaymentLinesView({ lines = [], fallbackMethod, fallbackRef }) {
  if (!lines.length) {
    return (
      <span className="text-xs text-slate-600">
        {fallbackMethod || '—'}
        {fallbackRef ? <span className="block font-mono text-slate-400">{fallbackRef}</span> : null}
      </span>
    );
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((l) => (
        <li key={l.id} className="text-xs text-slate-700">
          <span className="font-semibold">{l.method}</span>{' '}
          <span className="tabular-nums font-medium text-slate-900">{formatBDT(l.amount)}</span>
          {l.method === 'Bank' && (
            <span className="block text-slate-500">
              {l.bankName}
              {l.accountNumber ? ` · ${maskAccount(l.accountNumber)}` : ''}
              {l.companyBankName ? ` · via ${l.companyBankName}` : ''}
              {l.referenceNo ? ` · Ref ${l.referenceNo}` : ''}
            </span>
          )}
          {l.method === 'Cheque' && (
            <span className="block text-slate-500">
              #{l.chequeNo}
              {l.bankName ? ` · ${l.bankName}` : ''}
              {l.chequeDate ? ` · ${fmtDate(l.chequeDate)}` : ''}
              {l.companyBankName ? ` · via ${l.companyBankName}` : ''}
            </span>
          )}
          {l.method === 'Cash' && l.referenceNo && <span className="block text-slate-500">Ref {l.referenceNo}</span>}
          {l.hasAttachment && (
            <button
              type="button"
              onClick={() => openAttachment(l)}
              className="mt-0.5 block text-[11px] font-semibold text-blue-600 hover:underline"
            >
              📎 View attachment{l.attachmentName ? ` (${l.attachmentName})` : ''}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------- Line editor --------------------------- */

function PaymentLineEditor({ line, index, canRemove, direction, investorBanks, companyBanks, onPatch, onRemove }) {
  const isPayout = direction === 'payout';
  const defaultBank = investorBanks.find((b) => b.isDefault) || investorBanks[0] || null;
  const usingSaved = line.method === 'Bank' && !!line.investorBankAccountId;
  const savedBank = usingSaved ? investorBanks.find((b) => String(b.id) === String(line.investorBankAccountId)) : null;

  const changeMethod = (method) => {
    onPatch({
      method,
      investorBankAccountId: method === 'Bank' && defaultBank ? String(defaultBank.id) : '',
      bankAccountId: '',
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
      referenceNo: '',
      chequeNo: '',
      chequeDate: '',
      saveBank: false,
    });
  };

  const companyLabel =
    line.method === 'Cheque'
      ? isPayout
        ? 'Cheque drawn on (our bank)'
        : 'Deposited into (our bank)'
      : isPayout
        ? 'Paid from (our bank)'
        : 'Received into (our bank)';

  const methodTheme = {
    Bank: {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      border: 'border-blue-100 hover:border-blue-200',
      bar: 'bg-blue-500',
    },
    Cheque: {
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      border: 'border-purple-100 hover:border-purple-200',
      bar: 'bg-purple-500',
    },
    Cash: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      border: 'border-emerald-100 hover:border-emerald-200',
      bar: 'bg-emerald-500',
    },
  }[line.method] || { badge: 'bg-slate-100 text-slate-800', border: 'border-slate-200', bar: 'bg-slate-500' };

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-4 sm:p-5 shadow-sm transition ${methodTheme.border}`}>
      <div className={`absolute left-0 top-0 h-full w-1.5 ${methodTheme.bar}`} />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 text-sm">Payment #{index + 1}</span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${methodTheme.badge}`}>
            {line.method}
          </span>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1 text-xs font-medium text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Payment Method">
          <select value={line.method} onChange={(e) => changeMethod(e.target.value)} className={inputCls}>
            {Object.entries(METHOD_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Amount (৳)">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={line.amount}
              onChange={(e) => onPatch({ amount: e.target.value })}
              className={`${inputCls} pl-8`}
              placeholder="0.00"
            />
          </div>
        </Field>

        {/* ---- Bank Details ---- */}
        {line.method === 'Bank' && (
          <>
            <Field label={isPayout ? "Investor's bank account (paid to)" : "Investor's bank account (paid from)"} className="sm:col-span-2">
              <select
                value={line.investorBankAccountId}
                onChange={(e) => onPatch({ investorBankAccountId: e.target.value })}
                className={inputCls}
              >
                {investorBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} · {maskAccount(b.accountNumber)} · {b.accountName}
                  </option>
                ))}
                <option value="">+ Enter new bank details…</option>
              </select>
            </Field>

            {savedBank && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-50/70 border border-blue-100 px-3.5 py-2.5 text-xs text-blue-900 sm:col-span-2">
                <span className="text-base">ℹ️</span>
                <span>
                  <strong>{savedBank.accountName}</strong> — {savedBank.bankName}
                  {savedBank.branch ? `, ${savedBank.branch}` : ''} (A/C: {savedBank.accountNumber})
                </span>
              </div>
            )}

            {!usingSaved && (
              <>
                <Field label="Bank name">
                  <input type="text" value={line.bankName} onChange={(e) => onPatch({ bankName: e.target.value })} className={inputCls} placeholder="e.g. Dutch Bangla Bank" />
                </Field>
                <Field label="Account holder name">
                  <input type="text" value={line.accountName} onChange={(e) => onPatch({ accountName: e.target.value })} className={inputCls} placeholder="e.g. John Doe" />
                </Field>
                <Field label="Account number">
                  <input type="text" value={line.accountNumber} onChange={(e) => onPatch({ accountNumber: e.target.value })} className={inputCls} placeholder="e.g. 102.120.xxxxx" />
                </Field>
                <Field label="Branch (optional)">
                  <input type="text" value={line.branch} onChange={(e) => onPatch({ branch: e.target.value })} className={inputCls} placeholder="e.g. Gulshan" />
                </Field>
                <label className="flex items-center gap-2.5 text-xs font-medium text-slate-700 sm:col-span-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={line.saveBank}
                    onChange={(e) => onPatch({ saveBank: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                  />
                  Save these details to investor&apos;s saved accounts
                </label>
              </>
            )}

            <Field label={`${companyLabel} (optional)`}>
              <select value={line.bankAccountId} onChange={(e) => onPatch({ bankAccountId: e.target.value })} className={inputCls}>
                <option value="">Not specified</option>
                {companyBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Reference / Tx ID (optional)">
              <input type="text" value={line.referenceNo} onChange={(e) => onPatch({ referenceNo: e.target.value })} className={inputCls} placeholder="Tx-87261..." />
            </Field>
          </>
        )}

        {/* ---- Cheque Details ---- */}
        {line.method === 'Cheque' && (
          <>
            <Field label="Cheque number">
              <input type="text" value={line.chequeNo} onChange={(e) => onPatch({ chequeNo: e.target.value })} className={inputCls} placeholder="e.g. CHQ-99210" />
            </Field>
            <Field label="Cheque date (optional)">
              <input type="date" value={line.chequeDate} onChange={(e) => onPatch({ chequeDate: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Cheque bank name">
              <input
                type="text"
                value={line.bankName}
                onChange={(e) => onPatch({ bankName: e.target.value })}
                className={inputCls}
                placeholder="Leave empty to use our bank's name"
              />
            </Field>
            <Field label={`${companyLabel} (optional)`}>
              <select value={line.bankAccountId} onChange={(e) => onPatch({ bankAccountId: e.target.value })} className={inputCls}>
                <option value="">Not specified</option>
                {companyBanks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}

        {/* ---- Cash Details ---- */}
        {line.method === 'Cash' && (
          <Field label="Receipt / voucher no. (optional)" className="sm:col-span-2">
            <input type="text" value={line.referenceNo} onChange={(e) => onPatch({ referenceNo: e.target.value })} className={inputCls} placeholder="e.g. RCP-1029" />
          </Field>
        )}

        {/* ---- File Attachment ---- */}
        <Field
          label={
            line.method === 'Cheque'
              ? 'Attach cheque copy (optional)'
              : line.method === 'Bank'
                ? 'Attach transfer slip (optional)'
                : 'Attach voucher/receipt (optional)'
          }
          className="sm:col-span-2"
        >
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => onPatch({ file: e.target.files?.[0] || null })}
              className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

/* ----------------------------- Payment modal ----------------------------- */

const PAYOUT_TYPES = [
  ['profit_distribution', 'Profit payout'],
  ['principal_return', 'Capital return'],
  ['combined', 'Capital + profit'],
];

export function PaymentModal({
  direction = 'payout',
  investorId,
  investorName,
  investments = [],
  investmentId = '',
  onClose,
  onSaved,
}) {
  const isPayout = direction === 'payout';

  const [invId, setInvId] = useState(investmentId ? String(investmentId) : '');
  const [date, setDate] = useState(localToday());
  const [type, setType] = useState('profit_distribution');
  const [principalPortion, setPrincipalPortion] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState(() => [newLine('Bank')]);
  const [investorBanks, setInvestorBanks] = useState([]);
  const [companyBanks, setCompanyBanks] = useState([]);
  const [money, setMoney] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const usable = investments.filter((i) => i.status !== 'cancelled');

  useEffect(() => {
    if (invId || usable.length === 0) return;
    const withDue = isPayout ? usable.find((i) => Number(i.metrics?.totalOutstanding) > 0) : null;
    setInvId(String((withDue || usable[0]).id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [investments]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [b, c] = await Promise.all([getInvestorBankAccounts(investorId), getCompanyBanks()]);
        if (!alive) return;
        const list = Array.isArray(b.data) ? b.data : [];
        setInvestorBanks(list);
        setCompanyBanks(Array.isArray(c.data) ? c.data : []);
        const def = list.find((x) => x.isDefault) || list[0];
        if (def) {
          setLines((cur) =>
            cur.map((l, idx) =>
              idx === 0 && l.method === 'Bank' && !l.investorBankAccountId ? { ...l, investorBankAccountId: String(def.id) } : l
            )
          );
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [investorId]);

  useEffect(() => {
    if (!invId) return undefined;
    let alive = true;
    getInvestmentMoney(invId)
      .then((res) => alive && setMoney(res.data))
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [invId]);

  const investment = usable.find((i) => String(i.id) === String(invId)) || null;
  const metrics = investment?.metrics || {};

  const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const capitalPart = isPayout ? (type === 'principal_return' ? total : type === 'combined' ? Number(principalPortion) || 0 : 0) : 0;
  const profitPart = isPayout ? Math.max(0, total - capitalPart) : 0;

  const remainingCapital = Number(metrics.remainingPrincipal) || 0;
  const remainingProfit = Number(metrics.remainingProfit) || 0;
  const stillToReceive = Number(money?.receivedDue) || 0;

  let blocker = '';
  if (isPayout) {
    if (capitalPart > remainingCapital + 0.005) {
      blocker = `Capital to return is more than the remaining capital (${formatBDT(remainingCapital)}).`;
    } else if (type === 'combined' && capitalPart > total) {
      blocker = 'The capital part cannot be more than the total payout.';
    }
  } else if (money && total > stillToReceive + 0.005) {
    blocker = `This is more than the amount still to be received (${formatBDT(stillToReceive)}).`;
  }

  const advanceNote =
    isPayout && !blocker && profitPart > remainingProfit + 0.005
      ? `Profit earned & unpaid is ${formatBDT(remainingProfit)}. The extra ${formatBDT(profitPart - remainingProfit)} will be recorded as an advance payout.`
      : '';

  const patchLine = (key, changes) => setLines((cur) => cur.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!invId) {
      setError('Choose the investment first.');
      return;
    }
    if (!(total > 0)) {
      setError('Enter an amount for at least one payment.');
      return;
    }
    if (blocker) {
      setError(blocker);
      return;
    }

    const fd = new FormData();
    if (isPayout) {
      fd.append('investmentId', invId);
      fd.append('paymentDate', date);
      fd.append('paymentType', type);
      if (type === 'combined') fd.append('principalPortion', principalPortion);
    } else {
      fd.append('receiptDate', date);
    }
    fd.append('notes', notes);
    fd.append('lines', JSON.stringify(lines.map(toPayload)));
    lines.forEach((l, i) => {
      if (l.file) fd.append(`file_${i}`, l.file);
    });

    setSaving(true);
    try {
      if (isPayout) await recordInvestorPayment(fd);
      else await recordInvestmentReceipt(invId, fd);
      onSaved?.();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const title = isPayout ? 'Pay Investor' : 'Record Money Received';

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Top Gradient Banner / Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              {isPayout ? '💳' : '📥'}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
              {investorName && <p className="text-xs font-medium text-slate-500">{investorName}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form id="payment-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Investment & Date */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Investment Project" className="sm:col-span-2">
              <select value={invId} onChange={(e) => setInvId(e.target.value)} className={inputCls}>
                {usable.length === 0 && <option value="">No investments</option>}
                {usable.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.investmentCode} · {i.project?.name || 'General business'} · {formatBDT(i.principalAmount)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payment Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>

            {isPayout ? (
              <Field label="What is this payout for?">
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                  {PAYOUT_TYPES.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
                <div>Investment: <strong className="font-semibold">{formatBDT(investment?.principalAmount)}</strong></div>
                <div className="mt-0.5">Still to receive: <strong className="font-bold text-blue-700">{money ? formatBDT(stillToReceive) : '…'}</strong></div>
              </div>
            )}

            {isPayout && type === 'combined' && (
              <Field label="Of which capital (৳)" className="sm:col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={principalPortion}
                  onChange={(e) => setPrincipalPortion(e.target.value)}
                  className={inputCls}
                  placeholder="Remaining will be counted as profit"
                />
              </Field>
            )}
          </div>

          {/* Quick Stats Badges for Payout */}
          {isPayout && investment && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-xs">
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 shadow-sm border border-slate-200">
                <span className="text-slate-500">Capital to return:</span>
                <span className="font-bold text-slate-800">{formatBDT(remainingCapital)}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 border border-emerald-200/70">
                <span>Profit earned & unpaid:</span>
                <span className="font-bold">{formatBDT(remainingProfit)}</span>
              </div>
            </div>
          )}

          {/* Split Payment Methods */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isPayout ? 'How are you paying?' : 'Payment breakdown'}
                </h4>
                <p className="text-xs text-slate-500">Split payment across multiple methods if needed</p>
              </div>
              {lines.length < 5 && (
                <button
                  type="button"
                  onClick={() => setLines((cur) => [...cur, newLine('Cash')])}
                  className={btnGhost}
                >
                  <span className="text-amber-500 font-bold">+</span> Add Method
                </button>
              )}
            </div>

            <div className="space-y-3">
              {lines.map((l, idx) => (
                <PaymentLineEditor
                  key={l.key}
                  line={l}
                  index={idx}
                  canRemove={lines.length > 1}
                  direction={direction}
                  investorBanks={investorBanks}
                  companyBanks={companyBanks}
                  onPatch={(changes) => patchLine(l.key, changes)}
                  onRemove={() => setLines((cur) => cur.filter((x) => x.key !== l.key))}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes (optional)">
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputCls}
              placeholder="Add any internal transaction notes..."
            />
          </Field>

          {/* Warning / Error feedback */}
          {advanceNote && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <span className="text-base leading-none">⚠️</span>
              <span>{advanceNote}</span>
            </div>
          )}
          {(blocker || error) && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
              <span className="text-base leading-none">🚫</span>
              <span>{error || blocker}</span>
            </div>
          )}
        </form>

        {/* Sticky Footer: Total & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Amount:</span>
            <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-200/60 px-3.5 py-1 text-base font-extrabold tabular-nums text-slate-900">
              {formatBDT(total)}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="payment-form"
              disabled={saving || !!blocker || total <= 0}
              className={`w-1/2 sm:w-auto ${btnPrimary}`}
            >
              {saving ? 'Processing...' : isPayout ? 'Save Payout' : 'Save Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}