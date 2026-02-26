import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  adminFetchTenantStats,
  adminUpdateTenant,
  adminUpdateTenantStatus,
  adminCreateTenantUser,
  getErrorMessage,
} from '../api';

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
  const [userSubmitting, setUserSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userError, setUserError] = useState('');

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
        setError(getErrorMessage(e, 'Failed to load tenant'));
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading tenant…</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 py-8">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="mb-4 text-xs rounded-lg border border-border/60 px-3 py-1.5 text-gray-300 hover:border-accent/60 hover:text-white"
        >
          ← Back to Control plane
        </button>
        <p className="text-sm text-red-400">{error || 'Tenant not found.'}</p>
      </div>
    );
  }

  const stats = tenant.stats || {};

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Admin navbar */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80">
                Global admin
              </p>
              <h1 className="text-2xl font-semibold">Tenant cockpit</h1>
            </div>
            <nav className="hidden sm:flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="rounded-full border border-border/60 px-3 py-1 text-gray-300 hover:border-accent/60 hover:text-white"
              >
                Overview
              </button>
              <span className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-accent">
                Tenant detail
              </span>
            </nav>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-[#050816] text-gray-300 hover:border-accent/60 hover:text-white hover:bg-accent/10 transition"
          >
            Back to tenants
          </button>
        </header>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Hero band */}
        <section className="rounded-2xl border border-border/70 bg-surface/90 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <div className="h-12 w-12 rounded-xl border border-border/70 bg-black/40 flex items-center justify-center overflow-hidden">
                <img
                  src={tenant.logo_url}
                  alt={tenant.name || 'Tenant logo'}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-12 w-12 rounded-xl border border-border/70 bg-black/30" />
            )}
            <div>
              <h2 className="text-xl font-semibold">{tenant.name || 'Unnamed tenant'}</h2>
              <p className="mt-1 text-[11px] text-gray-400">
                ID {tenant.id} · DB {tenant.db_name || 'n/a'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Status</span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                  tenant.status === 'active'
                    ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                }`}
              >
                {tenant.status}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    setError('');
                    const updated = await adminUpdateTenant(tenant.id, {
                      name: editingName,
                      logo_url: editingLogo,
                    });
                    setTenant((prev) => ({ ...prev, ...updated }));
                  } catch (e) {
                    setError(getErrorMessage(e, 'Failed to save changes'));
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-accent/70 bg-accent text-slate-950 hover:bg-accent-hover text-xs disabled:opacity-60"
              >
                Save changes
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    setError('');
                    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';
                    await adminUpdateTenantStatus(tenant.id, nextStatus);
                    setTenant((prev) => ({ ...prev, status: nextStatus }));
                  } catch (e) {
                    setError(getErrorMessage(e, 'Failed to update status'));
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg border border-border/60 bg-black/40 text-gray-200 hover:border-amber-400 hover:text-amber-200 text-xs disabled:opacity-60"
              >
                {tenant.status === 'active' ? 'Suspend tenant' : 'Activate tenant'}
              </button>
            </div>
          </div>
        </section>

        {/* Stat strip */}
        <section className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/60 bg-surface/90 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Users</p>
            <p className="mt-2 text-2xl font-semibold">{stats.user_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface/90 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Inventory docs</p>
            <p className="mt-2 text-2xl font-semibold">{stats.inventory_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface/90 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Orders</p>
            <p className="mt-2 text-2xl font-semibold">{stats.orders_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-surface/90 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">Stock activity</p>
            <p className="mt-2 text-2xl font-semibold">{stats.stock_activity_count ?? 0}</p>
          </div>
        </section>

        {/* Main layout */}
        <section className="grid gap-5 lg:grid-cols-[1.5fr,1.2fr]">
          {/* Left: identity + users */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4 space-y-3 text-xs">
              <h2 className="text-sm font-semibold">Identity</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] text-muted mb-1">Tenant name</p>
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted mb-1">Logo URL</p>
                  <input
                    type="text"
                    value={editingLogo}
                    onChange={(e) => setEditingLogo(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Created{' '}
                {tenant.created_at
                  ? new Date(tenant.created_at).toLocaleDateString()
                  : '—'}
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Users</h2>
                <span className="text-[10px] text-muted">
                  {(tenant.users || []).length} shown
                </span>
              </div>

              {/* Add user inline form */}
              <div className="rounded-xl border border-border/50 bg-black/25 px-3 py-3 space-y-2">
                <p className="text-[11px] font-semibold text-gray-200">Add user to tenant</p>
                {userError && (
                  <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-2 py-1">
                    {userError}
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-[2fr,2fr,1fr_auto]">
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="rounded-md border border-border/60 bg-black/40 px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                  />
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Initial password"
                    className="rounded-md border border-border/60 bg-black/40 px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="rounded-md border border-border/60 bg-black/40 px-2 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                  >
                    <option value="user">User</option>
                    <option value="tenant_admin">Tenant admin</option>
                  </select>
                  <button
                    type="button"
                    disabled={userSubmitting}
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
                        // Reload users list from stats
                        const updated = await adminFetchTenantStats(tenant.id);
                        setTenant(updated);
                        setNewUserEmail('');
                        setNewUserPassword('');
                        setNewUserRole('user');
                      } catch (e) {
                        setUserError(getErrorMessage(e, 'Failed to create user'));
                      } finally {
                        setUserSubmitting(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-md border border-accent/70 bg-accent text-slate-950 text-[11px] hover:bg-accent-hover disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>
              </div>

              {(!tenant.users || tenant.users.length === 0) ? (
                <p className="text-xs text-muted">No users for this tenant yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto thin-scrollbar">
                  <table className="w-full text-left text-[11px] text-gray-200">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted">
                        <th className="py-1 pr-2">Email</th>
                        <th className="py-1 pr-2">Role</th>
                        <th className="py-1 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.users.map((u) => (
                        <tr key={u.id} className="border-b border-border/15 last:border-0">
                          <td className="py-1 pr-2 truncate max-w-[220px]">{u.email}</td>
                          <td className="py-1 pr-2 capitalize text-gray-300">{u.role}</td>
                          <td className="py-1 text-right text-[10px] text-gray-500">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: inventory + orders */}
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Inventory snapshot</h2>
                <span className="text-[10px] text-muted">
                  {(tenant.inventory_sample || []).length} rows
                </span>
              </div>
              {(!tenant.inventory_sample || tenant.inventory_sample.length === 0) ? (
                <p className="text-xs text-muted">No inventory rows for this tenant yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto thin-scrollbar">
                  <table className="w-full text-left text-[11px] text-gray-200">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted">
                        <th className="py-1 pr-2">H × W × L</th>
                        <th className="py-1 pr-2 text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.inventory_sample.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/15 last:border-0">
                          <td className="py-1 pr-2">
                            {row.height} × {row.width} × {row.length}
                          </td>
                          <td className="py-1 pr-2 text-right font-mono">
                            {row.quantity ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/60 bg-surface/90 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">Recent orders</h2>
                <span className="text-[10px] text-muted">
                  {(tenant.recent_orders || []).length} shown
                </span>
              </div>
              {(!tenant.recent_orders || tenant.recent_orders.length === 0) ? (
                <p className="text-xs text-muted">No orders have been recorded yet.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto thin-scrollbar">
                  <table className="w-full text-left text-[11px] text-gray-200">
                    <thead>
                      <tr className="border-b border-border/40 text-[10px] uppercase tracking-wide text-muted">
                        <th className="py-1 pr-2">Recipient</th>
                        <th className="py-1 pr-2 text-right">Pipes used</th>
                        <th className="py-1 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenant.recent_orders.map((o) => (
                        <tr key={o.id} className="border-b border-border/15 last:border-0">
                          <td className="py-1 pr-2 truncate max-w-[180px]">
                            {o.recipient || '—'}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {o.summary?.pipes_consumed ?? 0}
                          </td>
                          <td className="py-1 text-right text-[10px] text-gray-500">
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
        </section>
      </div>
    </div>
  );
}

