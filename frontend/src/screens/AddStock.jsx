import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Package, Building2, Layers3, Upload, FileDown, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addStock, fetchProducts, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';
import { downloadCsv, normalizeObjectKeys, parseCsvToObjects, readFileText } from '../utils/csv';

const STORAGE_KEY = 'addStock_formData';
const emptyRow = () => ({ length: '', width: '', height: '', quantity: '', from_supplier: '' });

export default function AddStock({ refreshInventory, refreshOrders }) {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {});
  }, []);

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
  const [selectedRows, setSelectedRows] = useState(new Set());
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ fromSupplier, rows }));
    } catch (e) {
      console.error('Failed to save form data', e);
    }
  }, [fromSupplier, rows]);

  const applyProduct = (idx, productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setRows((prev) =>
      prev.map((row, i) =>
        i === idx
          ? {
              ...row,
              width: String(product.width),
              height: String(product.height),
              ...(product.length ? { length: String(product.length) } : {}),
            }
          : row
      )
    );
  };

  const addRow = () => setRows((r) => [...r, emptyRow()]);

  const removeRow = (idx) => {
    if (rows.length <= 1) return;
    setRows((r) => r.filter((_, i) => i !== idx));
    setSelectedRows((prev) => {
      const next = new Set();
      Array.from(prev).forEach((i) => {
        if (i < idx) next.add(i);
        if (i > idx) next.add(i - 1);
      });
      return next;
    });
  };

  const updateRow = (idx, field, value) => {
    setRows((prevRows) => {
      const next = prevRows.map((row, i) => (i === idx ? { ...row, [field]: value } : row));

      // Auto-add a fresh row when the last row becomes fully filled with valid values.
      const lastIdx = next.length - 1;
      if (idx === lastIdx) {
        const last = next[lastIdx];
        const hasAllFields =
          last.height !== '' &&
          last.width !== '' &&
          last.length !== '' &&
          last.quantity !== '';

        if (hasAllFields) {
          const h = Number(last.height);
          const w = Number(last.width);
          const l = Number(last.length);
          const q = Number(last.quantity);
          const validNumbers =
            Number.isFinite(h) &&
            h > 0 &&
            Number.isFinite(w) &&
            w > 0 &&
            Number.isFinite(l) &&
            l > 0 &&
            Number.isFinite(q) &&
            Number.isInteger(q) &&
            q >= 1;

          if (validNumbers) {
            return [...next, emptyRow()];
          }
        }
      }

      return next;
    });
  };

  const toggleRowSelected = (idx) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
      return;
    }
    setSelectedRows(new Set(rows.map((_, idx) => idx)));
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    if (selectedRows.size >= rows.length) {
      setRows([emptyRow()]);
      setSelectedRows(new Set());
      return;
    }
    setRows((prev) => prev.filter((_, idx) => !selectedRows.has(idx)));
    setSelectedRows(new Set());
  };

  const isRowEmpty = (row) => {
    const hasDimsOrQty =
      row.height !== '' || row.width !== '' || row.length !== '' || row.quantity !== '';
    const hasSupplier = (row.from_supplier || '').trim() !== '';
    return !hasDimsOrQty && !hasSupplier;
  };

  const validate = () => {
    const seenBySupplierAndDims = new Set();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
       if (isRowEmpty(row)) {
         // Allow an auto-added trailing empty row (or any fully empty row) without blocking submit.
         continue;
       }
      const rowNo = i + 1;
      const supplier = (row.from_supplier || '').trim() || fromSupplier.trim();
      const h = Number(row.height);
      const w = Number(row.width);
      const l = Number(row.length);
      const q = Number(row.quantity);
      if (!supplier) {
        showToast(`Row ${rowNo}: Supplier is required (row or top field)`, 'error');
        return false;
      }
      if (!Number.isFinite(h) || h <= 0) {
        showToast(`Row ${rowNo}: Height must be a positive number`, 'error');
        return false;
      }
      if (!Number.isFinite(w) || w <= 0) {
        showToast(`Row ${rowNo}: Width must be a positive number`, 'error');
        return false;
      }
      if (!Number.isFinite(l) || l <= 0) {
        showToast(`Row ${rowNo}: Length must be a positive number`, 'error');
        return false;
      }
      if (!Number.isFinite(q) || q < 1 || !Number.isInteger(q)) {
        showToast(`Row ${rowNo}: Quantity must be a whole number >= 1`, 'error');
        return false;
      }

      const key = `${supplier.toLowerCase()}|${h}|${w}|${l}`;
      if (seenBySupplierAndDims.has(key)) {
        showToast(
          `Row ${rowNo}: Duplicate dimensions for supplier "${supplier}". Use a different supplier for same H x W x L.`,
          'error',
        );
        return false;
      }
      seenBySupplierAndDims.add(key);
    }
    if (seenBySupplierAndDims.size === 0) {
      showToast('Add at least one non-empty row before submitting', 'error');
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    const effectiveRows = rows.filter((r) => !isRowEmpty(r));
    const grouped = new Map();
    effectiveRows.forEach((r) => {
      const supplier = (r.from_supplier || '').trim() || fromSupplier.trim();
      if (!grouped.has(supplier)) grouped.set(supplier, []);
      grouped.get(supplier).push({
        length: Number(r.length),
        width: Number(r.width),
        height: Number(r.height),
        quantity: Number(r.quantity),
      });
    });
    try {
      await Promise.all(
        Array.from(grouped.entries()).map(([supplier, pipes]) =>
          addStock({ from_supplier: supplier, pipes }),
        ),
      );
      showToast('Stock added', 'success');
      setFromSupplier('');
      setRows([emptyRow()]);
      localStorage.removeItem(STORAGE_KEY);
      refreshInventory?.();
      refreshOrders?.();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to add stock'), 'error');
    }
  };

  const totalRows = rows.length;
  const totalQuantityDraft = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);

  const downloadTemplate = () => {
    downloadCsv(
      'add-stock-import-template.csv',
      ['from_supplier', 'height', 'width', 'length', 'quantity'],
      [{ from_supplier: 'Astral pipes', height: 40, width: 40, length: 120, quantity: 10 }],
    );
  };

  const openImportPicker = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await readFileText(file);
      const parsedRows = parseCsvToObjects(text).map(normalizeObjectKeys);
      if (parsedRows.length === 0) {
        showToast('CSV is empty', 'error');
        return;
      }
      const firstKeys = Object.keys(parsedRows[0] || {});
      const has = (k) => firstKeys.includes(k);

      // Reject Publish Order template files — they have recipient but no from_supplier
      if (has('recipient')) {
        showToast(
          'Please use the Add Stock template.',
          'error',
        );
        return;
      }

      const required = ['height', 'width', 'length', 'quantity'];
      const missing = required.filter((k) => !has(k));
      if (missing.length > 0) {
        showToast(
          `Wrong template. Download the Add Stock template — it needs columns: ${required.join(', ')}.`,
          'error',
        );
        return;
      }

      const suppliers = new Set();
      const importedRows = [];

      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const rowNo = i + 2;
        const height = Number(row.height);
        const width = Number(row.width);
        const length = Number(row.length);
        const quantity = Number(row.quantity);
        const supplier = (row.from_supplier || row.supplier || '').toString().trim();

        if (supplier) suppliers.add(supplier);
        if (!Number.isFinite(height) || height <= 0) {
          showToast(`CSV row ${rowNo}: "height" must be a positive number`, 'error');
          return;
        }
        if (!Number.isFinite(width) || width <= 0) {
          showToast(`CSV row ${rowNo}: "width" must be a positive number`, 'error');
          return;
        }
        if (!Number.isFinite(length) || length <= 0) {
          showToast(`CSV row ${rowNo}: "length" must be a positive number`, 'error');
          return;
        }
        if (!Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
          showToast(`CSV row ${rowNo}: "quantity" must be a whole number >= 1`, 'error');
          return;
        }

        importedRows.push({
          height: String(height),
          width: String(width),
          length: String(length),
          quantity: String(Math.floor(quantity)),
          from_supplier: supplier,
        });
      }
      if (suppliers.size === 1) {
        setFromSupplier(Array.from(suppliers)[0]);
      } else {
        setFromSupplier('');
      }
      setRows(importedRows.length > 0 ? importedRows : [emptyRow()]);
      setSelectedRows(new Set());
      if (suppliers.size > 1) {
        showToast(`Imported ${importedRows.length} rows across ${suppliers.size} suppliers`, 'success');
      } else {
        showToast(`Imported ${importedRows.length} rows`, 'success');
      }
    } catch (e) {
      showToast('Failed to import CSV', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="page-shell space-y-6"
    >
      <section className="hero-panel p-6 sm:p-7">
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="flex items-start gap-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-success/40 bg-success/10 flex-shrink-0">
              <Plus className="text-success" size={22} />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white">Inbound Stock Intake</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Capture supplier lots with exact dimensions before they enter inventory.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Draft Rows</p>
              <p className="mt-1 text-2xl font-bold text-white">{totalRows}</p>
            </div>
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Draft Qty</p>
              <p className="mt-1 text-2xl font-bold text-accent">{totalQuantityDraft}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="card">
          <div className="card-header route-line flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">Entry Table</h2>
              <button type="button" onClick={addRow} className="btn-ghost inline-flex items-center gap-2 px-4 py-2">
                <Plus size={16} />
                Add Row
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={toggleSelectAll} className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-xs">
                <ListChecks size={14} />
                {selectedRows.size === rows.length ? 'Unselect All' : 'Select All'}
              </button>
              <button
                type="button"
                onClick={deleteSelectedRows}
                disabled={selectedRows.size === 0}
                className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} />
                Delete Selected ({selectedRows.size})
              </button>
              <button type="button" onClick={downloadTemplate} className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-xs">
                <FileDown size={14} />
                Template
              </button>
              <button type="button" onClick={openImportPicker} className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-xs">
                <Upload size={14} />
                Import CSV
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />
          <div className="card-body space-y-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">Supplier / Source</label>
                <input
                  type="text"
                  value={fromSupplier}
                  onChange={(e) => setFromSupplier(e.target.value)}
                  placeholder="Default supplier for rows without supplier"
                  className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/70"
                />
              </div>
              <div className="rounded-xl border border-border/35 bg-surface-elevated/30 px-4 py-3 text-sm text-muted">
                <span className="font-semibold text-slate-200">{totalRows}</span> entries prepared
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-2xl border border-border/35 bg-surface-elevated/25">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr>
                    <th className="table-th w-12 text-center">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selectedRows.size === rows.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all rows"
                        className="h-4 w-4"
                      />
                    </th>
                    {products.length > 0 && <th className="table-th text-left">Product</th>}
                    <th className="table-th text-left">Height</th>
                    <th className="table-th text-left">Width</th>
                    <th className="table-th text-left">Length</th>
                    <th className="table-th text-left">Quantity</th>
                    <th className="table-th text-left">Supplier (optional)</th>
                    <th className="table-th text-center w-32">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {rows.map((row, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, x: -18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 18 }}
                        transition={{ duration: 0.2 }}
                        className="table-row-hover"
                      >
                        <td className="table-td w-12 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(idx)}
                            onChange={() => toggleRowSelected(idx)}
                            aria-label={`Select row ${idx + 1}`}
                            className="h-4 w-4"
                          />
                        </td>
                        {products.length > 0 && (
                          <td className="table-td text-left">
                            <select
                              defaultValue=""
                              onChange={(e) => applyProduct(idx, e.target.value)}
                              className="w-36 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                            >
                              <option value="" disabled>— select —</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.width}×{p.height})
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="table-td text-left">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.height}
                            onChange={(e) => updateRow(idx, 'height', e.target.value)}
                            className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                          />
                        </td>
                        <td className="table-td text-left">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.width}
                            onChange={(e) => updateRow(idx, 'width', e.target.value)}
                            className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                          />
                        </td>
                        <td className="table-td text-left">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={row.length}
                            onChange={(e) => updateRow(idx, 'length', e.target.value)}
                            className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                          />
                        </td>
                        <td className="table-td text-left">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateRow(idx, 'quantity', e.target.value)}
                            className="w-24 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                          />
                        </td>
                        <td className="table-td text-left">
                          <input
                            type="text"
                            value={row.from_supplier || ''}
                            onChange={(e) => updateRow(idx, 'from_supplier', e.target.value)}
                            placeholder={fromSupplier || 'Use default above'}
                            className="w-44 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-xs text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/70"
                          />
                        </td>
                        <td className="table-td text-center w-32">
                          <button type="button" onClick={() => removeRow(idx)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-danger/40 hover:text-danger">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Intake Snapshot</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border/35 bg-surface-elevated/35 p-3">
                <div className="flex items-center gap-2 text-slate-200">
                  <Building2 size={16} className="text-accent" />
                  <span className="text-sm">Supplier</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{fromSupplier.trim() || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-border/35 bg-surface-elevated/35 p-3">
                <div className="flex items-center gap-2 text-slate-200">
                  <Layers3 size={16} className="text-success" />
                  <span className="text-sm">Draft Volume</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{totalRows} rows / {totalQuantityDraft} qty</p>
              </div>
            </div>
            <button type="button" onClick={submit} className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 text-sm">
              <Package size={18} />
              Add to Inventory
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
