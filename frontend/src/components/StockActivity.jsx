import React, { useState, useEffect } from 'react';
import { Package, Loader2, Calendar, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchStockActivity, getErrorMessage } from '../api';
import { useToast } from './Toast';
import { formatDimensions, formatNumber } from '../utils/format';

export default function StockActivity({ refreshTrigger }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchStockActivity({ startDate, endDate, page, pageSize });
      setActivities(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 0);
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to load stock activity'), 'error');
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
        <p className="font-sans text-muted">Loading stock activity…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Date Filter Section */}
      <div className="mb-4 p-4 rounded-lg border border-border bg-surface-elevated/30">
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
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-sans text-muted">
          {total} stock addition{total !== 1 ? 's' : ''} total
          {startDate || endDate ? ' (filtered)' : ''}
        </span>
        {totalPages > 1 && (
          <span className="text-sm font-sans text-muted">
            Page {page} of {totalPages}
          </span>
        )}
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="rounded-lg border border-border bg-surface-elevated/30 p-4 hover:bg-surface-elevated/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-sans font-semibold text-white">{activity.from_supplier}</p>
                <p className="text-xs text-muted mt-0.5">
                  {activity.created_at ? new Date(activity.created_at).toLocaleString() : '—'}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-sans font-medium bg-accent/20 text-accent">
                {formatNumber(activity.total_quantity)} total pipes
              </span>
            </div>
            <div className="space-y-2">
              {activity.pipes?.map((pipe, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0f1117] border border-border/50"
                >
                  <span className="font-mono text-sm text-accent font-medium">
                    {formatDimensions(pipe.length, pipe.width, pipe.height)}
                  </span>
                  <span className="text-muted">—</span>
                  <span className="font-mono text-sm text-white font-semibold">Qty: {formatNumber(pipe.quantity)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {activities.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted" />
          </div>
          <p className="font-sans text-muted">No stock additions found.</p>
          <p className="font-sans text-sm text-muted/80 mt-1">
            {startDate || endDate ? 'Try adjusting your date filter.' : 'Add stock to see activity here.'}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-muted hover:text-white hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          
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
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg font-sans font-semibold text-sm transition-colors ${
                    page === pageNum
                      ? 'bg-accent text-[#0f1117]'
                      : 'bg-surface border border-border text-muted hover:text-white hover:bg-surface-elevated'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-muted hover:text-white hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
