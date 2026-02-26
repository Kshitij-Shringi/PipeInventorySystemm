import React, { useState } from 'react';
import { ClipboardList, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import OrderHistory from '../components/OrderHistory';
import StockActivity from '../components/StockActivity';

export default function Orders({ refreshTrigger }) {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="page-shell space-y-6"
    >
      <section className="hero-panel p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 flex-shrink-0">
            <ClipboardList className="text-accent" size={22} />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold text-white">Activity Ledger</h1>
            <p className="mt-2 text-sm text-muted">
              Track order execution and inbound stock events across time.
            </p>
          </div>
        </div>
      </section>
      <div className="card">
        <div className="card-header route-line">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/35 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">Activity Center</h2>
              <p className="font-sans text-sm text-muted mt-0.5">Orders and inbound stock timeline</p>
            </div>
          </div>
        </div>
        <div className="border-b border-border/45 px-6 py-3">
          <div className="inline-flex gap-1 rounded-2xl border border-border/35 bg-surface-elevated/40 p-1.5 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2.5 rounded-xl font-sans text-sm font-semibold transition-all duration-200 ${
                activeTab === 'orders'
                  ? 'bg-gradient-to-r from-accent/25 to-accent/10 text-accent border border-accent/40'
                  : 'text-muted border border-transparent hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClipboardList size={18} />
                Order History
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2.5 rounded-xl font-sans text-sm font-semibold transition-all duration-200 ${
                activeTab === 'stock'
                  ? 'bg-gradient-to-r from-success/25 to-success/10 text-success border border-success/40'
                  : 'text-muted border border-transparent hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package size={18} />
                Add Stock Activity
              </div>
            </button>
          </div>
        </div>
        <div className="card-body">
          {activeTab === 'orders' && <OrderHistory refreshTrigger={refreshTrigger} />}
          {activeTab === 'stock' && <StockActivity refreshTrigger={refreshTrigger} />}
        </div>
      </div>
    </motion.div>
  );
}
