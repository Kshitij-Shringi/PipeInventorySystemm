import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Package, RotateCcw, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import { formatDimensionsString, formatNumber } from '../../utils/format';
import { downloadCsv } from '../../utils/csv';
import PipeBar from '../../components/PipeBar';
import { downloadCutWeldPlanPdf } from '../../utils/planPdf';

export default function OrderSummary({ result, onBackToInventory }) {
  const summary = result?.summary ?? {};
  const detail = result?.fulfillment_detail ?? [];
  const recipient = result?.recipient ?? '';
  const analysis = result?.analysis ?? [];

  const planRows = useMemo(() => {
    const rows = [];
    analysis.forEach((block, blockIdx) => {
      const req = block.requirement || {};
      const reqDims = `${formatNumber(req.length)} × ${formatNumber(req.width)} × ${formatNumber(req.height)}`;
      (block.results || []).forEach((r) => {
        if (r.cut_type === 'weld') {
          (r.segments || []).forEach((s, idxS) => {
            rows.push({
              requirement_no: blockIdx + 1,
              required_dimensions: reqDims,
              action: 'WELD',
              piece_no: idxS + 1,
              segment_length_mm: s.segment_length ?? '',
              source_pipe_length_mm: s.source_length ?? '',
              remainder_mm: s.remainder ?? 0,
              supplier: s.from_supplier ?? '',
              notes: `Assembly welds: ${r.welds_needed ?? Math.max(0, (r.segments?.length ?? 0) - 1)}`,
            });
          });
          return;
        }
        if (r.unfulfilled != null) {
          rows.push({
            requirement_no: blockIdx + 1,
            required_dimensions: reqDims,
            action: 'UNFULFILLED',
            piece_no: '',
            segment_length_mm: '',
            source_pipe_length_mm: '',
            remainder_mm: '',
            supplier: '',
            notes: `Missing qty: ${r.unfulfilled}`,
          });
          return;
        }
        if (!r.pipe_id || r.part_of_weld) return;

        if (r.cut_type === 'exact') {
          rows.push({
            requirement_no: blockIdx + 1,
            required_dimensions: reqDims,
            action: 'EXACT',
            piece_no: '',
            segment_length_mm: req.length ?? '',
            source_pipe_length_mm: r.source_length ?? '',
            remainder_mm: 0,
            supplier: r.from_supplier ?? '',
            notes: `Qty used: ${r.quantity_used ?? 1}`,
          });
          return;
        }
        if (r.cut_type === 'cut') {
          rows.push({
            requirement_no: blockIdx + 1,
            required_dimensions: reqDims,
            action: 'CUT',
            piece_no: '',
            segment_length_mm: r.cut_length ?? req.length ?? '',
            source_pipe_length_mm: r.source_length ?? '',
            remainder_mm: r.remainder ?? 0,
            supplier: r.from_supplier ?? '',
            notes: `Cuts from this pipe: ${r.cuts_from_this_pipe ?? 1}`,
          });
        }
      });
    });
    return rows;
  }, [analysis]);

  const exportPlanCsv = () => {
    const columns = [
      'requirement_no',
      'required_dimensions',
      'action',
      'piece_no',
      'segment_length_mm',
      'source_pipe_length_mm',
      'remainder_mm',
      'supplier',
      'notes',
    ];
    downloadCsv(
      `${(recipient || 'order').toString().trim().replace(/\s+/g, '_')}-cut-weld-plan.csv`,
      columns,
      planRows,
    );
  };

  const downloadPlanPdf = () => {
    downloadCutWeldPlanPdf({
      recipient,
      analysis,
      planRows,
      filenamePrefix: (recipient || 'order').toString().trim(),
    });
  };

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

      {/* Cut & Weld Plan */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.45 }}
        className="card overflow-hidden"
      >
        <div className="card-header route-line flex items-center justify-between gap-3">
          <div>
            <h2 className="section-title">Cut & weld plan</h2>
            <p className="text-xs text-muted mt-0.5">How each requirement will be produced</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadPlanPdf}
              disabled={planRows.length === 0}
              className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download PDF
            </button>
            <button
              type="button"
              onClick={exportPlanCsv}
              disabled={planRows.length === 0}
              className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Visualisation */}
        <div className="px-6 pt-5">
          <div className="rounded-2xl border border-border/35 bg-surface-elevated/15 p-4">
            <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-3">
              Visual plan (cuts + welds)
            </p>
            <div className="space-y-4">
              {(analysis || []).length === 0 ? (
                <div className="text-sm text-muted">No analysis data available.</div>
              ) : (
                (analysis || []).map((block, idx) => (
                  <div key={`vis-${idx}`} className="rounded-xl border border-border/30 bg-black/15 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="font-sans text-sm text-white font-semibold">
                        Requirement {idx + 1}
                      </div>
                      <div className="font-mono text-xs text-accent">
                        {formatDimensionsString(
                          `${formatNumber(block?.requirement?.length)} × ${formatNumber(
                            block?.requirement?.width,
                          )} × ${formatNumber(block?.requirement?.height)}`,
                        )}{' '}
                        — Qty: {formatNumber(block?.requirement?.quantity_needed)}
                      </div>
                    </div>
                    <div className="space-y-3">
                      {(block?.results || [])
                        .filter((r) => r && r.unfulfilled == null)
                        .map((r, j) => {
                          if (r.cut_type === 'weld') {
                            return (
                              <div
                                key={`weldvis-${idx}-${j}`}
                                className="rounded-xl border border-border/35 bg-surface-elevated/20 px-4 py-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="font-sans text-sm text-white font-semibold">
                                    Weld assembly
                                    <span className="ml-2 text-xs text-muted font-normal">
                                      ({r.welds_needed ?? Math.max(0, (r.segments?.length ?? 0) - 1)} welds)
                                    </span>
                                  </div>
                                  <div className="font-mono text-xs text-accent">
                                    Target: {formatNumber(r.required_length ?? block?.requirement?.length)} mm
                                  </div>
                                </div>
                                <div className="mt-2 space-y-2">
                                  {(r.segments || []).map((s, k) => (
                                    <PipeBar
                                      key={`segbar-${idx}-${j}-${k}-${s.pipe_id || ''}`}
                                      sourceLength={s.source_length}
                                      usedLength={s.segment_length}
                                      remainder={s.remainder ?? 0}
                                      fromSupplier={s.from_supplier}
                                      cutType={s.remainder > 0 ? 'cut' : 'exact'}
                                      cutsFromThisPipe={s.remainder > 0 ? 1 : undefined}
                                      cutLength={s.segment_length}
                                      quantityUsed={1}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          if (r.part_of_weld) return null;
                          if (!r.pipe_id) return null;

                          if (r.cut_type === 'exact') {
                            return (
                              <PipeBar
                                key={`bar-${idx}-${j}-${r.pipe_id}`}
                                sourceLength={r.source_length}
                                usedLength={r.source_length}
                                remainder={0}
                                fromSupplier={r.from_supplier}
                                cutType="exact"
                                quantityUsed={r.quantity_used ?? 1}
                              />
                            );
                          }

                          if (r.cut_type === 'cut') {
                            return (
                              <PipeBar
                                key={`bar-${idx}-${j}-${r.pipe_id}`}
                                sourceLength={r.source_length}
                                usedLength={r.used_length ?? r.source_length - (r.remainder ?? 0)}
                                remainder={r.remainder ?? 0}
                                fromSupplier={r.from_supplier}
                                cutType="cut"
                                cutsFromThisPipe={r.cuts_from_this_pipe ?? 1}
                                cutLength={r.cut_length}
                                quantityUsed={1}
                              />
                            );
                          }

                          return null;
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="table-th text-left w-24">Req #</th>
                <th className="table-th text-left">Required</th>
                <th className="table-th text-left w-28">Action</th>
                <th className="table-th text-right w-28">Segment</th>
                <th className="table-th text-right w-28">Source</th>
                <th className="table-th text-right w-28">Remainder</th>
                <th className="table-th text-left">Supplier</th>
                <th className="table-th text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {planRows.length === 0 ? (
                  <tr>
                    <td className="table-td text-muted" colSpan={8}>
                      No plan data available for this order.
                    </td>
                  </tr>
                ) : (
                  planRows.map((row, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.01 }}
                      className="table-row-hover"
                    >
                      <td className="table-td font-mono text-left">{row.requirement_no}</td>
                      <td className="table-td font-mono text-left text-accent">
                        {formatDimensionsString(row.required_dimensions)}
                      </td>
                      <td className="table-td text-left font-sans text-white">{row.action}</td>
                      <td className="table-td text-right font-mono text-white">
                        {row.segment_length_mm === '' ? '—' : formatNumber(row.segment_length_mm)}
                      </td>
                      <td className="table-td text-right font-mono text-white">
                        {row.source_pipe_length_mm === '' ? '—' : formatNumber(row.source_pipe_length_mm)}
                      </td>
                      <td className="table-td text-right font-mono text-white">
                        {row.remainder_mm === '' ? '—' : formatNumber(row.remainder_mm)}
                      </td>
                      <td className="table-td text-left text-gray-300">{row.supplier || '—'}</td>
                      <td className="table-td text-left text-muted">{row.notes || ''}</td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.section>
    </motion.div>
  );
}
