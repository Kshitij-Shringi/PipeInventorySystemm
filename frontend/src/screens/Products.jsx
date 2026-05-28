import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, Boxes, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchProducts, createProduct, updateProduct, deleteProduct, getErrorMessage } from '../api';
import { useToast } from '../components/Toast';

const emptyRow = () => ({ name: '', width: '', height: '', length: '' });

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([emptyRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyRow());

  const load = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to load products'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isRowEmpty = (row) =>
    !row.name.trim() && row.width === '' && row.height === '' && row.length === '';

  const updateRow = (idx, field, value) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r));

      // Auto-add a new row when last row is fully filled with valid values
      const lastIdx = next.length - 1;
      if (idx === lastIdx) {
        const last = next[lastIdx];
        const w = Number(last.width);
        const h = Number(last.height);
        const l = Number(last.length);
        const allFilled = last.name.trim() && last.width !== '' && last.height !== '' && last.length !== '';
        const allValid =
          allFilled &&
          Number.isFinite(w) && w > 0 &&
          Number.isFinite(h) && h > 0 &&
          Number.isFinite(l) && l > 0;
        if (allValid) return [...next, emptyRow()];
      }
      return next;
    });
  };

  const removeRow = (idx) => {
    if (rows.length <= 1) { setRows([emptyRow()]); return; }
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const effective = rows.filter((r) => !isRowEmpty(r));
    if (effective.length === 0) return showToast('Add at least one product row', 'error');

    for (let i = 0; i < effective.length; i++) {
      const r = effective[i];
      const rowNo = i + 1;
      if (!r.name.trim()) return showToast(`Row ${rowNo}: Name is required`, 'error');
      if (!Number.isFinite(Number(r.width)) || Number(r.width) <= 0) return showToast(`Row ${rowNo}: Width must be a positive number`, 'error');
      if (!Number.isFinite(Number(r.height)) || Number(r.height) <= 0) return showToast(`Row ${rowNo}: Height must be a positive number`, 'error');
      if (!Number.isFinite(Number(r.length)) || Number(r.length) <= 0) return showToast(`Row ${rowNo}: Length must be a positive number`, 'error');
    }

    setSubmitting(true);
    try {
      const created = await Promise.all(
        effective.map((r) =>
          createProduct({ name: r.name.trim(), width: Number(r.width), height: Number(r.height), length: Number(r.length) })
        )
      );
      setProducts((prev) => [...prev, ...created].sort((a, b) => a.name.localeCompare(b.name)));
      setRows([emptyRow()]);
      showToast(`${created.length} product${created.length > 1 ? 's' : ''} created`, 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to create product'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      width: String(product.width),
      height: String(product.height),
      length: String(product.length ?? ''),
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(emptyRow()); };

  const saveEdit = async (id) => {
    const name = editForm.name.trim();
    const width = Number(editForm.width);
    const height = Number(editForm.height);
    const length = Number(editForm.length);
    if (!name) return showToast('Name is required', 'error');
    if (!width || width <= 0) return showToast('Width must be a positive number', 'error');
    if (!height || height <= 0) return showToast('Height must be a positive number', 'error');
    if (!length || length <= 0) return showToast('Length must be a positive number', 'error');

    try {
      const updated = await updateProduct(id, { name, width, height, length });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? updated : p)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      showToast('Product updated', 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to update product'), 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Product deleted', 'success');
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to delete product'), 'error');
    }
  };

  const filledRows = rows.filter((r) => !isRowEmpty(r)).length;

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
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent/40 bg-accent/10 flex-shrink-0">
              <Boxes className="text-accent" size={22} />
            </div>
            <div>
              <h1 className="font-display text-4xl font-bold text-white">Products</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Define pipe profiles. Selecting a product in Add Stock or Publish Order auto-fills width, height and length.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Catalogue</p>
              <p className="mt-1 text-2xl font-bold text-white">{products.length}</p>
            </div>
            <div className="metric-tile">
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted">Draft Rows</p>
              <p className="mt-1 text-2xl font-bold text-accent">{filledRows}</p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="card">
          <div className="card-header route-line flex items-center justify-between">
            <h2 className="section-title">Product Catalogue</h2>
            <button type="button" onClick={() => setRows((r) => [...r, emptyRow()])}
              className="btn-ghost inline-flex items-center gap-2 px-3 py-2 text-xs">
              <Plus size={14} /> Add Row
            </button>
          </div>
          <div className="card-body space-y-6">
            {/* Existing products */}
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-muted">No products yet. Fill the rows below and save.</p>
            ) : (
              <div className="overflow-x-auto no-scrollbar rounded-2xl border border-border/35 bg-surface-elevated/25">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="table-th text-left">Name</th>
                      <th className="table-th text-left">Width</th>
                      <th className="table-th text-left">Height</th>
                      <th className="table-th text-left">Length</th>
                      <th className="table-th text-center w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {products.map((product) => (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.18 }}
                          className="table-row-hover"
                        >
                          {editingId === product.id ? (
                            <>
                              <td className="table-td">
                                <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-sm text-white focus:outline-none focus:ring-1 focus:ring-accent/70" />
                              </td>
                              {['width', 'height', 'length'].map((field) => (
                                <td key={field} className="table-td">
                                  <input type="number" step="any" min="0" value={editForm[field]}
                                    onChange={(e) => setEditForm((f) => ({ ...f, [field]: e.target.value }))}
                                    className="w-24 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent/70" />
                                </td>
                              ))}
                              <td className="table-td text-center">
                                <div className="inline-flex items-center gap-1">
                                  <button type="button" onClick={() => saveEdit(product.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-success/40 text-success hover:bg-success/10">
                                    <Check size={14} />
                                  </button>
                                  <button type="button" onClick={cancelEdit}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:text-slate-200">
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="table-td font-semibold text-white">{product.name}</td>
                              <td className="table-td font-mono text-accent">{product.width}</td>
                              <td className="table-td font-mono text-accent">{product.height}</td>
                              <td className="table-td font-mono text-accent">{product.length ?? '—'}</td>
                              <td className="table-td text-center">
                                <div className="inline-flex items-center gap-1">
                                  <button type="button" onClick={() => startEdit(product)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-accent/40 hover:text-accent">
                                    <Pencil size={13} />
                                  </button>
                                  <button type="button" onClick={() => handleDelete(product.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-danger/40 hover:text-danger">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {/* New rows entry */}
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.15em] text-muted">New Entries</p>
              <div className="overflow-x-auto no-scrollbar rounded-2xl border border-border/35 bg-surface-elevated/25">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr>
                      <th className="table-th text-left">Name</th>
                      <th className="table-th text-left">Width</th>
                      <th className="table-th text-left">Height</th>
                      <th className="table-th text-left">Length</th>
                      <th className="table-th w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {rows.map((row, idx) => (
                        <motion.tr
                          key={idx}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 12 }}
                          transition={{ duration: 0.18 }}
                          className="table-row-hover"
                        >
                          <td className="table-td">
                            <input type="text" value={row.name}
                              onChange={(e) => updateRow(idx, 'name', e.target.value)}
                              placeholder="e.g. Square 40×40"
                              className="w-48 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 text-xs text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/70" />
                          </td>
                          {['width', 'height', 'length'].map((field) => (
                            <td key={field} className="table-td">
                              <input type="number" step="any" min="0" value={row[field]}
                                onChange={(e) => updateRow(idx, field, e.target.value)}
                                placeholder="0"
                                className="w-28 px-3 py-2 rounded-md bg-[#05060b] border border-border/60 font-mono text-xs text-white placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/70" />
                            </td>
                          ))}
                          <td className="table-td text-center">
                            <button type="button" onClick={() => removeRow(idx)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 text-muted hover:border-danger/40 hover:text-danger">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed">
                <Package size={16} />
                {submitting ? 'Saving…' : `Save ${filledRows > 0 ? filledRows : ''} Product${filledRows !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
