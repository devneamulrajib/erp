import { useState, useEffect, useCallback, Fragment } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { Pencil, Trash2, Landmark, List } from 'lucide-react';
import {
  getBankAccounts, createBankAccount, updateBankAccount, deleteBankAccount,
  getBankSummary, getBankTransactions,
} from '../api/bankAccount';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

function formatMoney(n) {
  return (Number(n) || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_STYLE = {
  Pending: 'bg-amber-50 text-amber-700',
  Honour: 'bg-emerald-50 text-emerald-700',
  DisHonour: 'bg-red-50 text-red-700',
};

export default function BankAccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [openId, setOpenId] = useState(null);
  const [txn, setTxn] = useState(null);
  const [txnLoading, setTxnLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sum] = await Promise.all([
        getBankAccounts(),
        getBankSummary().catch(() => ({})),
      ]);
      setAccounts(Array.isArray(data) ? data : []);
      setSummary(sum || {});
    } catch (err) {
      console.error('Failed to load bank accounts', err);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleTransactions(id) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setTxn(null);
    setTxnLoading(true);
    try {
      setTxn(await getBankTransactions(id));
    } catch (err) {
      setTxn({ rows: [], opening: 0, closing: 0, error: err.response?.data?.message || err.message });
    } finally {
      setTxnLoading(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setBalance('');
    setFormError('');
  }

  function startEdit(acc) {
    setEditingId(acc.id);
    setName(acc.name || '');
    setBalance(acc.balance ?? '');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Bank account name is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), balance: balance === '' ? 0 : Number(balance) };
      if (editingId) {
        await updateBankAccount(editingId, payload);
      } else {
        await createBankAccount(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save bank account');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this bank account? Vouchers already linked to it will keep their reference but this account will no longer appear in dropdowns.')) return;
    try {
      await deleteBankAccount(id);
      await load();
    } catch (err) {
      window.alert(err.response?.data?.message || 'Failed to delete');
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Accounts Module', to: '/dashboard' },
              { label: 'Bank Accounts' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Bank Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage the bank accounts used across Payment, Receipt, and Bank Reconciliation</p>
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{formError}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{editingId ? 'Edit Bank Account' : 'Add Bank Account'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Bank Account Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. City Bank - 001234"
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Opening Balance</label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : (editingId ? 'Update' : 'Add Bank Account')}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Opening</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Received</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Paid</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Current Balance</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Landmark size={28} strokeWidth={1.5} />
                        <p className="text-sm">No bank accounts yet. Add one above to get started.</p>
                      </div>
                    </td>
                  </tr>
                ) : accounts.map((a) => {
                  const s = summary[a.id] || { current: Number(a.balance) || 0, received: 0, paid: 0, pendingCheques: 0 };
                  return (
                    <Fragment key={a.id}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-800">
                          {a.name}
                          {s.pendingCheques > 0 && (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              {formatMoney(s.pendingCheques)} cheques pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-slate-500">{formatMoney(a.balance)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-emerald-700">{formatMoney(s.received)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-rose-600">{formatMoney(s.paid)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">{formatMoney(s.current)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => toggleTransactions(a.id)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                openId === a.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                              }`}
                              title="View transactions"
                            >
                              <List size={14} />
                            </button>
                            <button onClick={() => startEdit(a)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(a.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {openId === a.id && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={6} className="px-5 py-4">
                            {txnLoading ? (
                              <p className="text-center text-sm text-slate-400 py-4">Loading transactions…</p>
                            ) : txn?.error ? (
                              <p className="text-center text-sm text-red-600 py-4">{txn.error}</p>
                            ) : !txn || txn.rows.length === 0 ? (
                              <p className="text-center text-sm text-slate-400 py-4">
                                No transactions yet for this bank.
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-500">
                                      <th className="px-3 py-2 text-left font-medium">Date</th>
                                      <th className="px-3 py-2 text-left font-medium">Voucher</th>
                                      <th className="px-3 py-2 text-left font-medium">Details</th>
                                      <th className="px-3 py-2 text-right font-medium">In</th>
                                      <th className="px-3 py-2 text-right font-medium">Out</th>
                                      <th className="px-3 py-2 text-right font-medium">Balance</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {txn.rows.map((r, i) => (
                                      <tr key={`${r.id}-${i}`}>
                                        <td className="whitespace-nowrap px-3 py-2 text-slate-600">{fmtDate(r.date)}</td>
                                        <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-700">
                                          {r.type}-{r.voucherNo}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">
                                          {r.description}
                                          {r.status && (
                                            <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[r.status] || ''}`}>
                                              {r.status}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-700">
                                          {r.debit ? formatMoney(r.debit) : ''}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-rose-600">
                                          {r.credit ? formatMoney(r.credit) : ''}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono font-medium text-slate-800">
                                          {formatMoney(r.balance)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}