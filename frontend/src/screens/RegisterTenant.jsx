import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerTenant, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';

export default function RegisterTenant() {
  const navigate = useNavigate();
  const { loginToken } = useAuth();
  const [tenantName, setTenantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await registerTenant({ email, password, tenant_name: tenantName });
      if (res?.access_token) {
        loginToken(res.access_token);
      }
      navigate('/inventory');
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050816] to-[#020617] px-4">
      <div className="w-full max-w-5xl grid gap-8 md:grid-cols-[1.4fr,1fr] items-center">
        <div className="hidden md:block">
          <div className="rounded-3xl border border-accent/40 bg-black/20 px-7 py-8 shadow-[0_0_80px_rgba(56,189,248,0.25)]">
            <p className="text-xs uppercase tracking-[0.25em] text-accent/80 mb-3">
              Get started in minutes
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-white mb-3">
              Create a tenant for your projects.
            </h1>
            <p className="text-sm text-gray-300 mb-5 max-w-md">
              Each tenant gets isolated inventory, orders, and users. Perfect for agencies,
              contractors, or separate business units.
            </p>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                One dashboard per company or site.
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Invite additional users later from the Users tab.
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                No shared data between tenants.
              </li>
            </ul>
          </div>
        </div>

        <div className="w-full">
          <div className="w-full max-w-md ml-auto mr-auto md:mr-0 rounded-2xl border border-border/60 bg-surface/95 px-7 py-8 shadow-xl backdrop-blur">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent/80 uppercase mb-2">
                New tenant
              </p>
              <h2 className="text-2xl font-semibold text-white">Register tenant</h2>
              <p className="mt-1 text-xs text-gray-400">
                This will create your company workspace and first admin user.
              </p>
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1.5" htmlFor="tenant-name">
                  Tenant name
                </label>
                <input
                  id="tenant-name"
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
                  placeholder="e.g. Astral Pipes – Site A"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1.5" htmlFor="tenant-email">
                  Owner email
                </label>
                <input
                  id="tenant-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1.5" htmlFor="tenant-password">
                  Owner password
                </label>
                <input
                  id="tenant-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-60"
              >
                {loading ? 'Creating tenant...' : 'Create tenant'}
              </button>
            </form>

            <p className="mt-4 text-xs text-gray-400 text-center">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

