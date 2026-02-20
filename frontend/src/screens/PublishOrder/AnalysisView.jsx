import React, { useState, useMemo } from 'react';
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

    // Second pass: check if remainders are consumed by later requirements
    blockMap.forEach((remainders, blockIdx) => {
      remainders.forEach((agg) => {
        let remainingCount = agg.count;
        // Check if any later requirement uses this remainder
        for (let laterIdx = blockIdx + 1; laterIdx < analysis.length; laterIdx++) {
          const laterBlock = analysis[laterIdx];
          const req = laterBlock.requirement;
          
          // Check if remainder matches the requirement dimensions exactly
          if (
            agg.remainder_length === req.length &&
            agg.width === req.width &&
            agg.height === req.height
          ) {
            // Check if this requirement was fulfilled (has results without unfulfilled)
            const hasUnfulfilled = (laterBlock.results || []).some((r) => r.unfulfilled != null);
            if (!hasUnfulfilled && (laterBlock.results || []).length > 0) {
              // Check if any result used a virtual pipe (which would be our remainder)
              const usedVirtual = (laterBlock.results || []).some(
                (r) => r.pipe_id && r.pipe_id.toString().startsWith('virtual_')
              );
              // Also check if it's an exact match (could be using our remainder)
              const hasExactMatch = (laterBlock.results || []).some(
                (r) => r.cut_type === 'exact' && 
                       r.source_length === agg.remainder_length &&
                       r.width === agg.width &&
                       r.height === agg.height
              );
              
              if (usedVirtual || hasExactMatch) {
                // This remainder was consumed by the later requirement
                if (agg.consumedBy == null) {
                  agg.consumedBy = laterIdx;
                }
                // Reduce count by how much was consumed (can't consume more than available)
                const consumedQty = Math.min(remainingCount, req.quantity_needed || 0);
                remainingCount = Math.max(0, remainingCount - consumedQty);
              }
            }
          }
        }
        // Update the count to reflect consumption
        agg.count = remainingCount;
      });
    });

    return blockMap;
  }, [analysis]);

  const makeEntryKey = (entry) => `${entry.blockIdx}-${entry.resultIdx}-${entry.pipe_id}`;

  // Flatten all individual remainder pieces for allDecided check (excluding consumed ones)
  const allRemainderEntries = useMemo(() => {
    return Array.from(aggregatedRemaindersByBlock.values()).flatMap((group) =>
      group
        .filter((agg) => agg.count > 0) // Only include remainders that weren't fully consumed
        .flatMap((agg) => agg.sourceEntries || []),
    );
  }, [aggregatedRemaindersByBlock]);

  const setDecisionForEntry = (entry, keep) => {
    const key = makeEntryKey(entry);
    setRemainderDecisions((prev) => ({
      ...prev,
      [key]: { keep },
    }));
  };

  const setDecisionForGroup = (agg, keep) => {
    const updates = {};
    (agg.sourceEntries || []).forEach((entry) => {
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
        (agg.sourceEntries || []).forEach((entry) => {
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
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="btn-ghost inline-flex items-center gap-2"
      >
        <ArrowLeft size={18} />
        Back to form
      </button>

      {analysis.map((block, blockIdx) => (
        <div key={blockIdx} className="card">
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
                {(block.results || []).map((r, i) => {
                  if (r.unfulfilled != null) {
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-danger font-sans text-sm"
                      >
                        <AlertTriangle size={20} />
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
                    const allKeep =
                      (agg.sourceEntries || []).length > 0 &&
                      (agg.sourceEntries || []).every(
                        (entry) => remainderDecisions[makeEntryKey(entry)]?.keep === true,
                      );
                    const allDiscard =
                      (agg.sourceEntries || []).length > 0 &&
                      (agg.sourceEntries || []).every(
                        (entry) => remainderDecisions[makeEntryKey(entry)]?.keep === false,
                      );
                    return (
                      <div
                        key={agg.id}
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
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setDecisionForGroup(agg, true)}
                            className={`px-4 py-2 rounded-lg text-sm font-sans font-semibold border transition-all duration-200 ${
                              allKeep
                                ? 'bg-success/20 border-success text-success shadow-glow-accent'
                                : 'border-border text-muted hover:border-success hover:text-success hover:bg-success/10'
                            }`}
                          >
                            Keep all ({agg.count})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDecisionForGroup(agg, false)}
                            className={`px-4 py-2 rounded-lg text-sm font-sans font-semibold border transition-all duration-200 ${
                              allDiscard
                                ? 'bg-danger/20 border-danger text-danger shadow-glow-accent'
                                : 'border-border text-muted hover:border-danger hover:text-danger hover:bg-danger/10'
                            }`}
                          >
                            Discard all ({agg.count})
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGroupExpanded(agg.id)}
                            className="text-xs font-sans text-muted hover:text-accent underline-offset-2 hover:underline"
                          >
                            {isExpanded ? 'Hide pieces' : 'Show all pieces'}
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="mt-3 w-full space-y-2">
                            {(agg.sourceEntries || []).map((entry, idxEntry) => {
                              const key = makeEntryKey(entry);
                              const decision = remainderDecisions[key];
                              const keepSelected = decision?.keep === true;
                              const discardSelected = decision?.keep === false;
                              return (
                                <div
                                  key={key}
                                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-surface-elevated/40 px-3 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-sans text-muted">Piece {idxEntry + 1}</span>
                                    <span className="font-mono text-sm text-white">
                                      {formatDimensions(entry.remainder_length, entry.width, entry.height)}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setDecisionForEntry(entry, true)}
                                      className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold border transition-all duration-200 ${
                                        keepSelected
                                          ? 'bg-success/20 border-success text-success'
                                          : 'border-border text-muted hover:border-success hover:text-success hover:bg-success/10'
                                      }`}
                                    >
                                      Keep
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDecisionForEntry(entry, false)}
                                      className={`px-3 py-1 rounded-lg text-xs font-sans font-semibold border transition-all duration-200 ${
                                        discardSelected
                                          ? 'bg-danger/20 border-danger text-danger'
                                          : 'border-border text-muted hover:border-danger hover:text-danger hover:bg-danger/10'
                                      }`}
                                    >
                                      Discard
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="flex justify-end pt-2">
        <button
          type="button"
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
        </button>
      </div>
    </div>
  );
}
