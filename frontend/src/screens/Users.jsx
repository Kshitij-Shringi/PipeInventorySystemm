import React, { useEffect, useState } from 'react';
import { createTenantUser, fetchTenantUsers, updateTenantUserRole, deleteTenantUser, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';

export default function Users() {
  const { isTenantAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadUsers() {
    try {
      const data = await fetchTenantUsers();
      setUsers(data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isTenantAdmin) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createTenantUser({ email, password, role });
      setEmail('');
      setPassword('');
      setRole('user');
      await loadUsers();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create user'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-muted">Manage accounts within this tenant.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/40 bg-surface-elevated/40 p-4 lg:col-span-1">
          <h2 className="text-sm font-semibold text-white mb-3">Add user</h2>
          {!isTenantAdmin && (
            <p className="mb-3 text-xs text-muted">Only tenant admins can create new users.</p>
          )}
          {error && (
            <div className="mb-3 text-xs text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1" htmlFor="user-email">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
                disabled={!isTenantAdmin}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1" htmlFor="user-password">
                Password
              </label>
              <input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
                disabled={!isTenantAdmin}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1" htmlFor="user-role">
                Role
              </label>
              <select
                id="user-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                disabled={!isTenantAdmin}
              >
                <option value="user">User</option>
                <option value="tenant_admin">Tenant admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || !isTenantAdmin}
              className="w-full mt-1 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create user'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border/40 bg-surface-elevated/40 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-3">Existing users</h2>
          {users.length === 0 ? (
            <p className="text-xs text-muted">No users yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-gray-200">
                <thead>
                  <tr className="border-b border-border/40 text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border/20 last:border-0">
                      <td className="px-2 py-2 text-xs">{u.email}</td>
                      <td className="px-2 py-2 text-xs capitalize">
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
                              } catch (err) {
                                setError(getErrorMessage(err, 'Failed to update role'));
                              }
                            }}
                            className="rounded-md bg-[#05060b] border border-border/60 px-2 py-1 text-xs text-white"
                          >
                            <option value="user">User</option>
                            <option value="tenant_admin">Tenant admin</option>
                          </select>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-right">
                        {isTenantAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm(`Delete user ${u.email}?`)) return;
                              try {
                                await deleteTenantUser(u.id);
                                setUsers((prev) => prev.filter((usr) => usr.id !== u.id));
                              } catch (err) {
                                setError(getErrorMessage(err, 'Failed to delete user'));
                              }
                            }}
                            className="rounded-md border border-border/60 px-2 py-1 text-[11px] text-red-300 hover:border-red-400 hover:text-red-200"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

