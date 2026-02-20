import React from 'react';
import { NavLink } from 'react-router-dom';
import { Package, PlusCircle, FileText, ClipboardList } from 'lucide-react';

export default function Navbar() {
  const tabs = [
    { id: 'inventory', path: '/inventory', label: 'Inventory', icon: Package },
    { id: 'add', path: '/add-stock', label: 'Add Stock', icon: PlusCircle },
    { id: 'order', path: '/publish-order', label: 'Publish Order', icon: FileText },
    { id: 'orders', path: '/orders', label: 'Orders', icon: ClipboardList },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-border shadow-card">
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center gap-8">
          <NavLink to="/inventory" className="flex items-center gap-2.5 py-4">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent" strokeWidth={2} />
            </div>
            <span className="font-sans font-bold text-lg text-white tracking-tight">
              Pipe Inventory
            </span>
          </NavLink>
          <div className="flex items-center gap-0.5">
            {tabs.map(({ id, path, label, icon: Icon }) => (
              <NavLink
                key={id}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3.5 font-sans text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-white/10 text-accent shadow-inner'
                      : 'text-muted hover:text-gray-200 hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
