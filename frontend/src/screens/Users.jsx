import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, UserPlus, Shield, Trash2, AlertTriangle, X, KeyRound, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createTenantUser, fetchTenantUsers, updateTenantUserRole, deleteTenantUser, resetTenantUserPassword, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';

export default function Users() {
  const { isTenantAdmin } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, email }
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState(null); // { id, email }
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetShowPassword, setResetShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function loadUsers() {
    try {
      setLoadingUsers(true);
      const data = await fetchTenantUsers();
      setUsers(data || []);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to load users'), 'error');
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isTenantAdmin) return;
    setLoading(true);
    try {
      await createTenantUser({ email, password, role });
      setEmail('');
      setPassword('');
      setRole('user');
      showToast('User created successfully', 'success');
      await loadUsers();
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to create user'), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTenantUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      showToast(`User ${deleteTarget.email} deleted`, 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to delete user'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetConfirm() {
    if (!resetTarget) return;
    if (resetNewPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setResetting(true);
    try {
      await resetTenantUserPassword(resetTarget.id, resetNewPassword);
      showToast(`Password reset for ${resetTarget.email}`, 'success');
      setResetTarget(null);
      setResetNewPassword('');
      setResetShowPassword(false);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to reset password'), 'error');
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="page-shell space-y-6"
    >
      <section className="hero-panel p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 flex-shrink-0">
            <UsersIcon className="text-accent" size={22} />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-white">User Management</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Create and manage user accounts within your tenant. Assign roles and permissions.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="card">
          <div className="card-header route-line">
            <div className="flex items-center gap-2">
              <UserPlus size={18} className="text-accent" />
              <h2 className="section-title">Add New User</h2>
            </div>
          </div>
          <div className="card-body">
            {!isTenantAdmin && (
              <div className="mb-4 rounded-lg bg-amber-950/30 border border-amber-500/40 px-3 py-2.5 text-xs text-amber-300">
                Only tenant admins can create new users.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted" htmlFor="user-email">
                  Email
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                  required
                  disabled={!isTenantAdmin}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted" htmlFor="user-password">
                  Password
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                  required
                  disabled={!isTenantAdmin}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted" htmlFor="user-role">
                  Role
                </label>
                <select
                  id="user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                  disabled={!isTenantAdmin}
                >
                  <option value="user">User</option>
                  <option value="tenant_admin">Tenant Admin</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading || !isTenantAdmin}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                {loading ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header route-line">
            <div className="flex items-center gap-2">
              <UsersIcon size={18} className="text-accent" />
              <h2 className="section-title">Team Members</h2>
              <span className="ml-2 rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                {users.length}
              </span>
            </div>
          </div>
          <div className="card-body">
            {loadingUsers ? (
              <div className="py-16 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent"></div>
                <p className="mt-3 text-sm text-muted">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center">
                <UsersIcon className="mx-auto mb-4 text-muted" size={38} />
                <h3 className="text-lg font-bold text-white">No users yet</h3>
                <p className="mt-1 text-sm text-muted">Create your first user to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th text-left">Email</th>
                      <th className="table-th text-left">Role</th>
                      <th className="table-th text-center w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {users.map((u, index) => (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.22, delay: index * 0.02 }}
                          className="table-row-hover"
                        >
                          <td className="table-td font-mono text-white">{u.email}</td>
                          <td className="table-td">
                            {isTenantAdmin ? (
                              <select
                                value={u.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  try {
                                    await updateTenantUserRole(u.id, newRole);
                                    setUsers((prev) =>
                                      prev.map((usr) =>
                                        usr.id === u.id ? { ...usr, role: newRole } : usr,
                                      ),
                                    );
                                    showToast('Role updated', 'success');
                                  } catch (err) {
                                    showToast(getErrorMessage(err, 'Failed to update role'), 'error');
                                  }
                                }}
                                className="rounded-md bg-[#05060b] border border-border/60 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                              >
                                <option value="user">User</option>
                                <option value="tenant_admin">Tenant Admin</option>
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-elevated/40 px-2.5 py-1 text-xs font-semibold capitalize text-gray-300">
                                {u.role === 'tenant_admin' && <Shield size={12} />}
                                {u.role.replace('_', ' ')}
                              </span>
                            )}
                          </td>
                          <td className="table-td text-center w-24">
                            {isTenantAdmin && (
                              <div className="inline-flex items-center gap-1.5 justify-center">
                                <button
                                  type="button"
                                  title="Reset password"
                                  onClick={() => { setResetTarget({ id: u.id, email: u.email }); setResetNewPassword(''); setResetShowPassword(false); }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-accent/40 hover:text-accent transition-colors"
                                >
                                  <KeyRound size={14} />
                                </button>
                                <button
                                  type="button"
                                  title="Delete user"
                                  onClick={() => setDeleteTarget({ id: u.id, email: u.email })}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-danger/40 hover:text-danger transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>

      {/* Reset password modal */}
      <AnimatePresence>
        {resetTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 lg:left-[19rem] z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => !resetting && setResetTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-accent/40 bg-surface/90 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/35 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
                    <KeyRound className="text-accent" size={18} />
                  </div>
                  <p className="font-bold text-white">Reset Password</p>
                </div>
                <button
                  onClick={() => !resetting && setResetTarget(null)}
                  className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-5 p-6">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Set a new password for:</p>
                  <div className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2">
                    <p className="font-mono text-sm text-accent">{resetTarget.email}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.15em] text-muted mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={resetShowPassword ? 'text' : 'password'}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setResetShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                    >
                      {resetShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setResetTarget(null); setResetNewPassword(''); }}
                    disabled={resetting}
                    className="flex-1 rounded-xl border border-border/60 bg-surface-elevated/60 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-surface-elevated hover:text-white transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetConfirm}
                    disabled={resetting || resetNewPassword.length < 6}
                    className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-accent/90 transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {resetting ? (
                      <><div className="h-4 w-4 border-2 border-slate-800/30 border-t-slate-900 rounded-full animate-spin" />Resetting...</>
                    ) : (
                      <><KeyRound size={15} />Reset password</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal — rendered outside motion.div to avoid transform breaking fixed positioning */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 lg:left-[19rem] z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-danger/40 bg-surface/90 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/35 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-danger/15">
                    <AlertTriangle className="text-danger" size={18} />
                  </div>
                  <p className="font-bold text-white">Delete User</p>
                </div>
                <button
                  onClick={() => !deleting && setDeleteTarget(null)}
                  className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-5 p-6">
                <p className="text-sm text-slate-300">
                  Are you sure you want to delete this user? This action cannot be undone.
                </p>
                <div className="rounded-xl border border-danger/25 bg-danger/5 p-3">
                  <p className="font-mono text-sm text-danger">{deleteTarget.email}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    disabled={deleting}
                    className="flex-1 rounded-xl border border-border/60 bg-surface-elevated/60 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-surface-elevated hover:text-white transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-danger px-4 py-2.5 text-sm font-bold text-white hover:bg-danger-hover transition disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {deleting ? (
                      <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting...</>
                    ) : (
                      <><Trash2 size={15} />Delete user</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
