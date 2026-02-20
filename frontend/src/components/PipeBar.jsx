import React from 'react';
import { formatNumber, formatDimensions } from '../utils/format';

export default function PipeBar({ sourceLength, usedLength, remainder, fromSupplier, cutType, cutsFromThisPipe, cutLength, quantityUsed }) {
  if (cutType === 'exact') {
    return (
      <div className="rounded-lg border border-border bg-surface-elevated/50 p-4 space-y-2">
        <p className="text-sm font-sans text-muted">
          Source: {formatNumber(sourceLength)} × … <span className="text-accent font-medium">(Qty: {formatNumber(quantityUsed ?? 1)})</span>
        </p>
        <div className="h-7 w-full bg-accent rounded-lg flex items-center justify-center shadow-inner">
          <span className="font-mono text-sm font-medium text-[#0f1117]">Exact match</span>
        </div>
      </div>
    );
  }

  const usedPct = sourceLength > 0 ? (usedLength / sourceLength) * 100 : 0;
  const remPct = sourceLength > 0 ? (remainder / sourceLength) * 100 : 0;
  const cutLabel =
    cutsFromThisPipe != null && cutLength != null
      ? `${formatNumber(cutsFromThisPipe)} cut${cutsFromThisPipe !== 1 ? 's' : ''} of ${formatNumber(
          cutLength,
        )} from this pipe`
      : null;

  return (
    <div className="rounded-lg border border-border bg-surface-elevated/50 p-4 space-y-2">
      <p className="text-sm font-sans text-muted">
        Source: {formatNumber(sourceLength)} × …{' '}
        <span className="text-accent font-medium">(Qty: {formatNumber(cutsFromThisPipe ?? 1)})</span>
      </p>
      {cutLabel != null && <p className="font-mono text-sm text-accent font-medium">{cutLabel}</p>}
      <div className="flex w-full h-7 rounded-lg overflow-hidden border border-border bg-[#0f1117]">
        <div
          className="h-full bg-accent flex items-center justify-center min-w-0 transition-all duration-300"
          style={{ width: `${usedPct}%` }}
        />
        <div
          className="h-full bg-muted/40 flex items-center justify-center min-w-0 transition-all duration-300"
          style={{ width: `${remPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-mono text-muted">
        <span>{formatNumber(usedLength)} used</span>
        <span>{formatNumber(remainder)} remainder</span>
      </div>
    </div>
  );
}
