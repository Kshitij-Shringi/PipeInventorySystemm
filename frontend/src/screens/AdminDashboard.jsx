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
    <div className="min-h-screen w-full bg-slate-950 text-white">
      {/* Admin top bar */}
      <header className="border-b border-border/60 bg-[#050816]/80 backdrop-blur px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80">
            Global admin
          </p>
          <h1 className="text-xl font-semibold mt-1">Control plane</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Manage tenants, onboarding requests, and high-level usage across the platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreateTenant(true);
              setCreateTenantName('');
              setCreateEmail('');
              setCreatePassword('');
              setCreateError('');
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-accent/70 bg-accent/10 text-accent hover:bg-accent hover:text-slate-950 transition"
          >
            Add tenant
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-transparent text-gray-300 hover:border-accent/60 hover:text-white hover:bg-accent/10 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="px-6 py-6">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* High-level stats */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-surface/80 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Tenants</p>
              <p className="mt-2 text-2xl font-semibold">{totalTenants}</p>
            </div>
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/80">
                Active
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{activeTenants}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-200/80">
                Suspended
              </p>
              <p className="mt-2 text-2xl font-semibold text-amber-200">{suspendedTenants}</p>
            </div>
          </section>

          {error && (
            <div className="mb-2 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {showCreateTenant && (
          <div className="rounded-2xl border border-accent/40 bg-[#18122b] p-4 shadow-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-accent/90">Create tenant</h2>
                <p className="text-[11px] text-gray-400">
                  Provision a new tenant, database, and first admin user.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateTenant(false);
                  setCreateError('');
                }}
                className="text-[11px] px-2 py-1 rounded-md border border-border/60 text-gray-400 hover:text-white hover:border-accent/60"
              >
                Close
              </button>
            </div>

            {createError && (
              <p className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
                {createError}
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-3 text-xs">
              <div className="md:col-span-1">
                <label className="block text-[11px] text-gray-400 mb-1">Tenant name</label>
                <input
                  type="text"
                  value={createTenantName}
                  onChange={(e) => setCreateTenantName(e.target.value)}
                  placeholder="e.g. Pedals Up"
                  className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[11px] text-gray-400 mb-1">Admin email</label>
                <input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-[11px] text-gray-400 mb-1">Admin password</label>
                <input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-gray-500">
                A dedicated DB and default collections will be created for this tenant.
              </p>
              <button
                type="button"
                disabled={loading}
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
                    setLoading(true);
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
                    setLoading(false);
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-accent/70 bg-accent text-slate-950 hover:bg-accent-hover transition disabled:opacity-60"
              >
                Create tenant
              </button>
            </div>
          </div>
          )}

          {/* Registration requests */}
          {requests.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 shadow-lg">
            <h2 className="text-sm font-semibold mb-3 text-amber-200/90">Registration requests</h2>
            <p className="text-xs text-gray-400 mb-3">Approve to create tenant and let the user sign in.</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-gray-200">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Suggested name</th>
                    <th className="px-2 py-2">Requested</th>
                    <th className="px-2 py-2 w-48 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className="border-b border-border/20 last:border-0">
                      <td className="px-2 py-2 font-medium">{req.email}</td>
                      <td className="px-2 py-2 text-gray-400">{req.tenant_name || '—'}</td>
                      <td className="px-2 py-2 text-[11px] text-gray-400">
                        {req.created_at ? new Date(req.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {approvingId === req.id ? (
                          <div className="flex flex-col gap-2 items-end">
                            <input
                              type="text"
                              value={approveTenantName}
                              onChange={(e) => setApproveTenantName(e.target.value)}
                              placeholder="Tenant name"
                              className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                            />
                            <input
                              type="password"
                              value={approvePassword}
                              onChange={(e) => setApprovePassword(e.target.value)}
                              placeholder="Initial password"
                              className="w-full rounded-md border border-border/60 bg-black/30 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                            />
                            {approveError && (
                              <p className="text-[11px] text-red-400 w-full">{approveError}</p>
                            )}
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!approveTenantName.trim() || !approvePassword.trim()) {
                                    setApproveError('Tenant name and password required');
                                    return;
                                  }
                                  if (approvePassword.length < 6) {
                                    setApproveError('Password at least 6 characters');
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
                                className="text-[11px] px-2 py-1 rounded border border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovingId(null);
                                  setApproveTenantName('');
                                  setApprovePassword('');
                                  setApproveError('');
                                }}
                                className="text-[11px] px-2 py-1 rounded border border-border/60 text-gray-400 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setApprovingId(req.id);
                                setApproveTenantName(req.tenant_name || '');
                                setApprovePassword('');
                                setApproveError('');
                              }}
                              className="text-[11px] px-2 py-1 rounded border border-emerald-500/50 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30"
                            >
                              Approve
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
                              className="text-[11px] px-2 py-1 rounded border border-red-500/40 bg-red-600/20 text-red-300 hover:bg-red-600/30"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Tenants list */}
          <section className="rounded-2xl border border-border/60 bg-surface/85 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">Tenants</h2>
                <p className="text-[11px] text-gray-500">
                  Click a row to open a detailed cockpit for that tenant.
                </p>
              </div>
              {loading && <span className="text-[11px] text-gray-400">Loading…</span>}
            </div>
            {tenants.length === 0 ? (
              <p className="text-xs text-gray-400">No tenants yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs text-gray-200">
                  <thead>
                    <tr className="border-b border-border/40 text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Created</th>
                      <th className="px-3 py-2 w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-border/20 last:border-0 hover:bg-white/5 cursor-pointer"
                        onClick={() => navigate(`/admin/tenants/${t.id}`)}
                      >
                        <td className="px-3 py-2 text-xs font-medium">{t.name}</td>
                        <td className="px-3 py-2 text-xs capitalize">
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
                        <td className="px-3 py-2 text-[11px] text-gray-400">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/tenants/${t.id}`);
                            }}
                            className="text-[11px] px-3 py-1 rounded-md border border-border/60 hover:border-accent/60 hover:bg-accent/10"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

