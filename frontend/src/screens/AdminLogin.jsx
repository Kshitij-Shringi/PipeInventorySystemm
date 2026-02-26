import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, getErrorMessage, loadAdminStoredToken } from '../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAdminStoredToken();
    const existing = window.localStorage.getItem('admin_auth_token');
    if (existing) {
      navigate('/admin');
    }
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminLogin({ email, password });
      navigate('/admin');
    } catch (err) {
      setError(getErrorMessage(err, 'Admin login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-surface/95 px-7 py-8 shadow-xl backdrop-blur">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-accent/80 uppercase mb-2">
            Global console
          </p>
          <h1 className="text-2xl font-semibold text-white">Admin sign in</h1>
          <p className="mt-1 text-xs text-gray-400">
            Superadmin access for managing tenants and usage.
          </p>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-300 mb-1.5" htmlFor="admin-email">
              Admin email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-300 mb-1.5" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent/70"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-1 py-2.5 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent/90 transition disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in as admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

