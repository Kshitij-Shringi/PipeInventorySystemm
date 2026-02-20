import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { addStock, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';

const STORAGE_KEY = 'addStock_formData';
const emptyRow = () => ({ length: '', width: '', height: '', quantity: '' });

export default function AddStock({ refreshInventory, refreshOrders }) {
  const { showToast } = useToast();
  
  // Load from localStorage on mount
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          fromSupplier: parsed.fromSupplier || '',
          rows: parsed.rows && parsed.rows.length > 0 ? parsed.rows : [emptyRow()],
        };
      }
    } catch (e) {
      console.error('Failed to load saved form data', e);
    }
    return { fromSupplier: '', rows: [emptyRow()] };
  };

  const saved = loadSavedData();
  const [fromSupplier, setFromSupplier] = useState(saved.fromSupplier);
  const [rows, setRows] = useState(saved.rows);

  // Save to localStorage whenever form data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fromSupplier, rows }));
    } catch (e) {
      console.error('Failed to save form data', e);
    }
  }, [fromSupplier, rows]);

  const addRow = () => setRows((r) => [...r, emptyRow()]);

  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const validate = () => {
    const s = (fromSupplier || '').trim();
    if (!s) {
      showToast('Supplier name is required', 'error');
      return false;
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const l = Number(r.length);
      const w = Number(r.width);
      const h = Number(r.height);
      const q = Number(r.quantity);
      if (isNaN(l) || l <= 0 || isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(q) || q < 1) {
        showToast(`Row ${i + 1}: enter positive numbers for length, width, height and quantity`, 'error');
        return false;
      }
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    const pipes = rows.map((r) => ({
      length: Number(r.length),
      width: Number(r.width),
      height: Number(r.height),
      quantity: Number(r.quantity),
    }));
    try {
      await addStock({ from_supplier: fromSupplier.trim(), pipes });
      showToast('Stock added', 'success');
      // Clear form and localStorage after successful submit
      setFromSupplier('');
      setRows([emptyRow()]);
      localStorage.removeItem(STORAGE_KEY);
      // Refresh inventory and orders (for stock activity)
      refreshInventory?.();
      refreshOrders?.();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to add stock'), 'error');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-lg text-white">Add Stock</h2>
              <p className="font-sans text-sm text-muted mt-0.5">Record new pipe deliveries</p>
            </div>
          </div>
        </div>
        <div className="card-body space-y-6">
          <div>
            <label className="block text-sm font-sans font-medium text-gray-300 mb-2">
              Supplier / From
            </label>
            <input
              type="text"
              value={fromSupplier}
              onChange={(e) => setFromSupplier(e.target.value)}
              placeholder="e.g. Astral Pipes"
              className="w-full max-w-md px-4 py-3 bg-[#0f1117] border border-border rounded-lg font-sans text-white placeholder-muted"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-sans font-medium text-gray-300">Pipe entries</label>
              <button
                type="button"
                onClick={addRow}
                className="btn-ghost flex items-center gap-2 text-accent hover:text-accent hover:bg-accent/10"
              >
                <Plus size={18} />
                Add row
              </button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-elevated/50 border-b border-border">
                    <th className="table-th">Length</th>
                    <th className="table-th">Width</th>
                    <th className="table-th">Height</th>
                    <th className="table-th">Quantity</th>
                    <th className="table-th w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="table-row-hover">
                      <td className="table-td">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={row.length}
                          onChange={(e) => updateRow(idx, 'length', e.target.value)}
                          className="w-24 px-3 py-2 bg-[#0f1117] border border-border rounded-lg font-mono text-sm text-white"
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
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                          className="w-20 px-3 py-2 bg-[#0f1117] border border-border rounded-lg font-mono text-sm text-white"
                        />
                      </td>
                      <td className="table-td">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className="btn-icon-danger inline-flex"
                          aria-label="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-surface-elevated/30">
          <button type="button" onClick={submit} className="btn-primary inline-flex items-center gap-2">
            <Package size={18} />
            Add to inventory
          </button>
        </div>
      </div>
    </div>
  );
}
