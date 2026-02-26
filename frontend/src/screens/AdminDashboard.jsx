import React, { useEffect, useState } from 'react';
import {
  adminFetchTenants,
  adminFetchTenantStats,
  adminLogout,
  adminUpdateTenant,
  loadAdminStoredToken,
  getErrorMessage,
} from '../api';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingLogo, setEditingLogo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdminStoredToken();
    const token = window.localStorage.getItem('admin_auth_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await adminFetchTenants();
        setTenants(res?.items || []);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load tenants'));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function handleSelectTenant(id) {
    try {
      setLoading(true);
      setError('');
      const stats = await adminFetchTenantStats(id);
      setSelectedTenant(stats);
      setEditingName(stats.name || '');
      setEditingLogo(stats.logo_url || '');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load tenant stats'));
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    adminLogout();
    navigate('/admin/login');
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-accent/80 mb-1">
              Global admin
            </p>
            <h1 className="text-2xl font-semibold">Tenant overview</h1>
            <p className="text-xs text-gray-400 mt-1">
              Inspect tenants, their status, and high-level usage.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-[#050816] text-gray-300 hover:border-accent/60 hover:text-white hover:bg-accent/10 transition"
          >
            Sign out
          </button>
        </div>

        {error && (
          <div className="mb-2 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-[1.3fr,1.1fr]">
          {/* Tenants list */}
          <div className="rounded-2xl border border-border/60 bg-surface/80 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Tenants</h2>
              {loading && <span className="text-[11px] text-gray-400">Loading…</span>}
            </div>
            {tenants.length === 0 ? (
              <p className="text-xs text-gray-400">No tenants yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-gray-200">
                  <thead>
                    <tr className="border-b border-border/40 text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-2 py-2">Name</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => {
                      const isSelected = selectedTenant?.id === t.id;
                      return (
                        <tr
                          key={t.id}
                          className={`border-b border-border/20 last:border-0 ${
                            isSelected ? 'bg-accent/5' : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="px-2 py-2 text-xs font-medium">{t.name}</td>
                          <td className="px-2 py-2 text-xs capitalize">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                t.status === 'active'
                                  ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-[11px] text-gray-400">
                            {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-2 py-2 text-xs text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectTenant(t.id)}
                              className={`text-[11px] px-3 py-1 rounded-md border transition ${
                                isSelected
                                  ? 'border-accent/70 bg-accent/15 text-accent'
                                  : 'border-border/60 hover:border-accent/60 hover:bg-accent/10'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'View'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tenant details */}
          <div className="rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-lg">
            <h2 className="text-sm font-semibold mb-3">Tenant details</h2>
            {!selectedTenant ? (
              <p className="text-xs text-gray-400">Select a tenant on the left to inspect details.</p>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {selectedTenant.logo_url ? (
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-border/60 bg-black/30 flex items-center justify-center">
                        <img
                          src={selectedTenant.logo_url}
                          alt={selectedTenant.name || 'Tenant logo'}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-lg border border-border/60 bg-black/30" />
                    )}
                    <div>
                      <p className="text-[11px] text-gray-400">Tenant name</p>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="mt-1 w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400">Status</p>
                    <p className="text-xs capitalize mt-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          selectedTenant.status === 'active'
                            ? 'bg-emerald-600/15 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {selectedTenant.status}
                      </span>
                    </p>
                    <p className="mt-2 text-[11px] text-gray-500">
                      Created:{' '}
                      {selectedTenant.created_at
                        ? new Date(selectedTenant.created_at).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400">Logo URL</p>
                  <input
                    type="text"
                    value={editingLogo}
                    onChange={(e) => setEditingLogo(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-border/50 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-gray-400">Users</p>
                    <p className="text-base font-semibold">
                      {selectedTenant.stats?.user_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-gray-400">DB name</p>
                    <p className="text-[11px] font-mono text-gray-300 truncate">
                      {selectedTenant.db_name || 'n/a'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="rounded-xl border border-border/50 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-gray-400">Inventory docs</p>
                    <p className="text-base font-semibold">
                      {selectedTenant.stats?.inventory_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-gray-400">Orders</p>
                    <p className="text-base font-semibold">
                      {selectedTenant.stats?.orders_count ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-black/20 px-3 py-2">
                    <p className="text-[10px] text-gray-400">Stock activity</p>
                    <p className="text-base font-semibold">
                      {selectedTenant.stats?.stock_activity_count ?? 0}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={async () => {
                      try {
                        setLoading(true);
                        setError('');
                        const updated = await adminUpdateTenant(selectedTenant.id, {
                          name: editingName,
                          logo_url: editingLogo,
                        });
                        setSelectedTenant({ ...selectedTenant, ...updated });
                        setTenants((prev) =>
                          prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
                        );
                      } catch (err) {
                        setError(getErrorMessage(err, 'Failed to update tenant'));
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-black/30 text-gray-200 hover:border-accent/60 hover:text-white hover:bg-accent/10 transition disabled:opacity-60"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

