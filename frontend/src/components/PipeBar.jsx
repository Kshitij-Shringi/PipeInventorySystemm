import React from 'react';
import { motion } from 'framer-motion';
import { formatNumber } from '../utils/format';

export default function PipeBar({
  sourceLength,
  usedLength,
  remainder,
  fromSupplier,
  cutType,
  cutsFromThisPipe,
  cutLength,
  quantityUsed,
}) {
  // quantityUsed = number of physical pipes involved (exact matches or non-exact groups)
  const pipeCount = quantityUsed ?? 1;
  const pipesLabel = `${formatNumber(pipeCount)} pipe${pipeCount === 1 ? '' : 's'}`;

  if (cutType === 'exact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        whileHover={{ scale: 1.02 }}
        className="rounded-lg border border-border bg-surface-elevated/50 p-4 space-y-2"
      >
        <p className="text-sm font-sans text-muted">
          Using{' '}
          <span className="font-mono text-slate-100">{pipesLabel}</span>{' '}
          of length{' '}
          <span className="font-mono text-slate-100">{formatNumber(sourceLength)}</span>
          {fromSupplier ? <span className="text-xs text-muted"> — from {fromSupplier}</span> : null}
        </p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="h-7 w-full bg-accent rounded-lg flex items-center justify-center shadow-inner"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-mono text-sm font-medium text-[#0f1117]"
          >
            Exact match
          </motion.span>
        </motion.div>
      </motion.div>
    );
  }

  const usedPct = sourceLength > 0 ? (usedLength / sourceLength) * 100 : 0;
  const remPct = sourceLength > 0 ? (remainder / sourceLength) * 100 : 0;

  // "X cuts of Y from N pipes" — show per-pipe cut count + pipe count
  const cutLabel =
    cutsFromThisPipe != null && cutLength != null
      ? pipeCount === 1
        ? `${formatNumber(cutsFromThisPipe)} cut${cutsFromThisPipe !== 1 ? 's' : ''} of ${formatNumber(cutLength)} from 1 pipe`
        : `${formatNumber(cutsFromThisPipe)} cut${cutsFromThisPipe !== 1 ? 's' : ''} of ${formatNumber(cutLength)} from each of ${formatNumber(pipeCount)} pipes`
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="rounded-lg border border-border bg-surface-elevated/50 p-4 space-y-2"
    >
      <p className="text-sm font-sans text-muted">
        Using{' '}
        <span className="font-mono text-slate-100">{pipesLabel}</span>{' '}
        of length{' '}
        <span className="font-mono text-slate-100">{formatNumber(sourceLength)}</span>
        {fromSupplier ? <span className="text-xs text-muted"> — from {fromSupplier}</span> : null}
      </p>
      {cutLabel != null && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="font-mono text-sm text-accent font-medium"
        >
          {cutLabel}
        </motion.p>
      )}
      <div className="flex w-full h-7 rounded-lg overflow-hidden border border-border/50 bg-[#0f1117] shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${usedPct}%` }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
          className="h-full bg-accent flex items-center justify-center min-w-0 transition-all duration-300"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${remPct}%` }}
          transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
          className="h-full bg-gradient-to-r from-muted/40 to-muted/60 flex items-center justify-center min-w-0"
        />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-between text-xs font-mono text-muted"
      >
        <span>{formatNumber(usedLength)} used</span>
        <span>{formatNumber(remainder)} remainder</span>
      </motion.div>
    </motion.div>
  );
}
