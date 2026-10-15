import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, ShieldOff, KeyRound, X, Loader2 } from 'lucide-react';
import axios from '../api/axios';

export default function PortalAccessModal({
  // Modal visibility props
  open,
  isOpen,
  onClose,
  onSuccess,
  // Entity data props
  customer,
  entity: rawEntity,
  entityType: rawEntityType,
  onNeedsEmail
}) {
  // Normalize incoming props
  const show = Boolean(open ?? isOpen);
  const entity = rawEntity || customer;
  const entityType = (rawEntityType || entity?.portalRole || 'customer').toLowerCase();

  // State Management
  const [username, setUsername] = useState('');
  const [portalRole, setPortalRole] = useState('customer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Derive access status across schema standards
  const hasAccess = Boolean(entity?.portal_access ?? entity?.createUser);
  const isConfigured = Boolean(hasAccess && (entity?.portal_username || entity?.portalPassword || entity?.portal_password));

  useEffect(() => {
    if (show && entity) {
      // Determine initial username: saved username -> sanitized phone -> email
      const defaultUsername =
        entity.portal_username ||
        (entity.phone ? String(entity.phone).replace(/[^0-9]/g, '') : '') ||
        entity.email ||
        '';

      setUsername(defaultUsername);
      setPortalRole(entity.portalRole || entity.portal_role || entityType || 'customer');
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [show, entity, entityType]);

  if (!show || !entity) return null;

  // Handle Form Submission: Create or Reset Password
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isConfigured) {
        // Reset password on existing configured entity
        await axios.post('/portal-admin/reset-password', {
          entityType,
          entityId: entity.id,
          password
        });
      } else {
        // Create new portal access
        await axios.post('/portal-admin/create', {
          entityType,
          entityId: entity.id,
          username: username.trim().toLowerCase(),
          password,
          portalRole
        });
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update portal access credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Access Status Toggle (Enable / Disable / Revoke)
  const handleToggleAccess = async () => {
    const actionVerb = hasAccess ? 'revoke' : 'enable';
    if (!window.confirm(`Are you sure you want to ${actionVerb} portal access for "${entity.name}"?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await axios.post('/portal-admin/toggle-access', {
        entityType,
        entityId: entity.id,
        access: !hasAccess
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${actionVerb} portal access.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {isConfigured ? 'Manage Portal Access' : 'Grant Portal Access'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {entity.name} • <span className="capitalize">{entityType}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Warning if entity requires email for login but doesn't have one */}
        {!entity.email && !entity.portal_username && (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 space-y-2">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <span>Missing Email Address</span>
            </div>
            <p>This user does not have an email set. You can set a username below or add an email address directly.</p>
            {onNeedsEmail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNeedsEmail(entity);
                }}
                className="text-xs font-semibold text-indigo-700 underline hover:text-indigo-800"
              >
                Configure Email Now →
              </button>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Status Indicator */}
        <div className="mt-4 flex items-center gap-2 text-xs font-medium">
          {hasAccess ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <ShieldCheck size={14} /> Access Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <ShieldOff size={14} /> Access Disabled
            </span>
          )}
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Username or Phone
            </label>
            <input
              type="text"
              disabled={isConfigured}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="e.g. 01700000000 or username"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 disabled:bg-slate-50 disabled:text-slate-500 transition"
            />
          </div>

          {!isConfigured && ['customer', 'supplier', 'party', 'vendor'].includes(entityType) && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Portal Assigned Role
              </label>
              <select
                value={portalRole}
                onChange={(e) => setPortalRole(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition bg-white"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier / Vendor</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                {isConfigured ? 'New Password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 chars"
                required
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Confirm
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
            {isConfigured ? (
              <button
                type="button"
                onClick={handleToggleAccess}
                disabled={loading}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition border ${
                  hasAccess
                    ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                } disabled:opacity-50`}
              >
                {hasAccess ? 'Revoke Access' : 'Enable Access'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                {loading ? 'Saving...' : isConfigured ? 'Save New Password' : 'Grant Access'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}