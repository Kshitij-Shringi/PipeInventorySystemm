import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { loginToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, password });
      if (res?.access_token) {
        loginToken(res.access_token);
      }
      navigate('/inventory');
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed'));
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
              Pipe Inventory SaaS
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-semibold text-white mb-3">
              Dimensional control for every cut.
            </h1>
            <p className="text-sm text-gray-300 mb-5 max-w-md">
              Log in to manage pipe stock, run cutting analysis, and execute orders per project –
              fully isolated per tenant.
            </p>
            <ul className="space-y-2 text-xs text-gray-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Live inventory matrix across all sizes.
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Smart cutting suggestions with remainders tracking.
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Multi-tenant by design – one login per company.
              </li>
            </ul>
          </div>
        </div>

        <div className="w-full">
          <div className="w-full max-w-md ml-auto mr-auto md:mr-0 rounded-2xl border border-border/60 bg-surface/95 px-7 py-8 shadow-xl backdrop-blur">
            <div className="mb-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-accent/80 uppercase mb-2">
                Welcome back
              </p>
              <h2 className="text-2xl font-semibold text-white">Sign in</h2>
              <p className="mt-1 text-xs text-gray-400">
                Use your tenant account email and password.
              </p>
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1.5" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1.5" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-4 text-xs text-gray-400 text-center">
              Don&apos;t have a tenant yet?{' '}
              <Link to="/register" className="text-accent hover:underline">
                Register a new tenant
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

