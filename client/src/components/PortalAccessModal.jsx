import { useState, useEffect } from 'react';
import Modal from './Modal';
import { setPortalAccess } from '../api/portalAdmin';
import { ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';

export default function PortalAccessModal({ open, customer, onClose, onSuccess, onNeedsEmail }) {
  const [portalRole, setPortalRole] = useState('customer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPortalRole(customer?.portalRole || 'customer');
    setPassword('');
    setConfirmPassword('');
    setError('');
  }, [customer]);

  const hasAccess = !!customer?.createUser;

  async function handleGrant(e) {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await setPortalAccess(customer.id, { enable: true, portalRole, password });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update portal access.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!window.confirm(`Revoke portal access for "${customer.name}"?`)) return;
    setLoading(true);
    setError('');
    try {
      await setPortalAccess(customer.id, { enable: false });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke portal access.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} title={`Portal Access — ${customer?.name || ''}`} onClose={onClose}>
      {!customer ? null : !customer.email ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
            This customer doesn't have an email yet. Portal login requires one — add an
            email first, then come back here to set up portal access.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onNeedsEmail?.(customer)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Add Email Now
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleGrant} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {hasAccess ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                <ShieldCheck size={15} /> Portal access is currently enabled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
                <ShieldOff size={15} /> Portal access is currently disabled
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Logging in as</label>
            <div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
              {customer.email}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Portal Role</label>
            <select
              value={portalRole}
              onChange={(e) => setPortalRole(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            >
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                {hasAccess ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
            {hasAccess ? (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Revoke Access
              </button>
            ) : <span />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
              >
                <KeyRound size={14} />
                {loading ? 'Saving…' : hasAccess ? 'Update Access' : 'Grant Access'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}