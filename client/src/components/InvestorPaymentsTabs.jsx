// client/src/components/InvestorPaymentsTabs.jsx
// "Payments" tab (pay investor / money received) and "Bank Accounts" tab for the investor profile.
import React, { useCallback, useEffect, useState } from 'react';
import {
  getInvestments,
  getInvestorMoney,
  getInvestorBankAccounts,
  createInvestorBankAccount,
  updateInvestorBankAccount,
  deleteInvestorBankAccount,
} from '../api/investor';
import { PaymentModal, PaymentLinesView, formatBDT, fmtDate } from './InvestorMoneyForms';

const errMsg = (err) => err.response?.data?.message || err.message || 'Something went wrong.';

const panelCls = 'rounded-xl border border-[#EEF0F4] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';
const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-[#F6B01E] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/25';
const btnPrimary =
  'rounded-lg bg-[#F6B01E] px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#e9a30f] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/60 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const btnOutline =
  'rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50';
const btnGhost =
  'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50';

function Panel({ title, subtitle, action, children }) {
  return (
    <section className={panelCls}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <p className="py-8 text-center text-sm text-slate-400">{children}</p>;
}

function Tile({ label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 border-slate-200',
    green: 'bg-[#EAF7F1] border-[#CFEBDD]',
    blue: 'bg-[#EAF2FE] border-[#CFE0FB]',
    amber: 'bg-[#FEF6E6] border-[#FBE8C0]',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const TYPE_LABELS = {
  profit_distribution: 'Profit payout',
  principal_return: 'Capital return',
  combined: 'Capital + profit',
};

/* ------------------------------ Payments tab ------------------------------ */

export function PaymentsTab({ investorId, investorName, onChanged, autoOpen, onAutoOpenDone }) {
  const [investments, setInvestments] = useState([]);
  const [money, setMoney] = useState({ receipts: [], payouts: [], totalReceived: 0, totalPaid: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'payout' | 'receipt' | null

  const load = useCallback(async () => {
    try {
      const [inv, mon] = await Promise.all([getInvestments({ investorId }), getInvestorMoney(investorId)]);
      setInvestments(Array.isArray(inv.data) ? inv.data : []);
      setMoney(mon.data || { receipts: [], payouts: [], totalReceived: 0, totalPaid: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Lets the page header's "Pay Investor" button open the form straight away
  useEffect(() => {
    if (autoOpen) {
      setModal(autoOpen);
      onAutoOpenDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  const live = investments.filter((i) => i.status !== 'cancelled');
  const capitalToReturn = live.reduce((s, i) => s + (Number(i.metrics?.remainingPrincipal) || 0), 0);
  const profitToPay = live.reduce((s, i) => s + (Number(i.metrics?.remainingProfit) || 0), 0);

  const handleSaved = async () => {
    setModal(null);
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile tone="green" label="Paid to investor" value={formatBDT(money.totalPaid)} />
        <Tile tone="blue" label="Received from investor" value={formatBDT(money.totalReceived)} />
        <Tile tone="amber" label="Capital still to return" value={formatBDT(capitalToReturn)} />
        <Tile tone="slate" label="Profit earned, unpaid" value={formatBDT(profitToPay)} />
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setModal('payout')} className={btnPrimary}>
          Pay Investor
        </button>
        <button type="button" onClick={() => setModal('receipt')} className={btnOutline}>
          Record Payment Received
        </button>
      </div>

      <Panel title="Payouts to investor" subtitle={`${money.payouts.length} ${money.payouts.length === 1 ? 'payout' : 'payouts'}`}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : money.payouts.length === 0 ? (
          <Empty>No payouts yet. Use &quot;Pay Investor&quot; whenever you want to pay this investor back.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-[#F7F8FB] text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Investment</th>
                  <th className="px-3 py-2.5 font-medium">Type</th>
                  <th className="px-3 py-2.5 font-medium">Paid by</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {money.payouts.map((p) => (
                  <tr key={p.id} className="align-top hover:bg-[#FAFBFD]">
                    <td className="px-3 py-3 font-semibold text-slate-800">{p.paymentCode}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{fmtDate(p.paymentDate)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{p.investmentCode || '—'}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {TYPE_LABELS[p.paymentType] || p.paymentType}
                      {p.paymentType === 'combined' && (
                        <span className="block text-xs text-slate-400">
                          Capital {formatBDT(p.principalPaid)} · Profit {formatBDT(p.profitPaid)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <PaymentLinesView lines={p.lines} fallbackMethod={p.paymentMethod} fallbackRef={p.referenceNo} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-slate-900">{formatBDT(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Received from investor" subtitle={`${money.receipts.length} ${money.receipts.length === 1 ? 'payment' : 'payments'}`}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : money.receipts.length === 0 ? (
          <Empty>No payments received from this investor yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="bg-[#F7F8FB] text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Investment</th>
                  <th className="px-3 py-2.5 font-medium">Paid by</th>
                  <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {money.receipts.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-[#FAFBFD]">
                    <td className="px-3 py-3 font-semibold text-slate-800">{r.receiptCode}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{fmtDate(r.receiptDate)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-slate-600">{r.investmentCode || '—'}</td>
                    <td className="px-3 py-3">
                      <PaymentLinesView lines={r.lines} fallbackMethod={r.paymentMethod} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums text-slate-900">{formatBDT(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {modal && (
        <PaymentModal
          direction={modal}
          investorId={investorId}
          investorName={investorName}
          investments={investments}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* --------------------------- Bank accounts tab --------------------------- */

const EMPTY_FORM = { bankName: '', accountName: '', accountNumber: '', branch: '', routingNumber: '', isDefault: false };

export function BankAccountsTab({ investorId }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getInvestorBankAccounts(investorId);
      setAccounts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const reset = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await updateInvestorBankAccount(editingId, form);
      else await createInvestorBankAccount(investorId, form);
      reset();
      await load();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (a) => {
    setEditingId(a.id);
    setForm({
      bankName: a.bankName || '',
      accountName: a.accountName || '',
      accountNumber: a.accountNumber || '',
      branch: a.branch || '',
      routingNumber: a.routingNumber || '',
      isDefault: !!a.isDefault,
    });
    setError('');
  };

  const makeDefault = async (a) => {
    try {
      await updateInvestorBankAccount(a.id, { ...a, isDefault: true });
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete ${a.bankName} (${a.accountNumber})? Past payments keep their own copy of these details.`)) return;
    try {
      await deleteInvestorBankAccount(a.id);
      if (editingId === a.id) reset();
      await load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  return (
    <div className="space-y-5">
      <Panel
        title={editingId ? 'Edit bank account' : 'Add a bank account'}
        subtitle="Used to pay the investor, or to note where their payment came from."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Bank name</span>
            <input type="text" value={form.bankName} onChange={set('bankName')} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Account holder name</span>
            <input type="text" value={form.accountName} onChange={set('accountName')} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Account number</span>
            <input type="text" value={form.accountNumber} onChange={set('accountNumber')} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Branch (optional)</span>
            <input type="text" value={form.branch} onChange={set('branch')} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Routing number (optional)</span>
            <input type="text" value={form.routingNumber} onChange={set('routingNumber')} className={inputCls} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 accent-[#F6B01E]"
            />
            Use as the default account
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            {editingId && (
              <button type="button" onClick={reset} className={btnOutline}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add bank account'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="Bank accounts" subtitle={`${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : accounts.length === 0 ? (
          <Empty>No bank accounts saved yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {accounts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-100 bg-[#FAFBFD] p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {a.bankName}
                    {a.isDefault && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {a.accountName} · A/C {a.accountNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {[a.branch, a.routingNumber ? `Routing ${a.routingNumber}` : null].filter(Boolean).join(' · ') || 'No branch added'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {!a.isDefault && (
                    <button type="button" onClick={() => makeDefault(a)} className={btnGhost}>
                      Make default
                    </button>
                  )}
                  <button type="button" onClick={() => startEdit(a)} className={btnGhost}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleDelete(a)} className={`${btnGhost} text-rose-600 hover:bg-rose-50`}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}