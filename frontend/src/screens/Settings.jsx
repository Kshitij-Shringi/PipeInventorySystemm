import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Building2,
  Image,
  Save,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { updateMyTenant, changeMyPassword, getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../components/Toast';

export default function Settings() {
  const { tenantName, tenantLogoUrl, isTenantAdmin, refreshTenant } = useAuth();
  const { showToast } = useToast();

  // Tenant identity
  const [name, setName] = useState(tenantName || '');
  const [logoUrl, setLogoUrl] = useState(tenantLogoUrl || '');
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identitySuccess, setIdentitySuccess] = useState(false);

  // Change password
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  async function handleSaveIdentity(e) {
    e.preventDefault();
    if (!name.trim()) { showToast('Tenant name cannot be empty', 'error'); return; }
    setSavingIdentity(true);
    setIdentitySuccess(false);
    try {
      await updateMyTenant({ name: name.trim(), logo_url: logoUrl.trim() || null });
      await refreshTenant();
      setIdentitySuccess(true);
      showToast('Tenant profile updated', 'success');
      setTimeout(() => setIdentitySuccess(false), 3000);
    } catch (err) {
      showToast(getErrorMessage(err, 'Failed to save changes'), 'error');
    } finally {
      setSavingIdentity(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    setSavingPw(true);
    try {
      await changeMyPassword({ current_password: currentPw, new_password: newPw });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('Password changed successfully', 'success');
    } catch (err) {
      setPwError(getErrorMessage(err, 'Failed to change password'));
    } finally {
      setSavingPw(false);
    }
  }

  const logoPreview = logoUrl.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="page-shell space-y-6"
    >
      {/* Hero */}
      <section className="hero-panel p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 flex-shrink-0">
            <SettingsIcon className="text-accent" size={22} />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-white">Settings</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Manage your tenant profile and account security.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tenant Identity */}
        {isTenantAdmin && (
          <div className="card">
            <div className="card-header route-line">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-accent" />
                <h2 className="section-title">Tenant Profile</h2>
              </div>
            </div>
            <div className="card-body">
              {/* Logo preview */}
              <div className="mb-5 flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-border/60 bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="font-display text-2xl font-bold text-accent">
                      {name.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{name || 'Tenant name'}</p>
                  <p className="text-xs text-muted mt-0.5">Live preview</p>
                </div>
              </div>

              <form onSubmit={handleSaveIdentity} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                    Tenant name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                    placeholder="Your company or project name"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted">
                    <Image size={13} />
                    Profile picture URL
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-accent/70"
                    placeholder="https://example.com/logo.png"
                  />
                  <p className="mt-1.5 text-[11px] text-muted">Paste a direct image URL. It will appear in the sidebar.</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={savingIdentity}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {savingIdentity ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {savingIdentity ? 'Saving…' : 'Save changes'}
                  </button>
                  <AnimatePresence>
                    {identitySuccess && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400"
                      >
                        <CheckCircle2 size={14} /> Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="card">
          <div className="card-header route-line">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-accent" />
              <h2 className="section-title">Change Password</h2>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                  Current password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrentPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
                  >
                    {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                    placeholder="Min. 6 characters"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowNewPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-accent transition-colors"
                  >
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent/70"
                  placeholder="Repeat new password"
                  required
                />
              </div>

              <AnimatePresence>
                {pwError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2.5 text-xs text-red-400"
                  >
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{pwError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={savingPw}
                className="btn-primary inline-flex items-center gap-2"
              >
                {savingPw ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                {savingPw ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
