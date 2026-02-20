import React from 'react';
import { NavLink } from 'react-router-dom';
import { Package, PlusCircle, FileText, ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const tabs = [
    { id: 'inventory', path: '/inventory', label: 'Inventory', icon: Package },
    { id: 'add', path: '/add-stock', label: 'Add Stock', icon: PlusCircle },
    { id: 'order', path: '/publish-order', label: 'Publish Order', icon: FileText },
    { id: 'orders', path: '/orders', label: 'Orders', icon: ClipboardList },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-border/50 shadow-lg"
    >
      <div className="max-w-6xl mx-auto px-5">
        <div className="flex items-center gap-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <NavLink to="/inventory" className="flex items-center gap-2.5 py-4">
              <motion.div
                className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center"
                whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
              >
                <Package className="w-5 h-5 text-accent" strokeWidth={2} />
              </motion.div>
              <span className="font-sans font-bold text-lg text-white tracking-tight">
                Pipe Inventory
              </span>
            </NavLink>
          </motion.div>
          <div className="flex items-center gap-0.5">
            {tabs.map(({ id, path, label, icon: Icon }, index) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              >
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-3.5 font-sans text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-white/10 text-accent shadow-inner'
                        : 'text-muted hover:text-gray-200 hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <motion.div
                        animate={isActive ? { rotate: [0, 10, -10, 0] } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        <Icon size={18} strokeWidth={2} />
                      </motion.div>
                      {label}
                    </>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
