"use client";

import * as React from "react";
import { ReviewFinding } from "@/lib/review/types";
import { SeverityMark } from "@/components/brandproof/severity-mark";
import { SourceChip } from "@/components/brandproof/source-chip";
import { Check, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";

export interface MarginNotesProps {
  findings: ReviewFinding[];
  activeFindingId: string | null;
  onSelectFinding: (id: string) => void;
  filteredFindingIds?: Set<string>;
  onInspectSource?: (sourceKey: string, sourceId: string | null) => void;
}

export function MarginNotes({
  findings,
  activeFindingId,
  onSelectFinding,
  filteredFindingIds,
  onInspectSource,
}: MarginNotesProps) {
  // Filter visible findings
  const visibleFindings = React.useMemo(() => {
    return findings.filter((f) => {
      if (!f.id) return false;
      if (filteredFindingIds && !filteredFindingIds.has(f.id) && f.id !== activeFindingId) {
        return false;
      }
      return true;
    });
  }, [findings, filteredFindingIds, activeFindingId]);

  if (visibleFindings.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed border-rule rounded-sm bg-paper-raised/50 text-ink-soft">
        <p className="font-serif text-sm">No margin notes to display</p>
        <p className="font-sans text-[11px] mt-1 text-ink-soft">
          All findings match current filter criteria or have been addressed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 relative">
      <div className="flex items-center justify-between border-b border-rule pb-2 text-[11px] font-mono uppercase tracking-wider text-ink-soft select-none">
        <span>Margin Proof Notes ({visibleFindings.length})</span>
        <span className="text-[10px]">Use [J]/[K] to navigate</span>
      </div>

      <div className="space-y-2.5">
        {visibleFindings.map((finding, idx) => {
          const isSelected = finding.id === activeFindingId;
          const isResolved = finding.status !== "open";
          const isRuleLane = finding.lane === "rule";

          return (
            <div
              key={finding.id || idx}
              id={`margin-note-${finding.id}`}
              onClick={() => {
                if (finding.id) onSelectFinding(finding.id);
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (finding.id) onSelectFinding(finding.id);
                }
              }}
              className={`p-3.5 rounded-sm border transition-all duration-150 cursor-pointer relative group text-left ${
                isSelected
                  ? "bg-paper-raised border-accent shadow-sm ring-1 ring-accent"
                  : isResolved
                  ? "bg-paper/40 border-rule/70 opacity-60 hover:opacity-100"
                  : "bg-paper-raised border-rule hover:border-ink-soft/40"
              }`}
            >
              {/* Leader Line Indicator */}
              {isSelected && (
                <div
                  className="hidden xl:block absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-accent"
                  aria-hidden="true"
                />
              )}

              {/* Header: Severity Mark + Category + Lane Indicator */}
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <SeverityMark severity={finding.severity} size="sm" />
                  <span className="font-mono text-[10px] uppercase font-semibold text-ink">
                    {finding.category}
                  </span>
                </div>

                <div className="flex items-center gap-1 font-mono text-[10px] text-ink-soft">
                  {isResolved ? (
                    <span className="inline-flex items-center gap-0.5 text-moss font-semibold">
                      <Check className="w-3 h-3 stroke-[2]" />
                      {finding.status}
                    </span>
                  ) : isRuleLane ? (
                    <span title="Deterministic Rule Lane">Rule</span>
                  ) : (
                    <span title="AI-Assisted Tone & Meaning">AI</span>
                  )}
                </div>
              </div>

              {/* Exact Snippet Quote */}
              <div className="font-serif text-xs text-ink font-medium italic line-clamp-1 mb-1 border-l-2 border-rule pl-2">
                &ldquo;{finding.span_text}&rdquo;
              </div>

              {/* One-Line Summary Explanation */}
              <p className="font-sans text-[11px] text-ink-soft line-clamp-2 leading-relaxed">
                {finding.explanation}
              </p>

              {/* Footer: SourceChip / Unverified Mark */}
              <div className="mt-2.5 pt-2 border-t border-rule/60 flex items-center justify-between">
                {finding.source_key ? (
                  <SourceChip
                    sourceId={finding.source_key}
                    sourceTitle="Brand Policy"
                    onClick={() => {
                      if (onInspectSource) {
                        onInspectSource(finding.source_key!, finding.source_id);
                      }
                    }}
                  />
                ) : (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 border border-dashed border-rule text-ink-soft rounded-xs">
                    Unverified citation
                  </span>
                )}

                {finding.confidence && !isResolved && (
                  <span className="font-mono text-[10px] text-ink-soft">
                    {Math.round(finding.confidence * 100)}% conf
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

