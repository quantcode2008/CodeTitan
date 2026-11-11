"use client";

import * as React from "react";
import { ReviewFinding } from "@/lib/review/types";
import { Check, AlertCircle } from "lucide-react";

export interface AnnotatedDraftProps {
  draftText: string;
  findings: ReviewFinding[];
  activeFindingId: string | null;
  onSelectFinding: (findingId: string) => void;
  filteredFindingIds?: Set<string>;
}

interface TextSegment {
  text: string;
  isAnnotation: boolean;
  finding?: ReviewFinding;
  start: number;
  end: number;
}

export function AnnotatedDraft({
  draftText,
  findings,
  activeFindingId,
  onSelectFinding,
  filteredFindingIds,
}: AnnotatedDraftProps) {
  // Sort findings by start offset
  const sortedFindings = React.useMemo(() => {
    return [...findings].sort((a, b) => a.span_start - b.span_start);
  }, [findings]);

  // Build non-overlapping text segments for rendering
  const segments = React.useMemo(() => {
    if (!draftText) return [];
    if (sortedFindings.length === 0) {
      return [{ text: draftText, isAnnotation: false, start: 0, end: draftText.length }];
    }

    const result: TextSegment[] = [];
    let cursor = 0;

    for (const f of sortedFindings) {
      // If finding is filtered out, treat as plain text unless it's the active one
      if (filteredFindingIds && !filteredFindingIds.has(f.id || "") && f.id !== activeFindingId) {
        continue;
      }

      const fStart = Math.max(cursor, f.span_start);
      const fEnd = Math.min(draftText.length, f.span_end);

      if (fStart > cursor) {
        result.push({
          text: draftText.slice(cursor, fStart),
          isAnnotation: false,
          start: cursor,
          end: fStart,
        });
      }

      if (fEnd > fStart) {
        result.push({
          text: draftText.slice(fStart, fEnd),
          isAnnotation: true,
          finding: f,
          start: fStart,
          end: fEnd,
        });
        cursor = fEnd;
      }
    }

    if (cursor < draftText.length) {
      result.push({
        text: draftText.slice(cursor),
        isAnnotation: false,
        start: cursor,
        end: draftText.length,
      });
    }

    return result;
  }, [draftText, sortedFindings, filteredFindingIds, activeFindingId]);

  return (
    <div className="space-y-4">
      {/* Legend Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-paper-raised border border-rule rounded-sm font-mono text-[11px] text-ink-soft select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-b-2 border-solid border-oxblood inline-block" />
            <span>Deterministic Rule Check</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-b-2 border-dotted border-slate inline-block" />
            <span>AI-Assisted Tone / Claim</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-b-2 border-solid border-moss inline-block" />
            <span>Resolved</span>
          </div>
        </div>

        <div className="text-[10px] text-ink-soft">
          Click passage to inspect finding
        </div>
      </div>

      {/* Reading Width Document Container (~68ch) */}
      <div className="bg-paper-raised border border-rule rounded-sm p-6 md:p-10 shadow-hairline">
        <div
          id="proofreader-draft-content"
          className="font-serif text-base md:text-lg text-ink leading-relaxed max-w-[68ch] mx-auto select-text tracking-normal"
        >
          {segments.map((segment, idx) => {
            if (!segment.isAnnotation || !segment.finding) {
              return (
                <span key={`plain-${idx}`} className="whitespace-pre-wrap">
                  {segment.text}
                </span>
              );
            }

            const finding = segment.finding;
            const isSelected = finding.id === activeFindingId;
            const isResolved = finding.status !== "open";
            const isRuleLane = finding.lane === "rule";

            // Determine underline style based on severity & lane
            let underlineClass = "";
            let bgClass = "";

            if (isResolved) {
              underlineClass = "border-b border-solid border-moss text-ink/80";
              bgClass = isSelected ? "bg-moss/15 ring-1 ring-moss" : "bg-moss/5";
            } else if (finding.severity === "critical") {
              underlineClass = isRuleLane
                ? "border-b-2 border-solid border-oxblood"
                : "border-b-2 border-dotted border-oxblood";
              bgClass = isSelected ? "bg-oxblood/20 ring-1 ring-oxblood" : "bg-oxblood/10 hover:bg-oxblood/15";
            } else if (finding.severity === "major") {
              underlineClass = isRuleLane
                ? "border-b-2 border-solid border-ochre"
                : "border-b-2 border-dotted border-ochre";
              bgClass = isSelected ? "bg-ochre/20 ring-1 ring-ochre" : "bg-ochre/10 hover:bg-ochre/15";
            } else {
              underlineClass = isRuleLane
                ? "border-b-2 border-solid border-slate"
                : "border-b-2 border-dotted border-slate";
              bgClass = isSelected ? "bg-slate/20 ring-1 ring-slate" : "bg-slate/10 hover:bg-slate/15";
            }

            return (
              <span
                key={`ann-${finding.id}-${idx}`}
                id={`annotation-${finding.id}`}
                onClick={() => {
                  if (finding.id) onSelectFinding(finding.id);
                }}
                tabIndex={0}
                role="button"
                aria-label={`Finding: ${finding.category} ${finding.severity} - ${finding.explanation}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (finding.id) onSelectFinding(finding.id);
                  }
                }}
                className={`cursor-pointer transition-all duration-150 rounded-xs px-0.5 mx-0.5 inline ${underlineClass} ${bgClass}`}
              >
                {segment.text}
                {isResolved && (
                  <span
                    className="inline-flex items-center ml-1 text-moss align-middle"
                    title={`Resolved (${finding.status})`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

