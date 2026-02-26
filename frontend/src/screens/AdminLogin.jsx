import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
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
    if (existing) navigate('/admin');
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#050816] via-slate-950 to-[#020617] px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="rounded-2xl border border-border/60 bg-surface/95 backdrop-blur-xl px-8 py-10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/20 to-accent/5 mb-4 shadow-lg shadow-accent/10"
            >
              <Shield className="text-accent" size={28} />
            </motion.div>
            <p className="text-xs font-semibold tracking-[0.22em] text-accent/80 uppercase mb-1">
              Global console
            </p>
            <h1 className="text-2xl font-bold text-white">Admin sign in</h1>
            <p className="mt-2 text-sm text-gray-400">
              Superadmin portal for managing tenants and platform usage.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3"
            >
              <span>⚠</span><span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2" htmlFor="admin-email">
                <Mail size={14} /> Admin email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent transition-all"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2" htmlFor="admin-password">
                <Lock size={14} /> Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent transition-all"
                placeholder="Enter admin password"
                required
              />
            </div>
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-accent to-accent/90 text-white text-sm font-semibold hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</>
              ) : (
                <>Sign in as admin <ArrowRight size={16} /></>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/40 text-center">
            <p className="text-xs text-gray-500">
              Tenant user?{' '}
              <Link to="/login" className="text-accent hover:underline font-semibold">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
