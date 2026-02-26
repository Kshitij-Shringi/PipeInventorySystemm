import React, { useEffect, useState } from 'react';
import {
  adminFetchTenants,
  adminFetchTenantRequests,
  adminApproveTenantRequest,
  adminRejectTenantRequest,
  adminLogout,
  adminCreateTenant,
  loadAdminStoredToken,
  getErrorMessage,
} from '../api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  PlusCircle,
  LogOut,
  Loader2,
  AlertCircle,
  ChevronRight,
  ClipboardList,
  Activity,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [approveTenantName, setApproveTenantName] = useState('');
  const [approvePassword, setApprovePassword] = useState('');
  const [approveError, setApproveError] = useState('');
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [createTenantName, setCreateTenantName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'active').length;
  const suspendedTenants = tenants.filter((t) => t.status === 'suspended').length;

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [tenantsRes, requestsRes] = await Promise.all([
        adminFetchTenants(),
        adminFetchTenantRequests(),
      ]);
      setTenants(tenantsRes?.items || []);
      setRequests(requestsRes?.items || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminStoredToken();
    const token = window.localStorage.getItem('admin_auth_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadData();
  }, [navigate]);

  function handleLogout() {
    adminLogout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#050816] via-slate-950 to-[#020617] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/3 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/3 left-0 w-96 h-96 bg-purple-500/4 rounded-full blur-3xl" />
      </div>

      {/* Admin Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 border-b border-border/50 bg-[#050816]/80 backdrop-blur-xl px-6 py-4"
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10">
              <Shield className="text-accent" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] text-accent/80 uppercase">
                Global admin
              </p>
              <h1 className="text-lg font-bold text-white leading-tight">Control Plane</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {loading && (
              <Loader2 className="h-4 w-4 text-accent animate-spin" />
            )}
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setShowCreateTenant(true);
                setCreateTenantName('');
                setCreateEmail('');
                setCreatePassword('');
                setCreateError('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/60 bg-accent/10 text-accent hover:bg-accent hover:text-slate-950 text-xs font-semibold transition-all"
            >
              <PlusCircle size={14} />
              Add tenant
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-transparent text-gray-400 hover:border-red-500/50 hover:text-red-300 text-xs font-semibold transition-all"
            >
              <LogOut size={14} />
              Sign out
            </motion.button>
          </div>
        </div>
      </motion.header>

      <main className="relative z-10 px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Stats Strip */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid gap-4 sm:grid-cols-3"
          >
            {[
              {
                label: 'Total Tenants',
                value: totalTenants,
                icon: Building2,
                color: 'text-accent',
                border: 'border-accent/30',
                bg: 'bg-accent/5',
              },
              {
                label: 'Active',
                value: activeTenants,
                icon: Activity,
                color: 'text-emerald-400',
                border: 'border-emerald-500/30',
                bg: 'bg-emerald-500/5',
              },
              {
                label: 'Suspended',
                value: suspendedTenants,
                icon: AlertCircle,
                color: 'text-amber-400',
                border: 'border-amber-500/30',
                bg: 'bg-amber-500/5',
              },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className={`rounded-2xl border ${stat.border} ${stat.bg} px-5 py-5 flex items-center gap-4`}
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${stat.border} bg-black/30`}>
                  <stat.icon className={stat.color} size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{stat.label}</p>
                  <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.section>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Create Tenant Form */}
          <AnimatePresence>
            {showCreateTenant && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-accent/35 bg-[#0e0b1e]/80 backdrop-blur-sm p-6 shadow-xl"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
                      <PlusCircle className="text-accent" size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-white">Create new tenant</h2>
                      <p className="text-xs text-gray-400">Provision a workspace, database, and admin user.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowCreateTenant(false); setCreateError(''); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition"
                  >
                    <XCircle size={18} />
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2.5 text-xs text-red-400">
                    <AlertCircle size={14} className="mt-0.5" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3 mb-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-300">Tenant name</label>
                    <input
                      type="text"
                      value={createTenantName}
                      onChange={(e) => setCreateTenantName(e.target.value)}
                      placeholder="e.g. Pedals Up"
                      className="w-full rounded-lg border border-border/60 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70 transition"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-300">Admin email</label>
                    <input
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full rounded-lg border border-border/60 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70 transition"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-300">Admin password</label>
                    <input
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full rounded-lg border border-border/60 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70 transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">A dedicated database and default collections will be provisioned.</p>
                  <motion.button
                    type="button"
                    disabled={createLoading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={async () => {
                      if (!createTenantName.trim() || !createEmail.trim() || !createPassword.trim()) {
                        setCreateError('Tenant name, admin email, and password are required.');
                        return;
                      }
                      if (createPassword.length < 6) {
                        setCreateError('Password must be at least 6 characters.');
                        return;
                      }
                      setCreateError('');
                      try {
                        setCreateLoading(true);
                        const created = await adminCreateTenant({
                          tenant_name: createTenantName.trim(),
                          email: createEmail.trim(),
                          password: createPassword,
                        });
                        setTenants((prev) => [{ ...created }, ...prev]);
                        setShowCreateTenant(false);
                        setCreateTenantName('');
                        setCreateEmail('');
                        setCreatePassword('');
                      } catch (err) {
                        setCreateError(getErrorMessage(err, 'Failed to create tenant'));
                      } finally {
                        setCreateLoading(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-accent/70 bg-accent text-slate-950 text-xs font-bold hover:bg-accent/90 disabled:opacity-60 transition"
                  >
                    {createLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {createLoading ? 'Creating...' : 'Create tenant'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration Requests */}
          <AnimatePresence>
            {requests.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-2xl border border-amber-500/25 bg-amber-950/10 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10">
                    <ClipboardList className="text-amber-400" size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Pending registration requests
                      <span className="ml-2 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                        {requests.length}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400">Approve to provision a tenant workspace and allow sign-in.</p>
                  </div>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Email</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Suggested name</th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Requested</th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted w-56">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((req, idx) => (
                        <motion.tr
                          key={req.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-b border-border/20 last:border-0 hover:bg-white/3 transition-colors"
                        >
                          <td className="px-3 py-3 font-medium text-white">{req.email}</td>
                          <td className="px-3 py-3 text-gray-400">{req.tenant_name || '—'}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">
                            {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {approvingId === req.id ? (
                              <div className="flex flex-col gap-2 items-end">
                                <input
                                  type="text"
                                  value={approveTenantName}
                                  onChange={(e) => setApproveTenantName(e.target.value)}
                                  placeholder="Tenant name"
                                  className="w-full rounded-lg border border-border/60 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                                />
                                <input
                                  type="password"
                                  value={approvePassword}
                                  onChange={(e) => setApprovePassword(e.target.value)}
                                  placeholder="Initial password"
                                  className="w-full rounded-lg border border-border/60 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                                />
                                {approveError && (
                                  <p className="text-[11px] text-red-400 w-full">{approveError}</p>
                                )}
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!approveTenantName.trim() || !approvePassword.trim()) {
                                        setApproveError('Tenant name and password required');
                                        return;
                                      }
                                      if (approvePassword.length < 6) {
                                        setApproveError('Password must be at least 6 characters');
                                        return;
                                      }
                                      setApproveError('');
                                      try {
                                        await adminApproveTenantRequest(req.id, {
                                          tenant_name: approveTenantName.trim(),
                                          password: approvePassword,
                                        });
                                        setApprovingId(null);
                                        setApproveTenantName('');
                                        setApprovePassword('');
                                        loadData();
                                      } catch (err) {
                                        setApproveError(getErrorMessage(err, 'Approve failed'));
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-semibold"
                                  >
                                    <CheckCircle2 size={12} /> Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setApprovingId(null); setApproveTenantName(''); setApprovePassword(''); setApproveError(''); }}
                                    className="text-xs px-3 py-1.5 rounded-lg border border-border/50 text-gray-400 hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => { setApprovingId(req.id); setApproveTenantName(req.tenant_name || ''); setApprovePassword(''); setApproveError(''); }}
                                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-semibold"
                                >
                                  <CheckCircle2 size={12} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await adminRejectTenantRequest(req.id);
                                      loadData();
                                    } catch (err) {
                                      setError(getErrorMessage(err, 'Reject failed'));
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-600/20 text-red-300 hover:bg-red-600/30 font-semibold"
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Tenants Table */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-border/50 bg-surface/70 backdrop-blur-sm shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-surface-elevated/50">
                  <Building2 className="text-accent" size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">All tenants</h2>
                  <p className="text-xs text-gray-400">Click a row to open the detailed cockpit.</p>
                </div>
              </div>
              {loading && <Loader2 className="h-4 w-4 text-muted animate-spin" />}
            </div>

            {tenants.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="mx-auto mb-4 text-muted" size={36} />
                <p className="text-sm text-muted">No tenants yet.</p>
                <p className="mt-1 text-xs text-gray-500">Use "Add tenant" to provision your first workspace.</p>
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border/30 bg-surface-elevated/20">
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Name</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Status</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">Created</th>
                      <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {tenants.map((t, idx) => (
                        <motion.tr
                          key={t.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-b border-border/20 last:border-0 hover:bg-white/4 cursor-pointer transition-colors group"
                          onClick={() => navigate(`/admin/tenants/${t.id}`)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {t.logo_url ? (
                                <div className="h-8 w-8 rounded-lg border border-border/50 overflow-hidden flex-shrink-0">
                                  <img src={t.logo_url} alt={t.name} className="h-full w-full object-contain" />
                                </div>
                              ) : (
                                <div className="h-8 w-8 rounded-lg border border-border/50 bg-accent/10 flex items-center justify-center flex-shrink-0">
                                  <Building2 size={14} className="text-accent" />
                                </div>
                              )}
                              <span className="text-sm font-semibold text-white group-hover:text-accent transition-colors">{t.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
                                t.status === 'active'
                                  ? 'bg-emerald-600/10 text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenants/${t.id}`); }}
                              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border/40 text-muted hover:border-accent/50 hover:text-accent transition"
                            >
                              View <ChevronRight size={12} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </motion.section>

          {/* Footer */}
          <div className="flex items-center gap-2 pb-4">
            <Users size={14} className="text-muted" />
            <p className="text-xs text-muted">
              {totalTenants} tenant{totalTenants !== 1 ? 's' : ''} provisioned ·{' '}
              {activeTenants} active
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
