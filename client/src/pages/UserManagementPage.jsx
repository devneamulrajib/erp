import { useState, useEffect, useCallback } from 'react';
import {
  Pencil, Trash2, LayoutGrid, Plus, UserRound, ShieldCheck, Ban,
  CheckCircle2, AlertCircle, Eye, EyeOff, X, Loader2,
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
const EMPTY_FORM = { name: '', email: '', password: '', role: 'user' };

const ROLE_BADGE_STYLES = {
  superadmin: 'bg-violet-50 text-violet-600 ring-violet-600/10',
  admin: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
  manager: 'bg-blue-50 text-blue-600 ring-blue-600/10',
  accountant: 'bg-amber-50 text-amber-600 ring-amber-600/10',
  storekeeper: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
  sales: 'bg-cyan-50 text-cyan-600 ring-cyan-600/10',
  hr: 'bg-rose-50 text-rose-600 ring-rose-600/10',
  user: 'bg-slate-100 text-slate-500 ring-slate-500/10',
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

  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [rowBusyId, setRowBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // user object or null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
      setPageError('');
    } catch (err) {
      console.error('Failed to load team members', err);
      setPageError(err.response?.data?.message || 'Failed to load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-dismiss the success banner so it doesn't linger forever.
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

  const activeCount = users.filter((u) => u.isActive).length;
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
      console.error('Failed to add team member', err);
      setFormError(err.response?.data?.message || 'Failed to add team member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRoleChange(user, role) {
    setRowBusyId(user.id);
    try {
      await updateUserRole(user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
      setPageError('');
    } catch (err) {
      console.error('Failed to update role', err);
      setPageError(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setRowBusyId(null);
    }
  }

  async function handleToggleStatus(user) {
    setRowBusyId(user.id);
    try {
      await updateUserStatus(user.id, !user.isActive);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u)));
      setPageError('');
    } catch (err) {
      console.error('Failed to update status', err);
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
      console.error('Failed to remove team member', err);
      setPageError(err.response?.data?.message || 'Failed to remove team member.');
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Settings', to: '/dashboard' },
                { label: 'Team Members' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Team Members</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage who has access to the ERP and what they can see</p>
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
            <div className="text-xl font-semibold text-slate-900">{activeCount}</div>
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

          {/* Table — sm and up */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Email</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-400 text-sm">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading team members…
                      </span>
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No team members found. Try adjusting your search, or add one.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageRows.map((user) => {
                    const isSuperadmin = user.role === 'superadmin';
                    const busy = rowBusyId === user.id;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-2 text-slate-700 font-medium">
                            <UserRound size={13} className="text-slate-400" />
                            {user.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{user.email}</td>
                        <td className="px-5 py-3.5">
                          {isSuperadmin ? (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE_STYLES.superadmin}`}>
                              <ShieldCheck size={12} />
                              Superadmin
                            </span>
                          ) : (
                            <select
                              value={user.role}
                              disabled={busy}
                              onChange={(e) => handleRoleChange(user, e.target.value)}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset border-0 outline-none cursor-pointer capitalize disabled:opacity-50 ${ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_STYLES.user}`}
                            >
                              {ASSIGNABLE_ROLES.map((role) => (
                                <option key={role} value={role} className="bg-white text-slate-700 capitalize">{role}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {user.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(user)}
                              disabled={isSuperadmin || busy}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-600 transition-colors disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-500"
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                            </button>
                            <button
                              onClick={() => setPendingDelete(user)}
                              disabled={isSuperadmin || busy}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-500"
                              title="Remove"
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

          {/* Cards — below sm, where the table gets cramped */}
          <div className="sm:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading team members…
              </div>
            ) : pageRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                <LayoutGrid size={28} strokeWidth={1.5} />
                <p className="text-sm">No team members found.</p>
              </div>
            ) : (
              pageRows.map((user) => {
                const isSuperadmin = user.role === 'superadmin';
                const busy = rowBusyId === user.id;
                return (
                  <div key={user.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
                          <UserRound size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{user.name}</span>
                        </span>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{user.email}</div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {user.isActive ? 'Active' : 'Off'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      {isSuperadmin ? (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE_STYLES.superadmin}`}>
                          <ShieldCheck size={12} />
                          Superadmin
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          disabled={busy}
                          onChange={(e) => handleRoleChange(user, e.target.value)}
                          className={`rounded-full px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset border-0 outline-none cursor-pointer capitalize disabled:opacity-50 ${ROLE_BADGE_STYLES[user.role] || ROLE_BADGE_STYLES.user}`}
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role} className="bg-white text-slate-700 capitalize">{role}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={isSuperadmin || busy}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-600 transition-colors disabled:opacity-40"
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                        </button>
                        <button
                          onClick={() => setPendingDelete(user)}
                          disabled={isSuperadmin || busy}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add member */}
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
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Role</label>
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