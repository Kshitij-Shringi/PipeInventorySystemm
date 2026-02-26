import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Mail, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { requestTenantAccess, getErrorMessage } from '../api';

export default function RegisterTenant() {
  const [email, setEmail] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await requestTenantAccess({ email, tenant_name: tenantName || undefined });
      setSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Request failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#050816] via-[#050816] to-[#020617] px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-success/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-6xl grid gap-8 lg:grid-cols-[1.4fr,1fr] items-center relative z-10">
        {/* Left hero */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="hidden lg:block"
        >
          <div className="rounded-3xl border border-success/30 bg-gradient-to-br from-black/40 to-black/20 backdrop-blur-sm px-8 py-10 shadow-[0_0_80px_rgba(34,197,94,0.1)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 mb-4">
              <Sparkles size={14} className="text-success" />
              <p className="text-xs font-semibold tracking-[0.2em] text-success/90 uppercase">Request access</p>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              Start your company
              <br />
              <span className="text-success">workspace.</span>
            </h1>
            <p className="text-sm text-gray-300 mb-6 max-w-lg leading-relaxed">
              Submit your email and company name. An admin will review and grant access — 
              then you can sign in and manage your pipe inventory.
            </p>
            <ul className="space-y-3">
              {[
                'Isolated workspace per company with no shared data',
                'Invite additional team members after approval',
                'Full inventory, cutting analysis & order management',
                'Admin approval keeps the platform secure and curated',
              ].map((feature, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + idx * 0.1 }}
                  className="flex items-start gap-3 text-sm text-gray-300"
                >
                  <CheckCircle2 size={18} className="text-success flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Right form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="w-full max-w-md ml-auto mr-auto lg:mr-0 rounded-2xl border border-border/60 bg-surface/95 backdrop-blur-xl px-8 py-10 shadow-2xl">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-success/40 bg-success/10">
                  <Building2 className="text-success" size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-success/80 uppercase">New tenant</p>
                  <h2 className="text-2xl font-bold text-white">Request access</h2>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                Submit your details and an admin will provision your workspace.
              </p>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-5 flex items-start gap-2 text-sm text-red-400 bg-red-950/40 border border-red-500/40 rounded-lg px-4 py-3"
                >
                  <span>⚠</span><span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-300">Request submitted!</span>
                  </div>
                  <p className="text-xs text-emerald-400/80">
                    An admin will review your request and grant access. You'll be able to sign in after approval.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2" htmlFor="tenant-email">
                  <Mail size={14} /> Work email
                </label>
                <input
                  id="tenant-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-success/50 focus:border-transparent transition-all"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2" htmlFor="tenant-name">
                  <Building2 size={14} />
                  Company / tenant name
                  <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  id="tenant-name"
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-success/50 focus:border-transparent transition-all"
                  placeholder="e.g. Astral Pipes – Site A"
                />
              </div>
              <motion.button
                type="submit"
                disabled={loading || success}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-2 py-3.5 rounded-lg bg-gradient-to-r from-success to-success/80 text-white text-sm font-semibold hover:shadow-lg hover:shadow-success/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
                ) : success ? (
                  <><CheckCircle2 size={16} />Request sent</>
                ) : (
                  <>Submit request<ArrowRight size={16} /></>
                )}
              </motion.button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/40">
              <p className="text-xs text-gray-400 text-center">
                Already have an account?{' '}
                <Link to="/login" className="text-accent font-semibold hover:underline transition-all">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
