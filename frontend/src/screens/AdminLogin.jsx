import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight, HelpCircle, X, Eye, EyeOff } from 'lucide-react';
import { adminLogin, getErrorMessage, loadAdminStoredToken } from '../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent transition-all"
                  placeholder="Enter admin password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-accent transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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

            <div className="text-center mt-3">
              <button
                type="button"
                onClick={() => setShowForgot((v) => !v)}
                className="text-xs text-gray-500 hover:text-accent transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </form>

          <AnimatePresence>
            {showForgot && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-4 relative">
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="absolute top-3 right-3 text-muted hover:text-white transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <div className="flex items-start gap-3">
                    <HelpCircle size={18} className="text-accent flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-white mb-1">Can't sign in?</p>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        The superadmin credentials are configured via the{' '}
                        <span className="text-white font-mono text-[11px]">SUPERADMIN_EMAIL</span> and{' '}
                        <span className="text-white font-mono text-[11px]">SUPERADMIN_PASSWORD</span>{' '}
                        environment variables on the server.
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Update those variables and restart the server to reset the superadmin password.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
