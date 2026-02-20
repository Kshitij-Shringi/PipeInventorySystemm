import React from 'react';
import { CheckCircle, Package } from 'lucide-react';
import { formatDimensionsString, formatNumber } from '../../utils/format';

export default function OrderSummary({ result, onBackToInventory }) {
  const summary = result?.summary ?? {};
  const detail = result?.fulfillment_detail ?? [];
  const recipient = result?.recipient ?? '';

  if (result == null) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="card">
          <div className="card-body text-center py-16">
            <p className="font-sans text-muted">No order data. Use Publish Order to create an order.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="card overflow-visible">
        <div className="px-8 py-10 text-center border-b border-border bg-surface-elevated/80">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/20 text-success font-sans font-semibold text-sm mb-5 shadow-glow-accent">
            <CheckCircle size={20} />
            Order complete
          </div>
          <h1 className="font-sans text-2xl font-bold text-white">{recipient}</h1>
        </div>
        <div className="card-body space-y-6">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="bg-surface-elevated/50 border-b border-border">
                  <th className="table-th">Dimensions</th>
                  <th className="table-th">Supplier</th>
                  <th className="table-th">Qty deducted</th>
                </tr>
              </thead>
              <tbody>
                {detail.map((row, i) => (
                  <tr key={i} className="table-row-hover">
                    <td className="table-td font-mono text-accent font-medium">{formatDimensionsString(row.dimensions ?? '—')}</td>
                    <td className="table-td text-gray-300">{row.from_supplier ?? '—'}</td>
                    <td className="table-td font-mono font-semibold">{formatNumber(row.quantity_deducted ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-sm font-sans">
              {formatNumber(summary.pipes_consumed ?? 0)} consumed
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-success text-sm font-sans">
              {formatNumber(summary.returned_to_stock ?? 0)} returned
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-sm font-sans">
              {formatNumber(summary.discarded ?? 0)} discarded
            </span>
          </div>
        </div>
        <div className="px-6 py-5 border-t border-border bg-surface-elevated/30">
          <button
            type="button"
            onClick={onBackToInventory}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Package size={18} />
            Back to inventory
          </button>
        </div>
      </div>
    </div>
  );
}
