import React, { useState, useEffect } from 'react';
import { Plus, Trash2, FileSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/Toast';

const STORAGE_KEY = 'orderForm_formData';
const emptyReq = () => ({
  length: '',
  width: '',
  height: '',
  quantity_needed: '',
});

export default function OrderForm({ onAnalyse }) {
  const { showToast } = useToast();
  
  // Load from localStorage on mount
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          recipient: parsed.recipient || '',
          rows: parsed.rows && parsed.rows.length > 0 ? parsed.rows : [emptyReq()],
        };
      }
    } catch (e) {
      console.error('Failed to load saved form data', e);
    }
    return { recipient: '', rows: [emptyReq()] };
  };

  const saved = loadSavedData();
  const [recipient, setRecipient] = useState(saved.recipient);
  const [rows, setRows] = useState(saved.rows);

  // Save to localStorage whenever form data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ recipient, rows }));
    } catch (e) {
      console.error('Failed to save form data', e);
    }
  }, [recipient, rows]);

  const addRow = () => setRows((r) => [...r, emptyReq()]);
  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((_, i) => i !== idx));
  };
  const updateRow = (idx, field, value) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleAnalyse = () => {
    if (!recipient.trim()) {
      showToast('Enter recipient / order name', 'error');
      return;
    }
    const reqs = rows
      .map((r) => ({
        length: Number(r.length),
        width: Number(r.width),
        height: Number(r.height),
        quantity_needed: Number(r.quantity_needed),
      }))
      .filter((r) => !isNaN(r.length) && r.length > 0 && !isNaN(r.width) && r.width > 0 && !isNaN(r.height) && r.height > 0 && !isNaN(r.quantity_needed) && r.quantity_needed > 0);
    if (reqs.length === 0) {
      showToast('Add at least one requirement with positive length, width, height and qty', 'error');
      return;
    }
    // Don't clear localStorage here - keep form data in case user goes back
    // It will be cleared only when order is successfully executed
    onAnalyse({ recipient: recipient.trim(), requirements: reqs });
  };

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
        <div className="card-header">
          <div className="flex items-center gap-3">
            <motion.div
                className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center"
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <FileSearch className="w-5 h-5 text-accent" />
            </motion.div>
            <div>
              <h2 className="font-sans font-bold text-lg text-white">New order</h2>
              <p className="font-sans text-sm text-muted mt-0.5">Define recipient and requirements</p>
            </div>
          </div>
        </div>
        <div className="card-body space-y-6">
          <div>
            <label className="block text-sm font-sans font-medium text-gray-300 mb-2">
              Recipient / Order name
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Site A"
              className="w-full max-w-md px-4 py-3 bg-[#0f1117] border border-border rounded-lg font-sans text-white placeholder-muted"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-sans font-medium text-gray-300">Requirements</label>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addRow}
                className="btn-ghost flex items-center gap-2 text-accent hover:text-accent hover:bg-accent/10 transition-all duration-200"
              >
                <Plus size={18} />
                Add requirement
              </motion.button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-elevated/50 border-b border-border">
                    <th className="table-th">Required length</th>
                    <th className="table-th">Width</th>
                    <th className="table-th">Height</th>
                    <th className="table-th">Qty needed</th>
                    <th className="table-th w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rows.map((row, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        className="table-row-hover"
                      >
                      <td className="table-td">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.length}
                          onChange={(e) => updateRow(idx, 'length', e.target.value)}
                          className="w-28 px-3 py-2 bg-[#0f1117] border border-border rounded-lg font-mono text-sm text-white"
                        />
                      </td>
                      <td className="table-td">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.width}
                          onChange={(e) => updateRow(idx, 'width', e.target.value)}
                          className="w-24 px-3 py-2 bg-[#0f1117] border border-border rounded-lg font-mono text-sm text-white"
                        />
                      </td>
                      <td className="table-td">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.height}
                          onChange={(e) => updateRow(idx, 'height', e.target.value)}
                          className="w-24 px-3 py-2 bg-[#0f1117] border border-border rounded-lg font-mono text-sm text-white"
                        />
                      </td>
                      <td className="table-td">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity_needed}
                          onChange={(e) => updateRow(idx, 'quantity_needed', e.target.value)}
                          className="w-24 px-3 py-2 bg-[#0f1117] border border-border rounded-lg font-mono text-sm text-white"
                        />
                      </td>
                      <td className="table-td">
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeRow(idx)}
                          className="btn-icon-danger inline-flex"
                          aria-label="Remove"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-surface-elevated/30">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyse}
            className="btn-primary inline-flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
            >
              <FileSearch size={18} />
            </motion.div>
            Analyse order
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
