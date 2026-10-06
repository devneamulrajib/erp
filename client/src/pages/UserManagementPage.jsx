// client/src/pages/UserManagementPage.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, LayoutGrid, Plus, UserRound, ShieldCheck, Ban,
  CheckCircle2, AlertCircle, Eye, EyeOff, X, Loader2, Check
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import {
  getUsers, addUser, updateUserRole, updateUserStatus, deleteUser,
} from '../api/userManagement';
import { ALL_ROLES } from '../config/permissions';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const ASSIGNABLE_ROLES = ALL_ROLES.filter((r) => r !== 'superadmin');
const EMPTY_FORM = { name: '', email: '', password: '', role: 'user', roles: [] };

const ROLE_BADGE_STYLES = {
  superadmin: 'bg-violet-50 text-violet-600 ring-violet-600/20',
  admin: 'bg-indigo-50 text-indigo-600 ring-indigo-600/20',
  manager: 'bg-blue-50 text-blue-600 ring-blue-600/20',
  accountant: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  storekeeper: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  sales: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  hr: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  user: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  // Role Management Modal
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [rowBusyId, setRowBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data || []);
      setPageError('');
    } catch (err) {
      console.error('Failed to load team members', err);
      setPageError(err.response?.data?.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const filtered = users.filter((u) => {
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) && !u.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Superadmin is always active; others check boolean
  const activeCount = users.filter((u) => u.role === 'superadmin' || Boolean(u.isActive)).length;
  const adminCount = users.filter((u) => ['admin', 'superadmin'].includes(u.role)).length;

  function openAddModal() {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowPassword(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function openRoleModal(user) {
    setRoleModalUser(user);
    const current = Array.from(new Set([
      user.role,
      ...(Array.isArray(user.roles) ? user.roles : [])
    ]));
    setSelectedRoles(current);
  }

  function toggleRoleSelection(role) {
    if (role === roleModalUser?.role) return;
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function handleSaveRoles() {
    if (!roleModalUser) return;
    setSavingRoles(true);
    try {
      const secondaryRoles = selectedRoles.filter((r) => r !== roleModalUser.role);
      await updateUserRole(roleModalUser.id, roleModalUser.role, secondaryRoles);
      
      setUsers((prev) =>
        prev.map((u) => (u.id === roleModalUser.id ? { ...u, roles: secondaryRoles } : u))
      );
      
      const currentStored = localStorage.getItem('user');
      if (currentStored) {
        const parsed = JSON.parse(currentStored);
        if (parsed.id === roleModalUser.id) {
          parsed.roles = secondaryRoles;
          localStorage.setItem('user', JSON.stringify(parsed));
        }
      }

      setNotice(`Updated roles for ${roleModalUser.name}.`);
      setRoleModalUser(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update roles');
    } finally {
      setSavingRoles(false);
    }
  }

  async function handlePrimaryRoleChange(user, newPrimaryRole) {
    setRowBusyId(user.id);
    try {
      const currentSecondary = Array.isArray(user.roles) ? user.roles.filter((r) => r !== newPrimaryRole) : [];
      await updateUserRole(user.id, newPrimaryRole, currentSecondary);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newPrimaryRole, roles: currentSecondary } : u)));
      setNotice(`Primary role set to ${newPrimaryRole} for ${user.name}`);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleRevokeRole(user, roleToRevoke) {
    setRowBusyId(user.id);
    try {
      const currentSecondary = Array.isArray(user.roles) ? user.roles.filter((r) => r !== roleToRevoke) : [];
      await updateUserRole(user.id, user.role, currentSecondary);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, roles: currentSecondary } : u)));
      setNotice(`Revoked ${roleToRevoke} role from ${user.name}`);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to revoke role.');
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    setFormError('');
    try {
      await addUser(form);
      setModalOpen(false);
      setNotice(`${form.name} was added.`);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add team member.');
    } finally {
      setSaving(false);
    }
  }

  // Toggle Activate / Deactivate
  async function handleToggleStatus(user) {
    if (user.role === 'superadmin') return;
    setRowBusyId(user.id);
    const nextStatus = !Boolean(user.isActive);

    try {
      await updateUserStatus(user.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: nextStatus } : u))
      );
      setNotice(`${user.name} is now ${nextStatus ? 'Active' : 'Deactivated'}.`);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setRowBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setRowBusyId(target.id);
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      setNotice(`${target.name} was removed.`);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to remove team member.');
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Settings', to: '/dashboard' },
                { label: 'Team Members' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Team Members & Role Access</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage permissions, assign multiple modules/roles, and toggle account activation</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Member
          </button>
        </div>

        {pageError && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{pageError}</span>
            <button onClick={() => setPageError('')} aria-label="Dismiss" className="rounded p-0.5 text-red-500 hover:bg-red-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {notice && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-6">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{notice}</span>
            <button onClick={() => setNotice('')} aria-label="Dismiss" className="rounded p-0.5 text-emerald-600 hover:bg-emerald-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Members</div>
            <div className="text-xl font-semibold text-slate-900">{users.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Active</div>
            <div className="text-xl font-semibold text-emerald-600">{activeCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Admins</div>
            <div className="text-xl font-semibold text-slate-900">{adminCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pageRows.length} / {filtered.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>entries</span>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Primary Role</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Additional Assigned Roles</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading team members…
                      </span>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No team members found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((user) => {
                    const isSuperadmin = user.role === 'superadmin';
                    const busy = rowBusyId === user.id;
                    const additional = Array.isArray(user.roles) ? user.roles : [];
                    const isActive = isSuperadmin ? true : Boolean(user.isActive);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-slate-800 font-medium">
                            <UserRound size={13} className="text-slate-400" />
                            {user.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">{user.email}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isSuperadmin ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE_STYLES.superadmin}`}>
                              <ShieldCheck size={12} />
                              Superadmin
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              disabled={busy}
                              onChange={(e) => handlePrimaryRoleChange(user, e.target.value)}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset border-0 outline-none cursor-pointer capitalize disabled:opacity-50 ${ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_STYLES.user}`}
                            >
                              {ASSIGNABLE_ROLES.map((role) => (
                                <option key={role} value={role} className="bg-white text-slate-700 capitalize">{role}</option>
                              ))}
                            </select>
                          )}
                        </td>

                        {/* Additional Roles Column */}
                        <td className="px-5 py-3.5">
                          {isSuperadmin ? (
                            <span className="text-xs text-slate-400 italic">Full ERP Access</span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {additional.length === 0 ? (
                                <span className="text-xs text-slate-400">None</span>
                              ) : (
                                additional.map((r) => (
                                  <span
                                    key={r}
                                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${ROLE_BADGE_STYLES[r] || 'bg-slate-100 text-slate-700'}`}
                                  >
                                    {r}
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleRevokeRole(user, r)}
                                      title={`Revoke ${r} role`}
                                      className="text-slate-400 hover:text-rose-600 transition"
                                    >
                                      <X size={11} strokeWidth={2.5} />
                                    </button>
                                  </span>
                                ))
                              )}
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openRoleModal(user)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition"
                              >
                                <Plus size={10} strokeWidth={3} />
                                Manage
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Interactive Status Column */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {isSuperadmin ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Always Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleToggleStatus(user)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition cursor-pointer disabled:opacity-50 ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 ring-rose-600/20 hover:bg-rose-100'
                              }`}
                              title={isActive ? 'Click to Deactivate' : 'Click to Activate'}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {isActive ? 'Active' : 'Deactivated'}
                            </button>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={isSuperadmin || busy}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                                isActive
                                  ? 'bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700'
                              } disabled:opacity-30 disabled:pointer-events-none`}
                              title={isSuperadmin ? 'Superadmin is always active' : isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {busy ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : isActive ? (
                                <Ban size={14} />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => setPendingDelete(user)}
                              disabled={isSuperadmin || busy}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                              title={isSuperadmin ? 'Superadmin cannot be deleted' : 'Remove user'}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Role Management Modal */}
      {roleModalUser && (
        <Modal open={!!roleModalUser} title={`Manage Roles for ${roleModalUser.name}`} onClose={() => setRoleModalUser(null)}>
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select all roles this person should have access to. Permissions from all checked roles combine seamlessly.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {ASSIGNABLE_ROLES.map((r) => {
                const isPrimary = r === roleModalUser.role;
                const isChecked = selectedRoles.includes(r);

                return (
                  <button
                    key={r}
                    type="button"
                    disabled={isPrimary}
                    onClick={() => toggleRoleSelection(r)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold capitalize transition ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    } ${isPrimary ? 'opacity-80 cursor-not-allowed bg-slate-50 border-slate-200' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                        isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </span>
                      <span>{r}</span>
                    </div>
                    {isPrimary && (
                      <span className="text-[10px] text-slate-400 font-normal">Primary</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRoles}
                onClick={handleSaveRoles}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition shadow-2xs"
              >
                {savingRoles && <Loader2 size={13} className="animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add member modal */}
      <Modal open={modalOpen} title="Add Team Member" onClose={closeModal}>
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Name</label>
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email</label>
              <input
                required
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Temporary password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Primary Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition capitalize"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role} className="capitalize">{role}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove confirmation */}
      <Modal open={!!pendingDelete} title="Remove team member" onClose={() => setPendingDelete(null)}>
        <p className="text-sm text-slate-600">
          Remove <span className="font-medium text-slate-900">{pendingDelete?.name}</span>? They'll lose access immediately. This can't be undone.
        </p>
        <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-slate-100">
          <button
            onClick={() => setPendingDelete(null)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}