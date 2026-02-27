import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Mail, Lock, ArrowRight, CheckCircle2, HelpCircle, X, Eye, EyeOff } from 'lucide-react';
import { login, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { loginToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050816] to-[#020617] px-4 py-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-success/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1.4fr,1fr] items-center relative z-10">
        {/* Left side - Hero section */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="hidden lg:block"
        >
          <div className="rounded-3xl border border-accent/40 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm px-8 py-10 shadow-[0_0_80px_rgba(56,189,248,0.15)]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 mb-4">
                <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                <p className="text-xs font-semibold tracking-[0.2em] text-accent/90 uppercase">
                  Pipe Inventory SaaS
                </p>
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                Dimensional control
                <br />
                <span className="text-accent">for every cut.</span>
              </h1>
              <p className="text-sm text-gray-300 mb-6 max-w-lg leading-relaxed">
                Manage pipe stock, run cutting analysis, and execute orders per project – 
                fully isolated per tenant with real-time inventory tracking.
              </p>
            </motion.div>

            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-3"
            >
              {[
                'Live inventory matrix across all dimensions',
                'Smart cutting suggestions with remainder tracking',
                'Multi-tenant architecture with complete data isolation',
                'Real-time order execution and activity logging'
              ].map((feature, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.4 }}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <CheckCircle2 size={18} className="text-accent flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.div>

        {/* Right side - Login form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="w-full"
        >
          <div className="w-full max-w-md ml-auto mr-auto lg:mr-0 rounded-2xl border border-border/60 bg-surface/95 backdrop-blur-xl px-8 py-10 shadow-2xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-accent/40 bg-accent/10">
                  <LogIn className="text-accent" size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-accent/80 uppercase">
                    Welcome back
                  </p>
                  <h2 className="text-2xl font-bold text-white">Sign in</h2>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Access your tenant workspace and manage your pipe inventory.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3"
              >
                <span className="text-red-400">⚠</span>
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2" htmlFor="login-email">
                  <Mail size={14} />
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent transition-all"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2" htmlFor="login-password">
                  <Lock size={14} />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-11 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-accent/70 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    autoComplete="current-password"
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
                className="w-full mt-2 py-3.5 rounded-lg bg-gradient-to-r from-accent to-accent/90 text-white text-sm font-semibold hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={16} />
                  </>
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
                          Password resets are handled by your <span className="text-white font-medium">tenant admin</span>.
                          Contact them and they can set a new password for you from the{' '}
                          <span className="text-accent font-medium">Users</span> page.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          If you are the tenant admin, contact the <span className="text-white font-medium">superadmin</span> for help.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-6 pt-6 border-t border-border/40">
              <p className="text-xs text-gray-400 text-center">
                Don't have a tenant yet?{' '}
                <Link to="/register" className="text-accent font-semibold hover:underline transition-all">
                  Register a new tenant
                </Link>
              </p>
              <p className="text-xs text-gray-500 text-center mt-3">
                Admin access?{' '}
                <Link to="/admin/login" className="text-gray-400 hover:text-accent transition-all">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

