import React from 'react';
import { motion } from 'framer-motion';

export default function PipeLoader({ label = 'Loading…' }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      {/* Pipe */}
      <div className="flex items-center gap-1">
        {/* Left cap */}
        <div className="h-6 w-3 rounded-l-full border border-border/70 bg-surface-elevated/80" />

        {/* Pipe body */}
        <div className="w-56 max-w-[70vw] h-6 rounded-full border border-border/70 bg-surface-elevated/80 overflow-hidden relative">
          {/* Background grid shimmer */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-[length:10px_100%]" />

          {/* Water fill */}
          <motion.div
            className="relative h-full bg-gradient-to-r from-sky-400 via-accent to-sky-500"
            initial={{ width: '0%' }}
            animate={{ width: ['0%', '65%', '100%'] }}
            transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
          >
            {/* Bubbles */}
            <motion.div
              className="absolute inset-y-0 w-full opacity-40 bg-[radial-gradient(circle_at_10px_10px,white_0,transparent_35%)] bg-[length:18px_18px]"
              animate={{ x: ['0%', '30%', '0%'] }}
              transition={{ duration: 2.2, ease: 'linear', repeat: Infinity }}
            />
          </motion.div>
        </div>

        {/* Right cap */}
        <div className="h-6 w-3 rounded-r-full border border-border/70 bg-surface-elevated/80" />
      </div>

      {/* Label */}
      <p className="text-[11px] tracking-[0.2em] uppercase text-muted">
        {label}
      </p>
    </div>
  );
}


