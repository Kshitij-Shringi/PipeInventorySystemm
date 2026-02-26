import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Package, PlusCircle, FileText, ClipboardList, LogOut, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../AuthContext';

const baseTabs = [
  { id: 'inventory', path: '/inventory', label: 'Inventory', icon: Package },
  { id: 'add', path: '/add-stock', label: 'Add Stock', icon: PlusCircle },
  { id: 'order', path: '/publish-order', label: 'Publish Order', icon: FileText },
  { id: 'orders', path: '/orders', label: 'Activity Ledger', icon: ClipboardList },
];

function TabButton({ path, label, Icon }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
          isActive
            ? 'border-accent/60 bg-gradient-to-r from-accent/25 via-accent/20 to-success/15 text-white shadow-glow-accent'
            : 'border-border/30 bg-surface-elevated/35 text-muted hover:border-accent/35 hover:text-slate-100'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const { isAuthenticated, email, tenantName, tenantLogoUrl, isTenantAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const tabs = isTenantAdmin
    ? [...baseTabs, { id: 'users', path: '/users', label: 'Users', icon: Users }]
    : baseTabs;

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-4 lg:left-4 lg:z-50 lg:flex lg:w-[17rem] lg:flex-col">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full rounded-[1.75rem] border border-border/45 bg-surface/65 p-4 shadow-card backdrop-blur-2xl"
        >
          <div className="route-line rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-accent/5 p-4">
            <div className="mb-3 flex items-center gap-3">
              {tenantLogoUrl ? (
                <div className="h-11 w-11 rounded-xl border border-accent/45 bg-black/40 flex items-center justify-center overflow-hidden">
                  <img
                    src={tenantLogoUrl}
                    alt={tenantName || 'Tenant logo'}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/45 bg-accent/15">
                  <Package className="text-accent" size={22} strokeWidth={2.5} />
                </div>
              )}
              <div>
                <p className="font-display text-xl font-bold text-white truncate">
                  {tenantName || 'Pipe Control'}
                </p>
                <p className="text-xs text-muted">Logistics cockpit</p>
              </div>
            </div>
            {isAuthenticated && email && (
              <div className="mt-3 rounded-xl bg-black/25 border border-accent/30 px-3 py-2">
                <p className="text-[11px] font-medium text-slate-100 truncate">{email}</p>
                <p className="text-[10px] uppercase tracking-wide text-accent/80">
                  {isTenantAdmin ? 'Tenant admin' : 'User'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-2">
            {tabs.map(({ id, path, label, icon: Icon }) => (
              <TabButton key={id} path={path} label={label} Icon={Icon} />
            ))}
          </div>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-border/35 bg-surface-elevated/35 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">Workflow</p>
              <p className="mt-2 text-sm font-medium text-slate-100">Inventory to Analysis to Fulfillment</p>
            </div>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/40 bg-[#090b12] px-3 py-2.5 text-xs font-semibold text-muted hover:border-accent/60 hover:text-slate-100 hover:bg-accent/10 transition"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </motion.div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/45 bg-surface/75 p-2 backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
          {tabs.map(({ id, path, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'border-accent/55 bg-accent/20 text-slate-100'
                    : 'border-transparent text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        {isAuthenticated && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-lg border border-border/40 bg-[#05060b] px-3 py-1 text-[11px] font-semibold text-muted hover:border-accent/60 hover:text-slate-100 hover:bg-accent/10 transition"
            >
              <LogOut size={12} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
