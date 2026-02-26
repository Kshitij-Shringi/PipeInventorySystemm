import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, FileSearch, ClipboardCheck, Truck, Upload, FileDown, ListChecks } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/Toast';
import { downloadCsv, normalizeObjectKeys, parseCsvToObjects, readFileText } from '../../utils/csv';

const STORAGE_KEY = 'orderForm_formData';
const emptyReq = () => ({
  length: '',
  width: '',
  height: '',
  quantity_needed: '',
});

export default function OrderForm({ onAnalyse }) {
  const { showToast } = useToast();

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
  const [selectedRows, setSelectedRows] = useState(new Set());
  const fileInputRef = useRef(null);

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

      // Auto-add a new requirement row when the last row is fully filled with valid values.
      const lastIdx = next.length - 1;
      if (idx === lastIdx) {
        const last = next[lastIdx];
        const hasAllFields =
          last.height !== '' &&
          last.width !== '' &&
          last.length !== '' &&
          last.quantity_needed !== '';

        if (hasAllFields) {
          const h = Number(last.height);
          const w = Number(last.width);
          const l = Number(last.length);
          const q = Number(last.quantity_needed);
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
            return [...next, emptyReq()];
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
      setRows([emptyReq()]);
      setSelectedRows(new Set());
      return;
    }
    setRows((prev) => prev.filter((_, idx) => !selectedRows.has(idx)));
    setSelectedRows(new Set());
  };

  const handleAnalyse = () => {
    if (!recipient.trim()) {
      showToast('Enter recipient / order name', 'error');
      return;
    }
    const reqs = [];
    for (let i = 0; i < rows.length; i += 1) {
      const rowNo = i + 1;
      const h = Number(rows[i].height);
      const w = Number(rows[i].width);
      const l = Number(rows[i].length);
      const q = Number(rows[i].quantity_needed);
      if (!Number.isFinite(h) || h <= 0) {
        showToast(`Row ${rowNo}: Height must be a positive number`, 'error');
        return;
      }
      if (!Number.isFinite(w) || w <= 0) {
        showToast(`Row ${rowNo}: Width must be a positive number`, 'error');
        return;
      }
      if (!Number.isFinite(l) || l <= 0) {
        showToast(`Row ${rowNo}: Length must be a positive number`, 'error');
        return;
      }
      if (!Number.isFinite(q) || q < 1 || !Number.isInteger(q)) {
        showToast(`Row ${rowNo}: Qty Needed must be a whole number >= 1`, 'error');
        return;
      }
      reqs.push({
        length: l,
        width: w,
        height: h,
        quantity_needed: q,
      });
    }

    onAnalyse({ recipient: recipient.trim(), requirements: reqs });
  };

  const rowCount = rows.length;
  const totalDemand = rows.reduce((sum, row) => sum + (Number(row.quantity_needed) || 0), 0);

  const downloadTemplate = () => {
    downloadCsv(
      'publish-order-import-template.csv',
      ['recipient', 'height', 'width', 'length', 'quantity_needed'],
      [
        { recipient: 'Site A', height: 40, width: 40, length: 80, quantity_needed: 5 },
        { recipient: 'Site A', height: 50, width: 40, length: 100, quantity_needed: 3 },
      ],
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
      const parsed = parseCsvToObjects(text).map(normalizeObjectKeys);
      if (parsed.length === 0) {
        showToast('CSV is empty', 'error');
        return;
      }
      const firstKeys = Object.keys(parsed[0] || {});
      const has = (k) => firstKeys.includes(k);
      const quantityKey = has('quantity_needed')
        ? 'quantity_needed'
        : has('quantity')
          ? 'quantity'
          : has('qty_needed')
            ? 'qty_needed'
            : has('qty')
              ? 'qty'
              : '';
      const missing = ['height', 'width', 'length'].filter((k) => !has(k));
      if (missing.length > 0 || !quantityKey) {
        const missingMsg = [...missing, ...(quantityKey ? [] : ['quantity_needed (or quantity)'])].join(', ');
        showToast(`CSV missing columns: ${missingMsg}`, 'error');
        return;
      }

      const importedRows = [];
      let importedRecipient = '';
      const recipientSet = new Set();

      for (let i = 0; i < parsed.length; i += 1) {
        const row = parsed[i];
        const rowNo = i + 2;
        const height = Number(row.height);
        const width = Number(row.width);
        const length = Number(row.length);
        const quantityNeeded = Number(row[quantityKey]);
        const rowRecipient = (row.recipient || '').toString().trim();

        if (rowRecipient) {
          recipientSet.add(rowRecipient);
          if (!importedRecipient) importedRecipient = rowRecipient;
        }

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
        if (!Number.isFinite(quantityNeeded) || quantityNeeded < 1 || !Number.isInteger(quantityNeeded)) {
          showToast(`CSV row ${rowNo}: "${quantityKey}" must be a whole number >= 1`, 'error');
          return;
        }

        importedRows.push({
          height: String(height),
          width: String(width),
          length: String(length),
          quantity_needed: String(Math.floor(quantityNeeded)),
        });
      }

      if (recipientSet.size > 1) {
        showToast(`CSV has multiple recipients (${Array.from(recipientSet).join(', ')}). Use one recipient for the full file.`, 'error');
        return;
      }

      setRows(importedRows.length > 0 ? importedRows : [emptyReq()]);
      setSelectedRows(new Set());
      if (importedRecipient) setRecipient(importedRecipient);
      showToast(`Imported ${importedRows.length} requirements`, 'success');
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
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/45 bg-accent/10 flex-shrink-0">
              <FileSearch className="text-accent" size={22} />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white">Order Planning Desk</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Define demand, run analysis, and execute with remainder decisions in one flow.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Req Rows</p>
              <p className="mt-1 text-2xl font-bold text-white">{rowCount}</p>
            </div>
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Total Demand</p>
              <p className="mt-1 text-2xl font-bold text-accent">{totalDemand}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="card">
          <div className="card-header route-line flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-title">Requirement Grid</h2>
              <button type="button" onClick={addRow} className="btn-ghost inline-flex items-center gap-2 px-4 py-2">
                <Plus size={16} />
                Add Requirement
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
          <div className="px-8 pt-3 text-xs text-muted">
            CSV import rule: use one recipient/order name for the whole file; add multiple rows for requirements.
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportFile} />

          <div className="card-body space-y-6">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.15em] text-muted">Recipient / Order Name</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Site A"
                className="w-full px-3 py-2.5 rounded-md bg-[#05060b] border border-border/60 text-sm text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/70"
              />
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-2xl border border-border/35 bg-surface-elevated/25">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr>
                    <th className="table-th w-14 text-center">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selectedRows.size === rows.length}
                        onChange={toggleSelectAll}
                        aria-label="Select all requirements"
                        className="h-4 w-4"
                      />
                    </th>
                    <th className="table-th">Height</th>
                    <th className="table-th">Width</th>
                    <th className="table-th">Length</th>
                    <th className="table-th">Qty Needed</th>
                    <th className="table-th text-right">Action</th>
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
                        <td className="table-td text-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(idx)}
                            onChange={() => toggleRowSelected(idx)}
                            aria-label={`Select requirement row ${idx + 1}`}
                            className="h-4 w-4"
                          />
                        </td>
                    <td className="table-td">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.height}
                        onChange={(e) => updateRow(idx, 'height', e.target.value)}
                        className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                      />
                    </td>
                    <td className="table-td">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.width}
                        onChange={(e) => updateRow(idx, 'width', e.target.value)}
                        className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                      />
                    </td>
                    <td className="table-td">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={row.length}
                        onChange={(e) => updateRow(idx, 'length', e.target.value)}
                        className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                      />
                    </td>
                    <td className="table-td">
                      <input
                        type="number"
                        min="1"
                        value={row.quantity_needed}
                        onChange={(e) => updateRow(idx, 'quantity_needed', e.target.value)}
                        className="w-24 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70"
                      />
                    </td>
                        <td className="table-td text-right">
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
            <p className="text-xs uppercase tracking-[0.15em] text-muted">Planning Checklist</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-border/35 bg-surface-elevated/35 p-3">
                <div className="flex items-center gap-2 text-slate-200"><Truck size={16} className="text-accent" /> Recipient</div>
                <p className="mt-1 text-sm font-semibold text-white">{recipient.trim() || 'Not set'}</p>
              </div>
              <div className="rounded-xl border border-border/35 bg-surface-elevated/35 p-3">
                <div className="flex items-center gap-2 text-slate-200"><ClipboardCheck size={16} className="text-success" /> Demand</div>
                <p className="mt-1 text-sm font-semibold text-white">{rowCount} requirements / {totalDemand} qty</p>
              </div>
            </div>
            <button type="button" onClick={handleAnalyse} className="btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 text-sm">
              <FileSearch size={18} />
              Analyse Order
            </button>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
