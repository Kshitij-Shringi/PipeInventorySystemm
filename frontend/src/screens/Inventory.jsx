import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Package, Loader2, Pencil, AlertTriangle, X, Download, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchInventory, deleteInventoryItem, bulkDeleteInventoryItems, updateInventoryItem, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { formatNumber } from '../utils/format';
import { downloadCsv } from '../utils/csv';
import PipeLoader from '../components/PipeLoader';

export default function Inventory({ refreshTrigger }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ length: '', width: '', height: '', quantity: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory();
      const sorted = [...data].sort((a, b) => (b.length ?? 0) - (a.length ?? 0));
      setItems(sorted);
      setSelectedIds(new Set());
      setCurrentPage(1);
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to load inventory'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshTrigger]);

  const startEdit = (row) => {
    setEditingId(row.id);
    setEditValues({
      length: row.length,
      width: row.width,
      height: row.height,
      quantity: row.quantity,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({ length: '', width: '', height: '', quantity: '' });
  };

  const handleEditChange = (field, value) => {
    if (field === 'quantity') {
      const numValue = Number(value);
      if (value !== '' && (Number.isNaN(numValue) || numValue < 1)) {
        return;
      }
    }
    setEditValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editingId) return;
    const { length, width, height, quantity } = editValues;
    if ([length, width, height, quantity].some((v) => v === '' || v == null)) {
      showToast('Fill all fields before saving', 'error');
      return;
    }
    const numQty = Number(quantity);
    if (!Number.isFinite(numQty) || numQty < 1) {
      showToast('Quantity must be at least 1', 'error');
      return;
    }
    try {
      await updateInventoryItem(editingId, { length, width, height, quantity: numQty });
      showToast('Inventory updated', 'success');
      setEditingId(null);
      setEditValues({ length: '', width: '', height: '', quantity: '' });
      load();
    } catch (e) {
      showToast(getErrorMessage(e, 'Update failed'), 'error');
    }
  };

  const handleDeleteClick = (row) => {
    setDeleteConfirm({
      id: row.id,
      dimensions: `${formatNumber(row.length)} x ${formatNumber(row.width)} x ${formatNumber(row.height)}`,
      quantity: row.quantity,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInventoryItem(deleteConfirm.id);
      showToast('Item removed', 'success');
      setDeleteConfirm(null);
      load();
    } catch (e) {
      showToast(getErrorMessage(e, 'Delete failed'), 'error');
      setDeleteConfirm(null);
    }
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const pageItems = items.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleSelectPage = () => {
    const allPageSelected = pageItems.length > 0 && pageItems.every((row) => selectedIds.has(row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageItems.forEach((row) => next.delete(row.id));
      } else {
        pageItems.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteInventoryItems(ids);
      const deleted = Number(res?.deleted_count ?? ids.length);
      showToast(`Deleted ${deleted} item(s)`, 'success');
      setSelectedIds(new Set());
      load();
    } catch (e) {
      showToast(getErrorMessage(e, 'Bulk delete failed'), 'error');
    }
  };

  const uniqueSizes = new Set(items.map((i) => `${i.length}-${i.width}-${i.height}`)).size;
  const totalPipes = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
  const largestLength = useMemo(
    () => items.reduce((mx, row) => Math.max(mx, Number(row.length) || 0), 0),
    [items],
  );

  const exportInventory = () => {
    if (items.length === 0) {
      showToast('No inventory rows to export', 'error');
      return;
    }
    downloadCsv(
      'inventory-export.csv',
      ['height', 'width', 'length', 'quantity'],
      items.map((row) => ({
        height: row.height,
        width: row.width,
        length: row.length,
        quantity: row.quantity,
      })),
    );
  };

  if (loading) {
    return (
      <div className="page-shell">
        <PipeLoader label="Loading inventory" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="page-shell space-y-6"
    >
      <section className="hero-panel p-6 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 flex-shrink-0">
              <Package className="text-accent" size={22} />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white">Inventory Command</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Live stock visibility, dimensional control, and direct in-row edits.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Unique Sizes</p>
              <p className="mt-1 text-2xl font-bold text-white">{uniqueSizes}</p>
            </div>
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Total Pipes</p>
              <p className="mt-1 text-2xl font-bold text-accent">{totalPipes}</p>
            </div>
            <div className="metric-tile col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Max Length</p>
              <p className="mt-1 text-2xl font-bold text-success">{formatNumber(largestLength)}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="card">
          <div className="card-header route-line flex items-center justify-between">
            <h2 className="section-title">Stock Matrix</h2>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleSelectAll} className="btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs">
                <ListChecks size={14} />
                {selectedIds.size === items.length && items.length > 0 ? 'Unselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                className="btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                Delete Selected ({selectedIds.size})
              </button>
              <button type="button" onClick={exportInventory} className="btn-ghost inline-flex items-center gap-2 px-3 py-1.5 text-xs">
                <Download size={14} />
                Export CSV
              </button>
              <span className="rounded-xl border border-border/35 bg-surface-elevated/45 px-3 py-1.5 text-xs text-muted">Editable in place</span>
            </div>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr>
                  <th className="table-th w-14 text-center">
                    <input
                      type="checkbox"
                      checked={pageItems.length > 0 && pageItems.every((row) => selectedIds.has(row.id))}
                      onChange={toggleSelectPage}
                      aria-label="Select inventory rows on current page"
                      className="h-4 w-4"
                    />
                  </th>
                  <th className="table-th">Height</th>
                  <th className="table-th">Width</th>
                  <th className="table-th">Length</th>
                  <th className="table-th">Quantity</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {pageItems.map((row, index) => {
                    const isEditing = editingId === row.id;
                    return (
                      <motion.tr
                        key={row.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.22, delay: index * 0.02 }}
                      className={`table-row-hover ${isEditing ? 'bg-accent/10' : ''}`}
                    >
                        <td className="table-td text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={() => toggleSelected(row.id)}
                            aria-label={`Select inventory row ${pageStart + index + 1}`}
                            className="h-4 w-4"
                          />
                        </td>
                        <td className="table-td font-mono text-accent">{isEditing ? <input type="number" className="w-24 px-3 py-2 text-sm" value={editValues.height} onChange={(e) => handleEditChange('height', e.target.value)} /> : formatNumber(row.height)}</td>
                        <td className="table-td font-mono text-accent">{isEditing ? <input type="number" className="w-24 px-3 py-2 text-sm" value={editValues.width} onChange={(e) => handleEditChange('width', e.target.value)} /> : formatNumber(row.width)}</td>
                        <td className="table-td font-mono text-accent">{isEditing ? <input type="number" className="w-24 px-3 py-2 text-sm" value={editValues.length} onChange={(e) => handleEditChange('length', e.target.value)} /> : formatNumber(row.length)}</td>
                        <td className="table-td font-mono text-white">{isEditing ? <input type="number" min="1" className="w-20 px-3 py-2 text-sm" value={editValues.quantity} onChange={(e) => handleEditChange('quantity', e.target.value)} /> : formatNumber(row.quantity)}</td>
                        <td className="table-td text-right">
                          {isEditing ? (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={handleSave} className="rounded-lg border border-success/50 bg-success/15 px-3 py-1.5 text-xs font-bold text-success">Save</button>
                              <button type="button" onClick={cancelEdit} className="rounded-lg border border-border/40 bg-surface-elevated/35 px-3 py-1.5 text-xs font-semibold text-muted">Cancel</button>
                            </div>
                          ) : (
                            <div className="inline-flex gap-2">
                              <button type="button" onClick={() => startEdit(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-accent/40 hover:text-accent">
                                <Pencil size={14} />
                              </button>
                              <button type="button" onClick={() => handleDeleteClick(row)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-danger/40 hover:text-danger">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {items.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                Showing {pageStart + 1}-{Math.min(pageStart + pageItems.length, items.length)} of {items.length}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted">
                  Rows:
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="ml-2 rounded-lg border border-border/40 bg-surface-elevated/40 px-2 py-1 text-xs text-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-xs text-muted">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {items.length === 0 && (
            <div className="card-body py-16 text-center">
              <Package className="mx-auto mb-4 text-muted" size={38} />
              <h3 className="text-lg font-bold text-white">No inventory items</h3>
              <p className="mt-1 text-sm text-muted">Use Add Stock to populate your matrix.</p>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-danger/40 bg-surface/90 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border/35 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-danger/15">
                    <AlertTriangle className="text-danger" size={18} />
                  </div>
                  <p className="font-bold text-white">Delete Inventory Item</p>
                </div>
                <button onClick={() => setDeleteConfirm(null)} className="rounded-lg p-1 text-muted hover:bg-white/5 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-5 p-6">
                <p className="text-sm text-slate-300">This will permanently remove the item from stock.</p>
                <div className="rounded-xl border border-accent/35 bg-accent/10 p-3">
                  <p className="font-mono text-sm text-accent">{deleteConfirm.dimensions}</p>
                  <p className="mt-1 text-xs text-muted">Quantity: {formatNumber(deleteConfirm.quantity)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-border/35 bg-surface-elevated/30 px-4 py-2.5 text-sm font-semibold text-muted">Cancel</button>
                  <button onClick={handleDeleteConfirm} className="flex-1 rounded-xl border border-danger/40 bg-danger/20 px-4 py-2.5 text-sm font-bold text-danger">Delete</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
