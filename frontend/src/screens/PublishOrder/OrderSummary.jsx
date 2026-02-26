import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Package, RotateCcw, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { formatDimensionsString, formatNumber } from '../../utils/format';

export default function OrderSummary({ result, onBackToInventory }) {
  const summary = result?.summary ?? {};
  const detail = result?.fulfillment_detail ?? [];
  const recipient = result?.recipient ?? '';

  if (result == null) {
    return (
      <div className="page-shell">
        <div className="card">
          <div className="card-body py-16 text-center">
            <Package className="mx-auto mb-4 text-muted" size={38} />
            <p className="text-sm text-muted">No order data. Use Publish Order to create an order.</p>
          </div>
        </div>
      </div>
    );
  }

  const statItems = [
    {
      label: 'Pipes consumed',
      value: formatNumber(summary.pipes_consumed ?? 0),
      icon: Package,
      color: 'text-accent',
      border: 'border-accent/30',
      bg: 'bg-accent/5',
    },
    {
      label: 'Returned to stock',
      value: formatNumber(summary.returned_to_stock ?? 0),
      icon: RotateCcw,
      color: 'text-success',
      border: 'border-success/30',
      bg: 'bg-success/5',
    },
    {
      label: 'Discarded',
      value: formatNumber(summary.discarded ?? 0),
      icon: Trash2,
      color: 'text-danger',
      border: 'border-danger/30',
      bg: 'bg-danger/5',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="page-shell space-y-6"
    >
      {/* Hero */}
      <section className="hero-panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-success/40 bg-success/10 flex-shrink-0"
            >
              <CheckCircle2 className="text-success" size={28} />
            </motion.div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 mb-2">
                <Sparkles size={12} className="text-success" />
                <span className="text-xs font-semibold tracking-wider text-success/90 uppercase">Order complete</span>
              </div>
              <h1 className="font-display text-4xl font-bold text-white">{recipient}</h1>
              <p className="mt-1 text-sm text-muted">All pipes have been deducted from inventory and logged.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.45 }}
        className="grid gap-4 sm:grid-cols-3"
      >
        {statItems.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className={`rounded-2xl border ${stat.border} ${stat.bg} px-5 py-5 flex items-center gap-4`}
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${stat.border} bg-black/30`}>
              <stat.icon className={stat.color} size={20} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">{stat.label}</p>
              <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* Fulfillment Detail Table */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.45 }}
        className="card overflow-hidden"
      >
        <div className="card-header route-line flex items-center gap-3">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10">
            <Package className="text-accent" size={16} />
          </div>
          <div>
            <h2 className="section-title">Fulfillment detail</h2>
            <p className="text-xs text-muted mt-0.5">Pipe dimensions and quantities deducted from stock</p>
          </div>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr>
                <th className="table-th text-left">Dimensions</th>
                <th className="table-th text-left">Supplier</th>
                <th className="table-th text-right w-32">Qty deducted</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {detail.map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.05 }}
                    className="table-row-hover"
                  >
                    <td className="table-td font-mono text-accent font-semibold text-left">
                      {formatDimensionsString(row.dimensions ?? '—')}
                    </td>
                    <td className="table-td text-gray-300 text-left">{row.from_supplier ?? '—'}</td>
                    <td className="table-td font-mono font-bold text-white text-right">
                      {formatNumber(row.quantity_deducted ?? '—')}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <div className="px-6 py-5 border-t border-border/30 bg-surface-elevated/20">
          <motion.button
            type="button"
            onClick={onBackToInventory}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent/90 text-white text-sm font-semibold hover:shadow-lg hover:shadow-accent/25 transition-all"
          >
            <ArrowLeft size={16} />
            Back to inventory
          </motion.button>
        </div>
      </motion.section>
    </motion.div>
  );
}
