import React, { useState, useEffect } from 'react';
import { Trash2, Package, Loader2, Pencil, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchInventory, deleteInventoryItem, updateInventoryItem, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { formatNumber } from '../utils/format';

export default function Inventory({ refreshTrigger }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ length: '', width: '', height: '', quantity: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, dimensions }
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInventory();
      const sorted = [...data].sort((a, b) => (b.length ?? 0) - (a.length ?? 0));
      setItems(sorted);
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
    // Prevent entering 0 or negative values for quantity
    if (field === 'quantity') {
      const numValue = Number(value);
      if (value !== '' && (isNaN(numValue) || numValue < 1)) {
        return; // Don't update if invalid
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
      await updateInventoryItem(editingId, {
        length,
        width,
        height,
        quantity: numQty,
      });
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
      dimensions: `${formatNumber(row.length)} × ${formatNumber(row.width)} × ${formatNumber(row.height)}`,
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

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  const uniqueSizes = new Set(items.map((i) => `${i.length}-${i.width}-${i.height}`)).size;
  const totalPipes = items.reduce((s, i) => s + (i.quantity ?? 0), 0);

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="card-body flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />
            <p className="font-sans text-muted">Loading inventory…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="p-8 max-w-5xl mx-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="card"
      >
        <div className="card-header flex flex-wrap items-center justify-between gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex items-center gap-3"
          >
            <motion.div
              className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Package className="w-5 h-5 text-accent" />
            </motion.div>
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Inventory</h2>
              <p className="font-sans text-sm text-muted mt-0.5">Stock by dimensions</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-center gap-2"
          >
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-sans font-medium bg-gradient-to-r from-white/10 to-white/5 text-gray-300 backdrop-blur-sm"
            >
              {uniqueSizes} unique size{uniqueSizes !== 1 ? 's' : ''}
            </motion.span>
            <motion.span
              whileHover={{ scale: 1.05 }}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-sans font-medium bg-accent/20 text-accent"
            >
              {totalPipes} total pipe{totalPipes !== 1 ? 's' : ''}
            </motion.span>
          </motion.div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-elevated/50">
                <th className="table-th">Length</th>
                <th className="table-th">Width</th>
                <th className="table-th">Height</th>
                <th className="table-th">Quantity</th>
                <th className="table-th w-24 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {items.map((row, index) => {
                  const isEditing = editingId === row.id;
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      className={`table-row-hover transition-colors ${
                        isEditing ? 'bg-white/[0.04] border-l-2 border-l-accent' : ''
                      }`}
                    >
                    <td className="table-td font-mono text-accent font-medium">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 bg-surface border border-accent/60 rounded px-2 py-1 text-sm font-mono text-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          value={editValues.length}
                          onChange={(e) => handleEditChange('length', e.target.value)}
                        />
                      ) : (
                        formatNumber(row.length)
                      )}
                    </td>
                    <td className="table-td font-mono text-accent">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 bg-surface border border-accent/60 rounded px-2 py-1 text-sm font-mono text-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          value={editValues.width}
                          onChange={(e) => handleEditChange('width', e.target.value)}
                        />
                      ) : (
                        formatNumber(row.width)
                      )}
                    </td>
                    <td className="table-td font-mono text-accent">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 bg-surface border border-accent/60 rounded px-2 py-1 text-sm font-mono text-accent focus:outline-none focus:ring-1 focus:ring-accent"
                          value={editValues.height}
                          onChange={(e) => handleEditChange('height', e.target.value)}
                        />
                      ) : (
                        formatNumber(row.height)
                      )}
                    </td>
                    <td className="table-td font-mono font-semibold text-white">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-20 bg-surface border border-accent/60 rounded px-2 py-1 text-sm font-mono text-white focus:outline-none focus:ring-1 focus:ring-accent"
                          value={editValues.quantity}
                          onChange={(e) => handleEditChange('quantity', e.target.value)}
                          min="1"
                          step="1"
                        />
                      ) : (
                        formatNumber(row.quantity)
                      )}
                    </td>
                    <td className="table-td text-right">
                      {isEditing ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSave}
                            className="px-3 py-1 rounded-lg text-xs font-sans font-semibold bg-success/20 text-success border border-success hover:bg-success/30"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1 rounded-lg text-xs font-sans font-semibold bg-white/5 text-muted border border-border hover:bg-white/10"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="inline-flex items-center justify-end gap-2"
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => startEdit(row)}
                            className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-sans text-muted hover:text-accent hover:bg-white/5 border border-transparent hover:border-accent/40 transition-all duration-200"
                            aria-label="Edit"
                          >
                            <Pencil size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteClick(row)}
                            className="btn-icon-danger inline-flex items-center justify-center"
                            aria-label="Delete"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </motion.div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="card-body flex flex-col items-center justify-center py-16 text-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4"
            >
              <Package className="w-8 h-8 text-muted" />
            </motion.div>
            <p className="font-sans text-muted">No inventory items yet.</p>
            <p className="font-sans text-sm text-muted/80 mt-1">Add stock to get started.</p>
          </motion.div>
        )}
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleDeleteCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-border rounded-xl shadow-card max-w-md w-full mx-4 overflow-hidden"
            >
            <div className="px-6 py-5 border-b border-border bg-surface-elevated/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-lg bg-danger/15 flex items-center justify-center"
                >
                  <AlertTriangle className="w-5 h-5 text-danger" />
                </motion.div>
                <h3 className="font-sans font-bold text-lg text-white">Delete Inventory Item</h3>
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDeleteCancel}
                className="p-1.5 rounded-lg text-muted hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </motion.button>
            </div>
            <div className="p-6">
              <p className="font-sans text-gray-300 mb-2">
                Are you sure you want to delete this inventory item?
              </p>
              <div className="mt-4 p-3 rounded-lg bg-surface-elevated/50 border border-border">
                <p className="font-mono text-sm text-accent font-medium">{deleteConfirm.dimensions}</p>
                <p className="font-sans text-xs text-muted mt-1">Quantity: {formatNumber(deleteConfirm.quantity)}</p>
              </div>
              <div className="flex gap-3 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-2.5 rounded-lg font-sans font-semibold text-gray-300 bg-gradient-to-r from-white/5 to-white/10 border border-border hover:from-white/10 hover:to-white/15 transition-all duration-200"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 rounded-lg font-sans font-semibold text-white bg-danger hover:bg-danger-hover transition-colors shadow-card"
                >
                  Delete
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
