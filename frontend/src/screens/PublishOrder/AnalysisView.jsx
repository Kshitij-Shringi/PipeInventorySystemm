import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PipeBar from '../../components/PipeBar';
import { executeOrder, getErrorMessage } from '../../api';
import { useToast } from '../../components/Toast';
import { ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatNumber, formatDimensions } from '../../utils/format';

export default function AnalysisView({ analysisResponse, recipient, onExecuted, onBack }) {
  const { showToast } = useToast();
  const [remainderDecisions, setRemainderDecisions] = useState({});
  const [executing, setExecuting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  const analysis = analysisResponse?.analysis ?? [];
  // Aggregate remainders per requirement: group by (remainder_length, width, height, from_supplier) within each block
  // So if 50 cuts produce identical remainders, we show ONE decision for all 50
  const aggregatedRemaindersByBlock = useMemo(() => {
    const blockMap = new Map();
    // First pass: collect all remainders
    analysis.forEach((block, blockIdx) => {
      const remainderMap = new Map();
      (block.results || []).forEach((r, i) => {
        if (r.pipe_id != null && r.remainder > 0) {
          const key = `${r.remainder}-${r.width}-${r.height}-${r.from_supplier}`;
          if (!remainderMap.has(key)) {
            remainderMap.set(key, {
              id: `${blockIdx}-${key}`,
              blockIdx,
              remainder_length: r.remainder,
              width: r.width,
              height: r.height,
              from_supplier: r.from_supplier,
              count: 0,
              sourceEntries: [], // Track original entries for execute
              consumedBy: null, // Track which later requirement consumed this remainder
            });
          }
          const agg = remainderMap.get(key);
          agg.count += 1;
          agg.sourceEntries.push({
            blockIdx,
            resultIdx: i,
            pipe_id: r.pipe_id,
            remainder_length: r.remainder,
            width: r.width,
            height: r.height,
            from_supplier: r.from_supplier,
          });
        }
      });
      blockMap.set(blockIdx, Array.from(remainderMap.values()));
    });

    // Second pass: check if remainders are consumed by later requirements.
    // A remainder from block X is consumed when a later block's results contain a
    // virtual pipe result (pipe_id starts with "virtual_") whose source_length,
    // width, height, and from_supplier match this remainder exactly.
    // This correctly handles BOTH exact-match usage AND further-cut usage of remainders.
    blockMap.forEach((remainders, blockIdx) => {
      remainders.forEach((agg) => {
        let remainingCount = agg.count;
        for (let laterIdx = blockIdx + 1; laterIdx < analysis.length; laterIdx++) {
          const laterBlock = analysis[laterIdx];
          // Count how many virtual remainder pipes in this later block consumed our remainder.
          // For exact-match results: quantity_used can be > 1 (multiple identical remainders taken at once).
          // For cut results: quantity_used is always 1 (one physical virtual pipe cut).
          const virtualConsumed = (laterBlock.results || [])
            .filter(
              (r) =>
                r.pipe_id &&
                r.pipe_id.toString().startsWith('virtual_') &&
                r.source_length === agg.remainder_length &&
                r.width === agg.width &&
                r.height === agg.height &&
                r.from_supplier === agg.from_supplier,
            )
            .reduce((sum, r) => sum + (r.quantity_used ?? 1), 0);
          if (virtualConsumed > 0) {
            if (agg.consumedBy == null) {
              agg.consumedBy = laterIdx;
            }
            remainingCount = Math.max(0, remainingCount - virtualConsumed);
          }
        }
        agg.count = remainingCount;
      });
    });

    return blockMap;
  }, [analysis]);

  // Only the first `agg.count` entries remain after accounting for consumption by later requirements.
  const getActiveEntriesForAgg = (agg) =>
    (agg.sourceEntries || []).slice(0, Math.max(0, agg.count ?? 0));

  const makeEntryKey = (entry) => `${entry.blockIdx}-${entry.resultIdx}-${entry.pipe_id}`;

  // Flatten all individual remainder pieces for allDecided check (excluding consumed ones)
  const allRemainderEntries = useMemo(() => {
    return Array.from(aggregatedRemaindersByBlock.values()).flatMap((group) =>
      group
        .filter((agg) => agg.count > 0) // Only include remainders that weren't fully consumed
        .flatMap((agg) => getActiveEntriesForAgg(agg)),
    );
  }, [aggregatedRemaindersByBlock]);

  // By default, treat all remainders as \"keep\" so the user only has
  // to interact when they explicitly want to discard something.
  useEffect(() => {
    setRemainderDecisions((prev) => {
      if (Object.keys(prev || {}).length > 0) return prev;
      const initial = {};
      Array.from(aggregatedRemaindersByBlock.values()).forEach((group) => {
        group
          .filter((agg) => agg.count > 0)
          .forEach((agg) => {
            getActiveEntriesForAgg(agg).forEach((entry) => {
              const key = makeEntryKey(entry);
              initial[key] = { keep: true };
            });
          });
      });
      return initial;
    });
  }, [aggregatedRemaindersByBlock]);

  // For the visual "How it will be made" section, group identical cut patterns
  // so we don't render one row per physical pipe when they are all the same.
  const groupedResultsByBlock = useMemo(() => {
    return analysis.map((block) => {
      const groupsMap = new Map();
      const unfulfilled = [];

      (block.results || []).forEach((r) => {
        if (r.unfulfilled != null) {
          unfulfilled.push(r);
          return;
        }

        const key = JSON.stringify({
          source_length: r.source_length,
          width: r.width,
          height: r.height,
          from_supplier: r.from_supplier || '',
          cut_type: r.cut_type || 'cut',
          cut_length: r.cut_length || 0,
          remainder: r.remainder || 0,
        });

        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            template: r,
            totalCuts: 0,
            totalExactQty: 0,
            pipeCount: 0,
          });
        }
        const group = groupsMap.get(key);

        if (r.cut_type === 'exact') {
          const qty = r.quantity_used ?? 1;
          group.totalExactQty += qty;
        } else {
          const cuts = r.cuts_from_this_pipe ?? 1;
          group.totalCuts += cuts;
          group.pipeCount += 1;
        }
      });

      return {
        unfulfilled,
        groups: Array.from(groupsMap.values()),
      };
    });
  }, [analysis]);

  const setDecisionForEntry = (entry, keep) => {
    const key = makeEntryKey(entry);
    setRemainderDecisions((prev) => ({
      ...prev,
      [key]: { keep },
    }));
  };

  const setDecisionForGroup = (agg, keep) => {
    const updates = {};
    getActiveEntriesForAgg(agg).forEach((entry) => {
      const key = makeEntryKey(entry);
      updates[key] = { keep };
    });
    setRemainderDecisions((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  const toggleGroupExpanded = (id) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const hasUnfulfilled = useMemo(
    () => analysis.some((block) => (block.results || []).some((r) => r.unfulfilled != null)),
    [analysis]
  );
  const allDecided =
    !hasUnfulfilled &&
    (allRemainderEntries.length === 0 ||
      allRemainderEntries.every((entry) => remainderDecisions[makeEntryKey(entry)] != null));
  const fulfillments = useMemo(() => {
    const map = {};
    analysis.forEach((block) => {
      (block.results || []).forEach((r) => {
        if (r.pipe_id != null && r.quantity_used != null) {
          map[r.pipe_id] = (map[r.pipe_id] || 0) + r.quantity_used;
        }
      });
    });
    return Object.entries(map).map(([pipe_id, quantity_to_deduct]) => ({ pipe_id, quantity_to_deduct }));
  }, [analysis]);

  // Build remainder_decisions payload from individual decisions
  const remainder_decisions = useMemo(() => {
    const decisions = [];
    Array.from(aggregatedRemaindersByBlock.values()).forEach((group) => {
      group.forEach((agg) => {
        getActiveEntriesForAgg(agg).forEach((entry) => {
          const key = makeEntryKey(entry);
          const decision = remainderDecisions[key];
          if (!decision) return;
          decisions.push({
            pipe_id: entry.pipe_id,
            remainder_length: entry.remainder_length,
            width: entry.width,
            height: entry.height,
            from_supplier: entry.from_supplier,
            keep: decision.keep,
          });
        });
      });
    });
    return decisions;
  }, [remainderDecisions, aggregatedRemaindersByBlock]);

  const handleExecute = async () => {
    if (!allDecided) return;
    setExecuting(true);
    try {
      const result = await executeOrder({
        recipient,
        fulfillments,
        remainder_decisions,
        analysis: analysis, // Include analysis data for visualization in order history
      });
      onExecuted(result);
    } catch (e) {
      showToast(getErrorMessage(e, 'Execute failed'), 'error');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="p-8 max-w-5xl mx-auto space-y-6"
    >
      <motion.button
        type="button"
        whileHover={{ x: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
        className="btn-ghost inline-flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        Back to form
      </motion.button>

      <AnimatePresence>
        {analysis.map((block, blockIdx) => (
          <motion.div
            key={blockIdx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, delay: blockIdx * 0.1 }}
            className="card"
          >
          <div className="card-header">
            <h3 className="font-sans font-bold text-white">Requirement {blockIdx + 1}</h3>
          </div>
          <div className="card-body space-y-6">
            <div>
              <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-2">What was required</p>
              <p className="font-mono text-xl font-semibold text-accent">
                {formatDimensions(block.requirement.length, block.requirement.width, block.requirement.height)}
                <span className="text-gray-300 font-sans font-normal ml-2">— Qty: {formatNumber(block.requirement.quantity_needed)}</span>
              </p>
            </div>

            <div>
              <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-3">How it will be made</p>
              <div className="space-y-4">
                {/* Show any unfulfilled warnings first */}
                {(groupedResultsByBlock[blockIdx]?.unfulfilled || []).map((r, i) => (
                  <div
                    key={`unfulfilled-${i}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger font-sans text-sm"
                  >
                    <AlertTriangle size={20} />
                    Could not fulfil {r.unfulfilled} pipes — insufficient stock
                  </div>
                ))}

                {/* Then show aggregated cut patterns */}
                {(groupedResultsByBlock[blockIdx]?.groups || []).map((g, i) => {
                  const r = g.template;
                  const isExact = r.cut_type === 'exact';
                  return (
                    <div key={`group-${i}`}>
                      <PipeBar
                        sourceLength={r.source_length}
                        usedLength={
                          isExact
                            ? r.source_length
                            : r.used_length ?? r.source_length - (r.remainder ?? 0)
                        }
                        remainder={r.remainder ?? 0}
                        fromSupplier={r.from_supplier}
                        cutType={r.cut_type}
                        cutsFromThisPipe={isExact ? undefined : r.cuts_from_this_pipe ?? g.totalCuts}
                        cutLength={r.cut_length}
                        quantityUsed={isExact ? g.totalExactQty || r.quantity_used : g.pipeCount || 1}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-xs font-sans font-semibold text-muted uppercase tracking-wider mb-3">What to do with the rest</p>
              {(aggregatedRemaindersByBlock.get(blockIdx) || []).length === 0 ? (
                <div className="flex items-center gap-2 text-success font-sans text-sm">
                  <CheckCircle size={18} />
                  No waste — exact match or no cut needed
                </div>
              ) : (
                <div className="space-y-3">
                  {(aggregatedRemaindersByBlock.get(blockIdx) || [])
                    .filter((agg) => agg.count > 0) // Only show remainders that weren't fully consumed
                    .map((agg) => {
                    const isExpanded = !!expandedGroups[agg.id];
                    const activeEntries = getActiveEntriesForAgg(agg);
                    const allKeep =
                      activeEntries.length > 0 &&
                      activeEntries.every(
                        (entry) => remainderDecisions[makeEntryKey(entry)]?.keep === true,
                      );
                    const allDiscard =
                      activeEntries.length > 0 &&
                      activeEntries.every(
                        (entry) => remainderDecisions[makeEntryKey(entry)]?.keep === false,
                      );
                    return (
                      <motion.div
                        key={agg.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        whileHover={{ scale: 1.01 }}
                        className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border bg-surface-elevated/30"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <span className="font-mono text-sm font-medium text-white">
                            {formatDimensions(agg.remainder_length, agg.width, agg.height)}
                          </span>
                          <span className="ml-3 font-sans text-sm text-muted">
                            ({formatNumber(agg.count)} {agg.count === 1 ? 'remainder' : 'remainders'})
                          </span>
                          {agg.consumedBy != null && (
                            <span className="ml-2 text-xs font-sans text-success">
                              (Used by Requirement {agg.consumedBy + 1})
                            </span>
                          )}
                          <p className="text-xs text-muted mt-1">{agg.from_supplier}</p>
                        </div>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="flex gap-2"
                        >
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setDecisionForGroup(agg, true)}
                            className={`px-4 py-2 rounded-lg text-sm font-sans font-semibold border transition-all duration-300 ${
                              allKeep
                                ? 'bg-success/20 border-success text-success shadow-glow-accent'
                                : 'border-border text-muted hover:border-success hover:text-success hover:bg-success/10'
                            }`}
                          >
                            Keep all ({agg.count})
                          </motion.button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setDecisionForGroup(agg, false)}
                            className={`px-4 py-2 rounded-lg text-sm font-sans font-semibold border transition-all duration-300 ${
                              allDiscard
                                ? 'bg-danger/20 border-danger text-danger shadow-glow-accent'
                                : 'border-border text-muted hover:border-danger hover:text-danger hover:bg-danger/10'
                            }`}
                          >
                            Discard all ({agg.count})
                          </motion.button>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleGroupExpanded(agg.id)}
                            className="text-xs font-sans text-muted hover:text-accent underline-offset-2 hover:underline transition-colors"
                          >
                            {isExpanded ? 'Hide pieces' : 'Show all pieces'}
                          </motion.button>
                        </motion.div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-3 w-full space-y-2 overflow-hidden"
                            >
                              {getActiveEntriesForAgg(agg).map((entry, idxEntry) => {
                              const key = makeEntryKey(entry);
                              const decision = remainderDecisions[key];
                              const keepSelected = decision?.keep === true;
                              const discardSelected = decision?.keep === false;
                              return (
                                <motion.div
                                  key={key}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idxEntry * 0.05 }}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-elevated/40 px-3 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-sans text-muted">Piece {idxEntry + 1}</span>
                                    <span className="font-mono text-sm text-white">
                                      {formatDimensions(entry.remainder_length, entry.width, entry.height)}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setDecisionForEntry(entry, true)}
                                      className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold border transition-all duration-300 ${
                                        keepSelected
                                          ? 'bg-success/20 border-success text-success'
                                          : 'border-border text-muted hover:border-success hover:text-success hover:bg-success/10'
                                      }`}
                                    >
                                      Keep
                                    </motion.button>
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.05 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setDecisionForEntry(entry, false)}
                                      className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold border transition-all duration-300 ${
                                        discardSelected
                                          ? 'bg-danger/20 border-danger text-danger'
                                          : 'border-border text-muted hover:border-danger hover:text-danger hover:bg-danger/10'
                                      }`}
                                    >
                                      Discard
                                    </motion.button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex justify-end pt-2"
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExecute}
          disabled={!allDecided || executing || hasUnfulfilled}
          className="btn-success inline-flex items-center gap-2"
        >
          {executing ? (
            <>Processing…</>
          ) : (
            <>
              <CheckCircle size={18} />
              Confirm & execute order
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
