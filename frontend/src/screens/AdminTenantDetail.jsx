import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  adminFetchTenantStats,
  adminUpdateTenant,
  adminUpdateTenantStatus,
  adminCreateTenantUser,
  getErrorMessage,
} from '../api';
import {
  Building2,
  Shield,
  Users,
  Package,
  ClipboardList,
  Activity,
  ArrowLeft,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  PowerOff,
  Power,
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, color, border, bg }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border ${border} ${bg} px-5 py-5 flex items-center gap-4`}
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${border} bg-black/30`}>
        <Icon className={color} size={20} />
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
      </div>
    </motion.div>
  );
}

export default function AdminTenantDetail() {
  const { tenantId } = useParams();
  const navigate = useNavigate();

  const [tenant, setTenant] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingLogo, setEditingLogo] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const data = await adminFetchTenantStats(tenantId);
        setTenant(data);
        setEditingName(data.name || '');
        setEditingLogo(data.logo_url || '');
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          navigate('/admin/login', { replace: true });
          return;
        }
        setError(getErrorMessage(e, 'Failed to load tenant'));
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, navigate]);

  const stats = tenant?.stats || {};

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#050816] via-slate-950 to-[#020617] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/3 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/3 left-0 w-96 h-96 bg-purple-500/4 rounded-full blur-3xl" />
      </div>

      {/* Top Bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 border-b border-border/50 bg-[#050816]/80 backdrop-blur-xl px-6 py-4"
      >
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05, x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/admin')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition"
            >
              <ArrowLeft size={16} />
              Back to tenants
            </motion.button>
            <div className="h-5 w-px bg-border/50" />
            <div className="flex items-center gap-3">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-accent/40 bg-accent/10">
                <Shield className="text-accent" size={18} />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-accent/80 uppercase">Tenant cockpit</p>
                <h1 className="text-base font-bold text-white leading-tight">{tenant?.name || 'Loading…'}</h1>
              </div>
            </div>
          </div>
          {loading && <Loader2 className="h-4 w-4 text-accent animate-spin" />}
        </div>
      </motion.header>

      <main className="relative z-10 px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-6">

          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {!tenant && loading && (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-accent animate-spin" />
              <p className="text-sm text-muted">Loading tenant details…</p>
            </div>
          )}

          {tenant && (
            <>
              {/* Hero Band */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm px-6 py-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    {tenant.logo_url ? (
                      <div className="h-14 w-14 rounded-xl border border-border/60 bg-black/40 overflow-hidden flex items-center justify-center flex-shrink-0">
                        <img src={tenant.logo_url} alt={tenant.name} className="max-h-full max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-xl border border-accent/30 bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-accent" size={24} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2
                        className="text-2xl font-bold text-white break-words max-w-xs sm:max-w-md"
                        title={tenant.name || 'Unnamed tenant'}
                      >
                        {tenant.name || 'Unnamed tenant'}
                      </h2>
                      <p className="mt-1 text-xs text-gray-400 font-mono break-all">
                        ID: {tenant.id}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Created {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border ${
                      tenant.status === 'active'
                        ? 'bg-emerald-600/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}>
                      {tenant.status === 'active' ? '● Active' : '● Suspended'}
                    </span>
                    <motion.button
                      type="button"
                      disabled={saving || statusChanging}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={async () => {
                        try {
                          setStatusChanging(true);
                          setError('');
                          const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
                          await adminUpdateTenantStatus(tenant.id, nextStatus);
                          setTenant((prev) => ({ ...prev, status: nextStatus }));
                        } catch (e) {
                          setError(getErrorMessage(e, 'Failed to update status'));
                        } finally {
                          setStatusChanging(false);
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition disabled:opacity-60 ${
                        tenant.status === 'active'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                          : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      {statusChanging ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : tenant.status === 'active' ? (
                        <PowerOff size={14} />
                      ) : (
                        <Power size={14} />
                      )}
                      {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                    </motion.button>
                  </div>
                </div>
              </motion.section>

              {/* Stat Strip */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="grid gap-4 sm:grid-cols-3"
              >
                <StatCard label="Users" value={stats.user_count ?? 0} icon={Users} color="text-accent" border="border-accent/25" bg="bg-accent/5" />
                <StatCard label="Orders" value={stats.orders_count ?? 0} icon={ClipboardList} color="text-blue-400" border="border-blue-500/25" bg="bg-blue-500/5" />
                <StatCard label="Stock activity" value={stats.stock_activity_count ?? 0} icon={Activity} color="text-purple-400" border="border-purple-500/25" bg="bg-purple-500/5" />
              </motion.section>

              {/* Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2 }}
                className="grid gap-6 lg:grid-cols-[1.5fr,1.2fr]"
              >
                {/* Left: Identity + Users */}
                <div className="space-y-5">
                  {/* Identity Card */}
                  <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6">
                    <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                      <Building2 size={16} className="text-accent" /> Identity
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tenant name</label>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full rounded-lg border border-border/60 bg-[#05060b] px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/70 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">Logo URL</label>
                        <input
                          type="text"
                          value={editingLogo}
                          onChange={(e) => setEditingLogo(e.target.value)}
                          placeholder="https://…"
                          className="w-full rounded-lg border border-border/60 bg-[#05060b] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70 transition"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <motion.button
                        type="button"
                        disabled={saving}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          try {
                            setSaving(true);
                            setSaveSuccess(false);
                            setError('');
                            const updated = await adminUpdateTenant(tenant.id, {
                              name: editingName,
                              logo_url: editingLogo,
                            });
                            setTenant((prev) => ({ ...prev, ...updated }));
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 2500);
                          } catch (e) {
                            setError(getErrorMessage(e, 'Failed to save changes'));
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/60 bg-accent text-slate-950 text-xs font-bold hover:bg-accent/90 disabled:opacity-60 transition"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Saving…' : 'Save changes'}
                      </motion.button>
                      <AnimatePresence>
                        {saveSuccess && (
                          <motion.span
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400"
                          >
                            <CheckCircle2 size={14} /> Saved
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Users Card */}
                  <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Users size={16} className="text-accent" />
                        Users
                        <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          {(tenant.users || []).length}
                        </span>
                      </h3>
                    </div>

                    {/* Add User Form */}
                    <div className="rounded-xl border border-border/40 bg-black/25 p-4 mb-4">
                      <p className="text-xs font-semibold text-gray-200 mb-3 flex items-center gap-2">
                        <UserPlus size={14} className="text-accent" /> Add user to tenant
                      </p>
                      <AnimatePresence>
                        {userError && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-3 text-xs text-red-400 bg-red-950/40 border border-red-500/40 rounded-lg px-3 py-2"
                          >
                            {userError}
                          </motion.div>
                        )}
                        {userSuccess && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="mb-3 inline-flex items-center gap-1.5 text-xs text-emerald-400"
                          >
                            <CheckCircle2 size={13} /> User added successfully
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          type="email"
                          value={newUserEmail}
                          onChange={(e) => setNewUserEmail(e.target.value)}
                          placeholder="email@example.com"
                          className="rounded-lg border border-border/60 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70"
                        />
                        <input
                          type="password"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="Initial password"
                          className="rounded-lg border border-border/60 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-accent/70"
                        />
                        <select
                          value={newUserRole}
                          onChange={(e) => setNewUserRole(e.target.value)}
                          className="rounded-lg border border-border/60 bg-black/40 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                        >
                          <option value="user">User</option>
                          <option value="tenant_admin">Tenant admin</option>
                        </select>
                        <motion.button
                          type="button"
                          disabled={userSubmitting}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={async () => {
                            if (!newUserEmail.trim() || !newUserPassword.trim()) {
                              setUserError('Email and password are required.');
                              return;
                            }
                            if (newUserPassword.length < 6) {
                              setUserError('Password must be at least 6 characters.');
                              return;
                            }
                            setUserError('');
                            try {
                              setUserSubmitting(true);
                              await adminCreateTenantUser(tenant.id, {
                                email: newUserEmail.trim(),
                                password: newUserPassword,
                                role: newUserRole,
                              });
                              const updated = await adminFetchTenantStats(tenant.id);
                              setTenant(updated);
                              setNewUserEmail('');
                              setNewUserPassword('');
                              setNewUserRole('user');
                              setUserSuccess(true);
                              setTimeout(() => setUserSuccess(false), 2500);
                            } catch (e) {
                              setUserError(getErrorMessage(e, 'Failed to create user'));
                            } finally {
                              setUserSubmitting(false);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-accent/60 bg-accent text-slate-950 text-xs font-bold hover:bg-accent/90 disabled:opacity-60 transition"
                        >
                          {userSubmitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                          {userSubmitting ? 'Adding…' : 'Add user'}
                        </motion.button>
                      </div>
                    </div>

                    {(!tenant.users || tenant.users.length === 0) ? (
                      <div className="py-8 text-center">
                        <Users className="mx-auto mb-3 text-muted" size={28} />
                        <p className="text-xs text-muted">No users for this tenant yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto no-scrollbar">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-border/40">
                              <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Email</th>
                              <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Role</th>
                              <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted">Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenant.users.map((u, i) => (
                              <motion.tr
                                key={u.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="border-b border-border/15 last:border-0"
                              >
                                <td className="py-2 pr-3 text-gray-200 truncate max-w-[180px]">{u.email}</td>
                                <td className="py-2 pr-3">
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                                    u.role === 'tenant_admin'
                                      ? 'bg-accent/10 text-accent border-accent/30'
                                      : 'bg-surface-elevated/40 text-gray-300 border-border/40'
                                  }`}>
                                    {u.role === 'tenant_admin' && <Shield size={10} />}
                                    {u.role.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-2 text-right text-[11px] text-gray-500">
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Inventory + Orders */}
                <div className="space-y-5">
                  {/* Inventory Snapshot */}
                  <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Package size={16} className="text-emerald-400" /> Inventory snapshot
                      </h3>
                      <span className="text-[11px] text-muted">{(tenant.inventory_sample || []).length} rows</span>
                    </div>
                    {(!tenant.inventory_sample || tenant.inventory_sample.length === 0) ? (
                      <div className="py-8 text-center">
                        <Package className="mx-auto mb-3 text-muted" size={28} />
                        <p className="text-xs text-muted">No inventory rows yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto no-scrollbar">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-border/40">
                              <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-muted">H × W × L</th>
                              <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted">Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenant.inventory_sample.map((row, idx) => (
                              <tr key={idx} className="border-b border-border/15 last:border-0">
                                <td className="py-2 pr-3 font-mono text-gray-200">
                                  {row.height} × {row.width} × {row.length}
                                </td>
                                <td className="py-2 text-right font-mono font-semibold text-white">
                                  {row.quantity ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Orders */}
                  <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ClipboardList size={16} className="text-blue-400" /> Recent orders
                      </h3>
                      <span className="text-[11px] text-muted">{(tenant.recent_orders || []).length} shown</span>
                    </div>
                    {(!tenant.recent_orders || tenant.recent_orders.length === 0) ? (
                      <div className="py-8 text-center">
                        <ClipboardList className="mx-auto mb-3 text-muted" size={28} />
                        <p className="text-xs text-muted">No orders recorded yet.</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto no-scrollbar">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-border/40">
                              <th className="py-2 pr-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Recipient</th>
                              <th className="py-2 pr-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted">Pipes</th>
                              <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-muted">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tenant.recent_orders.map((o) => (
                              <tr key={o.id} className="border-b border-border/15 last:border-0">
                                <td className="py-2 pr-3 text-gray-200 truncate max-w-[140px]">{o.recipient || '—'}</td>
                                <td className="py-2 pr-3 text-right font-mono text-white font-semibold">
                                  {o.summary?.pipes_consumed ?? 0}
                                </td>
                                <td className="py-2 text-right text-[11px] text-gray-500">
                                  {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
