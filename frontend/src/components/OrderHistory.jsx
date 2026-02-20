import React, { useState, useEffect } from 'react';
import { ClipboardList, Loader2, Package, Trash2, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchOrders, getErrorMessage } from '../api';
import { useToast } from './Toast';
import { formatNumber, formatDimensions, formatDimensionsString } from '../utils/format';
import PipeBar from './PipeBar';

export default function OrderHistory({ refreshTrigger }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { showToast } = useToast();

  const toggleOrderExpanded = (orderId) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders({ startDate, endDate, page, pageSize });
      setOrders(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to load orders'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshTrigger, startDate, endDate, page]);

  // Reset page when dates change
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
        <p className="font-sans text-muted">Loading order history…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Date Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-4 p-4 rounded-lg border border-border bg-surface-elevated/30"
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-sans text-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm font-sans text-white focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div className="flex gap-2">
            {(startDate || endDate) && (
              <button
                onClick={clearDateFilter}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted hover:text-white font-sans font-semibold text-sm transition-colors inline-flex items-center gap-2 border border-border"
              >
                <X size={16} />
                Clear
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-sans text-muted">
          {total} order{total !== 1 ? 's' : ''} total
          {startDate || endDate ? ' (filtered)' : ''}
        </span>
        {totalPages > 1 && (
          <span className="text-sm font-sans text-muted">
            Page {page} of {totalPages}
          </span>
        )}
      </div>
      <div className="space-y-4">
        <AnimatePresence>
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="rounded-lg border border-border bg-surface-elevated/30 p-5 hover:bg-surface-elevated/50 transition-colors"
            >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="font-sans font-bold text-lg text-white mb-1">{order.recipient}</p>
                <p className="text-xs text-muted">
                  {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}
                </p>
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-2"
              >
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/20 text-accent text-sm font-sans font-semibold"
                >
                  <Package size={16} />
                  {formatNumber(order.summary?.pipes_consumed ?? 0)} consumed
                </motion.span>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-success text-sm font-sans font-semibold"
                >
                  <RotateCcw size={16} />
                  {formatNumber(order.summary?.returned_to_stock ?? 0)} returned
                </motion.span>
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-danger/15 text-danger text-sm font-sans font-semibold"
                >
                  <Trash2 size={16} />
                  {formatNumber(order.summary?.discarded ?? 0)} discarded
                </motion.span>
              </motion.div>
            </div>

            {/* Pipes Used Section */}
            {order.analysis && order.analysis.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-border">
                <motion.button
                  type="button"
                  onClick={() => toggleOrderExpanded(order.id)}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 w-full text-left mb-3 hover:text-accent transition-colors"
                >
                  <motion.div
                    animate={{ rotate: expandedOrders.has(order.id) ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {expandedOrders.has(order.id) ? (
                      <ChevronDown size={16} className="text-muted" />
                    ) : (
                      <ChevronRight size={16} className="text-muted" />
                    )}
                  </motion.div>
                  <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider">
                    How Pipes Were Used
                  </p>
                </motion.button>
                {expandedOrders.has(order.id) && (
                  <div className="space-y-6 pl-6">
                    {order.analysis.map((block, blockIdx) => (
                      <div key={blockIdx} className="space-y-4">
                        <div>
                          <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-2">
                            Requirement {blockIdx + 1}: {formatDimensions(
                              block.requirement?.length ?? 0,
                              block.requirement?.width ?? 0,
                              block.requirement?.height ?? 0
                            )} — Qty: {formatNumber(block.requirement?.quantity_needed ?? 0)}
                          </p>
                          <div className="space-y-3">
                            {(block.results || []).map((r, i) => {
                              if (r.unfulfilled != null) {
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger font-sans text-sm"
                                  >
                                    Could not fulfil {r.unfulfilled} pipes — insufficient stock
                                  </div>
                                );
                              }
                              return (
                                <div key={i}>
                                  <PipeBar
                                    sourceLength={r.source_length}
                                    usedLength={r.cut_type === 'exact' ? r.source_length * (r.quantity_used ?? 1) : (r.used_length ?? r.source_length - (r.remainder ?? 0))}
                                    remainder={r.remainder ?? 0}
                                    fromSupplier={r.from_supplier}
                                    cutType={r.cut_type}
                                    cutsFromThisPipe={r.cuts_from_this_pipe}
                                    cutLength={r.cut_length}
                                    quantityUsed={r.quantity_used}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : order.fulfillment_detail && order.fulfillment_detail.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-3">
                  Pipes Used
                </p>
                <div className="space-y-2">
                  {order.fulfillment_detail.map((fulfillment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#0f1117] border border-border/50"
                    >
                      <span className="font-mono text-sm text-accent font-medium flex-1">
                        {formatDimensionsString(fulfillment.dimensions ?? '—')}
                      </span>
                      <span className="text-muted text-sm">{fulfillment.from_supplier ?? '—'}</span>
                      <span className="text-muted">—</span>
                      <span className="font-mono text-sm text-white font-semibold">
                        Qty deducted: {formatNumber(fulfillment.quantity_deducted ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Returned Pipes Section */}
            {order.returned_pipes_detail && order.returned_pipes_detail.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <RotateCcw size={14} className="text-success" />
                  Pipes Returned to Stock
                </p>
                <div className="space-y-2">
                  {order.returned_pipes_detail.map((pipe, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-success/10 border border-success/30"
                    >
                      <span className="font-mono text-sm text-success font-medium flex-1">
                        {formatDimensions(pipe.length, pipe.width, pipe.height)}
                      </span>
                      <span className="text-muted text-sm">{pipe.from_supplier ?? '—'}</span>
                      <span className="text-muted">—</span>
                      <span className="font-mono text-sm text-success font-semibold">
                        Qty: {formatNumber(pipe.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Discarded Pipes Section */}
            {order.discarded_pipes_detail && order.discarded_pipes_detail.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trash2 size={14} className="text-danger" />
                  Pipes Discarded
                </p>
                <div className="space-y-2">
                  {order.discarded_pipes_detail.map((pipe, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-danger/10 border border-danger/30"
                    >
                      <span className="font-mono text-sm text-danger font-medium flex-1">
                        {pipe.length} × {pipe.width} × {pipe.height}
                      </span>
                      <span className="text-muted text-sm">{pipe.from_supplier ?? '—'}</span>
                      <span className="text-muted">—</span>
                      <span className="font-mono text-sm text-danger font-semibold">
                        Qty: {pipe.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
      {orders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4"
          >
            <ClipboardList className="w-8 h-8 text-muted" />
          </motion.div>
          <p className="font-sans text-muted">No orders found.</p>
          <p className="font-sans text-sm text-muted/80 mt-1">
            {startDate || endDate ? 'Try adjusting your date filter.' : 'Publish an order to see it here.'}
          </p>
        </motion.div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.05, x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-muted hover:text-white hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Previous
          </motion.button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <motion.button
                  key={pageNum}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg font-sans font-semibold text-sm transition-all duration-200 ${
                    page === pageNum
                      ? 'bg-accent text-[#0f1117]'
                      : 'bg-surface border border-border text-muted hover:text-white hover:bg-surface-elevated'
                  }`}
                >
                  {pageNum}
                </motion.button>
              );
            })}
          </div>

          <motion.button
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-muted hover:text-white hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          >
            Next
            <ChevronRight size={16} />
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}
