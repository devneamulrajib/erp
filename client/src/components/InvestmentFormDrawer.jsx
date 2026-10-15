// client/src/components/InvestmentFormDrawer.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getInvestors,
  createInvestment,
  recordInvestmentReceipt,
  getInvestorBankAccounts,
  getCompanyBanks,
} from '../api/investor';
import { getProjects } from '../api/project';

const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;
const today = () => new Date().toISOString().slice(0, 10);
const toList = (res) => {
  const list = res?.data ?? res ?? [];
  return Array.isArray(list) ? list : [];
};
const maskAccount = (n) => {
  const s = String(n || '');
  return s.length > 4 ? `••${s.slice(-4)}` : s;
};

const RETURN_TYPES = [
  {
    key: 'fixed_return',
    title: 'Fixed return',
    text: 'The investor earns a fixed percentage of the principal, whatever the project does.',
  },
  {
    key: 'project_based',
    title: 'Project profit share',
    text: "The investor earns a percentage of the project's net profit.",
  },
  {
    key: 'equity',
    title: 'Equity (hybrid)',
    text: 'The investor earns the higher of a guaranteed floor or their profit share.',
  },
];

const METHODS = [
  ['Cash', '💵 Cash'],
  ['Bank', '🏦 Bank'],
  ['Cheque', '📝 Cheque'],
];

const THEMES = {
  dashboard: {
    header: 'bg-[#0F2E2B] text-white',
    headerSub: 'text-white/65',
    close: 'text-white/70 hover:bg-white/10 hover:text-white focus:ring-white/40',
    primary: 'bg-[#0F2E2B] text-white hover:bg-[#164440] focus:ring-[#1F7A5C]/50',
    focus: 'focus:border-[#1F7A5C] focus:ring-[#1F7A5C]/20',
    selected: 'border-[#1F7A5C] bg-[#1F7A5C]/5 ring-1 ring-[#1F7A5C]',
    dotOn: 'border-[#1F7A5C] bg-[#1F7A5C]',
    preview: 'bg-[#0F2E2B] text-white',
    previewLabel: 'text-white/60',
    previewProfit: 'text-[#7BC8A4]',
    section: 'text-[#0F2E2B]',
  },
  profile: {
    header: 'border-b border-slate-200 bg-white text-slate-900',
    headerSub: 'text-slate-500',
    close: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:ring-[#F6B01E]/40',
    primary: 'bg-[#F6B01E] text-slate-900 hover:bg-[#e9a30f] focus:ring-[#F6B01E]/60',
    focus: 'focus:border-[#F6B01E] focus:ring-[#F6B01E]/25',
    selected: 'border-[#F6B01E] bg-[#FEF6E6] ring-1 ring-[#F6B01E]',
    dotOn: 'border-[#F6B01E] bg-[#F6B01E]',
    preview: 'border border-[#FBE8C0] bg-[#FEF6E6] text-slate-900',
    previewLabel: 'text-slate-600',
    previewProfit: 'text-emerald-700',
    section: 'text-slate-900',
  },
};

function Field({ label, required, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function Section({ title, theme, children }) {
  return (
    <fieldset className="space-y-4">
      <legend className={`mb-3 w-full border-b border-slate-100 pb-2 text-sm font-semibold ${theme.section}`}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

let keySeq = 0;
const newLine = (method = 'Cash') => ({
  key: `line-${++keySeq}`,
  method,
  amount: '',
  investorBankAccountId: '',
  bankAccountId: '',
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

function PayLineEditor({
  line,
  index,
  canRemove,
  single,
  principal,
  investorBanks,
  companyBanks,
  theme,
  inputCls,
  onPatch,
  onRemove,
}) {
  const defaultBank = investorBanks.find((b) => b.isDefault) || investorBanks[0] || null;
  const usingSaved = line.method === 'Bank' && !!line.investorBankAccountId;
  const savedBank = usingSaved ? investorBanks.find((b) => String(b.id) === String(line.investorBankAccountId)) : null;

  const changeMethod = (method) =>
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

  const companySelect = (label) => (
    <Field label={`${label} (optional)`}>
      <select value={line.bankAccountId} onChange={(e) => onPatch({ bankAccountId: e.target.value })} className={inputCls}>
        <option value="">Not specified</option>
        {companyBanks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </Field>
  );

  return (
    <div className="space-y-3.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment {index + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-medium text-rose-600 hover:text-rose-700">
            Remove
          </button>
        )}
      </div>

      <div role="radiogroup" aria-label="Payment method" className="grid grid-cols-3 gap-2">
        {METHODS.map(([key, label]) => {
          const on = line.method === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => changeMethod(key)}
              className={`rounded-lg border px-2 py-2 text-sm font-semibold transition focus:outline-none ${
                on ? theme.selected : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <Field label="Amount (৳)" hint={single ? 'Leave empty to use the full principal amount.' : undefined}>
        <input
          type="number"
          min="0"
          step="0.01"
          value={line.amount}
          onChange={(e) => onPatch({ amount: e.target.value })}
          className={`${inputCls} tabular-nums`}
          placeholder={single && principal > 0 ? String(principal) : '0.00'}
        />
      </Field>

      {line.method === 'Bank' && (
        <>
          <Field label="Investor's bank account (paid from)">
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
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              <strong>{savedBank.accountName}</strong> — {savedBank.bankName}
              {savedBank.branch ? `, ${savedBank.branch}` : ''} (A/C: {savedBank.accountNumber})
            </p>
          )}

          {!usingSaved && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Bank name" required>
                <input type="text" value={line.bankName} onChange={(e) => onPatch({ bankName: e.target.value })} className={inputCls} placeholder="e.g. Dutch Bangla Bank" />
              </Field>
              <Field label="Account holder">
                <input type="text" value={line.accountName} onChange={(e) => onPatch({ accountName: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Account number" required>
                <input type="text" value={line.accountNumber} onChange={(e) => onPatch({ accountNumber: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Branch (optional)">
                <input type="text" value={line.branch} onChange={(e) => onPatch({ branch: e.target.value })} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={line.saveBank}
                  onChange={(e) => onPatch({ saveBank: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Save to the investor's bank accounts
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {companySelect('Received into (our bank)')}
            <Field label="Reference / Tx ID (optional)">
              <input type="text" value={line.referenceNo} onChange={(e) => onPatch({ referenceNo: e.target.value })} className={inputCls} />
            </Field>
          </div>
        </>
      )}

      {line.method === 'Cheque' && (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Cheque number" required>
            <input type="text" value={line.chequeNo} onChange={(e) => onPatch({ chequeNo: e.target.value })} className={inputCls} placeholder="e.g. CHQ-99210" />
          </Field>
          <Field label="Cheque date (optional)">
            <input type="date" value={line.chequeDate} onChange={(e) => onPatch({ chequeDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Cheque bank name" required hint="Or pick our bank below to use its name.">
            <input type="text" value={line.bankName} onChange={(e) => onPatch({ bankName: e.target.value })} className={inputCls} />
          </Field>
          {companySelect('Deposited into (our bank)')}
        </div>
      )}

      {line.method === 'Cash' && (
        <Field label="Receipt / voucher no. (optional)">
          <input type="text" value={line.referenceNo} onChange={(e) => onPatch({ referenceNo: e.target.value })} className={inputCls} placeholder="e.g. RCP-1029" />
        </Field>
      )}

      <Field
        label={
          line.method === 'Cheque'
            ? 'Attach cheque copy (optional)'
            : line.method === 'Bank'
              ? 'Attach transfer slip (optional)'
              : 'Attach receipt (optional)'
        }
      >
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          onChange={(e) => onPatch({ file: e.target.files?.[0] || null })}
          className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </Field>
    </div>
  );
}

export default function InvestmentFormDrawer({
  variant = 'dashboard',
  investorId = '',
  investorName = '',
  onClose,
  onSaved,
}) {
  const t = THEMES[variant] || THEMES.dashboard;
  const fixedInvestor = Boolean(investorId);

  const [form, setForm] = useState({
    investorId: investorId ? String(investorId) : '',
    projectId: '',
    principalAmount: '',
    investmentDate: today(),
    maturityDate: '',
    investmentType: 'project_based',
    profitSharePercent: '',
    expectedRoiPercent: '',
    expectedProfit: '',
    notes: '',
  });
  const [investors, setInvestors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [investorBanks, setInvestorBanks] = useState([]);
  const [companyBanks, setCompanyBanks] = useState([]);
  const [recordNow, setRecordNow] = useState(true);
  const [lines, setLines] = useState(() => [newLine('Cash')]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Set once the investment itself is saved, so a retry never creates it twice
  const createdRef = useRef(null);

  const inputCls = `w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:outline-none focus:ring-2 ${t.focus}`;

  const close = useCallback(() => {
    if (createdRef.current) onSaved?.();
    else onClose();
  }, [onClose, onSaved]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [inv, prj, cb] = await Promise.allSettled([
        fixedInvestor ? Promise.resolve(null) : getInvestors(),
        getProjects(),
        getCompanyBanks(),
      ]);
      if (!alive) return;
      if (inv.status === 'fulfilled' && inv.value) setInvestors(toList(inv.value));
      if (prj.status === 'fulfilled') setProjects(toList(prj.value));
      if (cb.status === 'fulfilled') setCompanyBanks(toList(cb.value));
    })();
    return () => {
      alive = false;
    };
  }, [fixedInvestor]);

  // Load the chosen investor's saved bank accounts
  useEffect(() => {
    if (!form.investorId) {
      setInvestorBanks([]);
      return undefined;
    }
    let alive = true;
    getInvestorBankAccounts(form.investorId)
      .then((res) => {
        if (!alive) return;
        const list = toList(res);
        setInvestorBanks(list);
        const def = list.find((b) => b.isDefault) || list[0];
        setLines((cur) =>
          cur.map((l) =>
            l.method === 'Bank' && !l.bankName && !l.accountNumber
              ? { ...l, investorBankAccountId: def ? String(def.id) : '' }
              : l
          )
        );
      })
      .catch(() => alive && setInvestorBanks([]));
    return () => {
      alive = false;
    };
  }, [form.investorId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const patchLine = (key, changes) => setLines((cur) => cur.map((l) => (l.key === key ? { ...l, ...changes } : l)));

  const type = form.investmentType;
  const principal = Number(form.principalAmount) || 0;
  const share = Number(form.profitSharePercent) || 0;
  const roi = Number(form.expectedRoiPercent) || 0;
  const target = Number(form.expectedProfit) || 0;

  let previewProfit = null;
  if (type === 'fixed_return') previewProfit = (principal * roi) / 100;
  else if (type === 'equity') previewProfit = (principal * roi) / 100;
  else if (target > 0) previewProfit = target;

  const portalRate =
    type === 'fixed_return'
      ? roi
        ? `${roi}% fixed`
        : ''
      : type === 'project_based'
        ? share
          ? `${share}% of project profit`
          : ''
        : [share ? `${share}% share` : '', roi ? `${roi}% floor` : ''].filter(Boolean).join(' · ');

  const validate = () => {
    if (!form.investorId) return 'Choose an investor.';
    if (!(principal > 0)) return 'Enter the principal amount.';
    if (type === 'fixed_return' && roi <= 0) return 'Enter the fixed return percentage.';
    if (type === 'project_based') {
      if (!form.projectId) return 'Choose the project the profit share is based on.';
      if (share <= 0) return 'Enter the profit share percentage.';
    }
    if (type === 'equity' && (share <= 0 || roi <= 0)) {
      return 'Equity needs both a profit share and a guaranteed floor percentage.';
    }
    if (form.maturityDate && form.maturityDate < form.investmentDate) {
      return 'Maturity date cannot be before the investment date.';
    }
    return '';
  };

  // Returns { error } or { lines } (with the amount filled in for a single empty line)
  const prepareLines = () => {
    const prepared = lines.map((l) => ({
      ...l,
      amount: lines.length === 1 && !l.amount ? String(principal) : l.amount,
    }));
    for (let i = 0; i < prepared.length; i += 1) {
      const l = prepared[i];
      const n = `Payment ${i + 1}`;
      if (!(Number(l.amount) > 0)) return { error: `${n}: enter an amount.` };
      if (l.method === 'Bank') {
        if (!l.investorBankAccountId && (!l.bankName.trim() || !l.accountNumber.trim())) {
          return { error: `${n}: enter the investor's bank name and account number.` };
        }
      }
      if (l.method === 'Cheque') {
        if (!l.chequeNo.trim()) return { error: `${n}: enter the cheque number.` };
        if (!l.bankName.trim() && !l.bankAccountId) return { error: `${n}: enter the cheque's bank name.` };
      }
    }
    const total = prepared.reduce((s, l) => s + Number(l.amount), 0);
    if (total > principal + 0.005) {
      return { error: `The payments add up to ${formatBDT(total)}, which is more than the principal (${formatBDT(principal)}).` };
    }
    return { lines: prepared };
  };

  const linesTotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const shownTotal = lines.length === 1 && !lines[0].amount ? principal : linesTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    let prepared = null;
    if (recordNow) {
      const r = prepareLines();
      if (r.error) {
        setError(r.error);
        return;
      }
      prepared = r.lines;
    }

    setSubmitting(true);
    setError('');
    try {
      if (!createdRef.current) {
        const res = await createInvestment({
          investorId: form.investorId,
          projectId: form.projectId,
          principalAmount: form.principalAmount,
          investmentDate: form.investmentDate,
          maturityDate: form.maturityDate,
          investmentType: type,
          profitSharePercent: type === 'fixed_return' ? 0 : form.profitSharePercent,
          expectedRoiPercent: type === 'project_based' ? 0 : form.expectedRoiPercent,
          expectedProfit: type === 'project_based' ? form.expectedProfit : '',
          notes: form.notes,
        });
        createdRef.current = res?.data?.id || res?.id;
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setSubmitting(false);
      return;
    }

    if (prepared) {
      try {
        const fd = new FormData();
        fd.append('receiptDate', form.investmentDate);
        fd.append('notes', '');
        fd.append('lines', JSON.stringify(prepared.map(toPayload)));
        prepared.forEach((l, i) => {
          if (l.file) fd.append(`file_${i}`, l.file);
        });
        await recordInvestmentReceipt(createdRef.current, fd);
      } catch (err) {
        setError(
          `The investment was saved, but the payment was not: ${
            err.response?.data?.message || err.message
          } Fix it and press the button again, or record it later from the investment page.`
        );
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(false);
    onSaved?.();
  };

  const retryingPayment = Boolean(createdRef.current);

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex justify-end bg-slate-900/50 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="New investment"
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
      >
        <div className={`flex shrink-0 items-start justify-between gap-4 px-6 py-5 ${t.header}`}>
          <div>
            <h2 className="text-xl font-semibold">New investment</h2>
            <p className={`mt-1 text-sm ${t.headerSub}`}>
              {investorName ? `Record capital received from ${investorName}.` : 'Record capital received from an investor.'}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className={`-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none transition focus:outline-none focus:ring-2 ${t.close}`}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
            <Section title="Who and where" theme={t}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!fixedInvestor && (
                  <Field label="Investor" required>
                    <select
                      required
                      value={form.investorId}
                      onChange={set('investorId')}
                      disabled={retryingPayment}
                      className={inputCls}
                    >
                      <option value="">Choose investor</option>
                      {investors.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field
                  label="Project"
                  required={type === 'project_based'}
                  hint={type === 'project_based' ? 'Profit share is calculated from this project.' : undefined}
                >
                  <select value={form.projectId} onChange={set('projectId')} disabled={retryingPayment} className={inputCls}>
                    <option value="">General business</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Return type" theme={t}>
              <div role="radiogroup" aria-label="Return type" className="grid gap-2.5">
                {RETURN_TYPES.map((opt) => {
                  const on = type === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setForm((f) => ({ ...f, investmentType: opt.key }))}
                      disabled={retryingPayment}
                      className={`rounded-xl border p-3.5 text-left transition focus:outline-none ${
                        on ? t.selected : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-4 w-4 shrink-0 rounded-full border-2 ${on ? t.dotOn : 'border-slate-300'}`} />
                        <span className="text-sm font-semibold text-slate-900">{opt.title}</span>
                      </span>
                      <span className="mt-1 block pl-6 text-xs text-slate-500">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {type === 'fixed_return' && (
                <Field label="Return on principal (%)" required hint="Total return over the whole term, as a share of the principal.">
                  <input type="number" step="0.01" min="0" max="100" value={form.expectedRoiPercent} onChange={set('expectedRoiPercent')} className={inputCls} placeholder="12" />
                </Field>
              )}

              {type === 'project_based' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Profit share (%)" required>
                    <input type="number" step="0.01" min="0" max="100" value={form.profitSharePercent} onChange={set('profitSharePercent')} className={inputCls} placeholder="20" />
                  </Field>
                  <Field label="Target profit (৳)" hint="Optional. Shown to the investor as the expected profit.">
                    <input type="number" min="0" value={form.expectedProfit} onChange={set('expectedProfit')} className={inputCls} />
                  </Field>
                </div>
              )}

              {type === 'equity' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Profit share (%)" required>
                    <input type="number" step="0.01" min="0" max="100" value={form.profitSharePercent} onChange={set('profitSharePercent')} className={inputCls} placeholder="20" />
                  </Field>
                  <Field label="Guaranteed floor (%)" required hint="Minimum return on principal.">
                    <input type="number" step="0.01" min="0" max="100" value={form.expectedRoiPercent} onChange={set('expectedRoiPercent')} className={inputCls} placeholder="8" />
                  </Field>
                </div>
              )}

              {portalRate && (
                <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  Investor will see: <span className="font-semibold text-slate-800">{RETURN_TYPES.find((r) => r.key === type)?.title}</span> · {portalRate}
                </p>
              )}
            </Section>

            <Section title="Amount" theme={t}>
              <Field label="Principal amount (৳)" required>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.principalAmount}
                  onChange={set('principalAmount')}
                  disabled={retryingPayment}
                  className={`${inputCls} text-lg font-semibold tabular-nums`}
                  placeholder="1000000"
                />
              </Field>
            </Section>

            <Section title="How the investor pays us" theme={t}>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={recordNow}
                  onChange={(e) => setRecordNow(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Record the payment now
              </label>

              {recordNow ? (
                <div className="space-y-3">
                  {lines.map((l, idx) => (
                    <PayLineEditor
                      key={l.key}
                      line={l}
                      index={idx}
                      canRemove={lines.length > 1}
                      single={lines.length === 1}
                      principal={principal}
                      investorBanks={investorBanks}
                      companyBanks={companyBanks}
                      theme={t}
                      inputCls={inputCls}
                      onPatch={(changes) => patchLine(l.key, changes)}
                      onRemove={() => setLines((cur) => cur.filter((x) => x.key !== l.key))}
                    />
                  ))}

                  <div className="flex items-center justify-between">
                    {lines.length < 5 ? (
                      <button
                        type="button"
                        onClick={() => setLines((cur) => [...cur, newLine('Cash')])}
                        className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                      >
                        + Split across another method
                      </button>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-slate-500">
                      Paid: <span className="font-semibold tabular-nums text-slate-800">{formatBDT(shownTotal)}</span>
                      {principal > 0 && <> of {formatBDT(principal)}</>}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                  No payment will be recorded. You can add it later from the investment page with “Record Payment Received”.
                </p>
              )}
            </Section>

            <Section title="Dates" theme={t}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Investment date" required>
                  <input type="date" required value={form.investmentDate} onChange={set('investmentDate')} disabled={retryingPayment} className={inputCls} />
                </Field>
                <Field label="Maturity date" hint="Needed to project payouts in the investor's Compare page.">
                  <input type="date" value={form.maturityDate} onChange={set('maturityDate')} disabled={retryingPayment} className={inputCls} />
                </Field>
              </div>

              {principal > 0 && (
                <div className={`rounded-xl p-4 ${t.preview}`}>
                  {previewProfit !== null ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className={`text-xs ${t.previewLabel}`}>{type === 'equity' ? 'Minimum profit' : 'Expected profit'}</p>
                        <p className={`mt-0.5 text-lg font-semibold tabular-nums ${t.previewProfit}`}>{formatBDT(previewProfit)}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${t.previewLabel}`}>{type === 'equity' ? 'Minimum return' : 'Expected return'}</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatBDT(principal + previewProfit)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">Profit depends on how the project performs. The investor sees their share %, not a fixed amount.</p>
                  )}
                </div>
              )}

              <Field label="Notes">
                <textarea rows="2" value={form.notes} onChange={set('notes')} disabled={retryingPayment} className={inputCls} />
              </Field>
            </Section>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
            {error && (
              <p role="alert" className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {retryingPayment ? 'Skip payment' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${t.primary}`}
              >
                {submitting ? 'Recording...' : retryingPayment ? 'Retry payment' : 'Record investment'}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>,
    document.body
  );
}