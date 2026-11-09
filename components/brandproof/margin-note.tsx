"use client";

import * as React from "react";
import { Check, Edit3, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeverityMark, SeverityLevel } from "./severity-mark";
import { SourceChip } from "./source-chip";
import { Button } from "@/components/ui/button";

export interface FindingData {
  id: string;
  severity: SeverityLevel;
  lane: "deterministic" | "llm";
  title: string;
  explanation: string;
  originalText: string;
  suggestedText: string;
  sourceId?: string;
  sourceTitle?: string;
  evidenceStatus: "verified" | "unverified";
  status: "open" | "accepted" | "edited" | "dismissed" | "explained";
}

export interface MarginNoteProps {
  finding: FindingData;
  isActive?: boolean;
  onSelect?: (id: string) => void;
  onAccept?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDismiss?: (id: string) => void;
  className?: string;
}

/**
 * Editorial margin note.
 * Anchored in the document margin gutter, directly linked to in-text annotations.
 * Supports purpose-preserving suggestion adoption and dismissals with mandatory reasons.
 */
export function MarginNote({
  finding,
  isActive = false,
  onSelect,
  onAccept,
  onEdit,
  onDismiss,
  className,
}: MarginNoteProps) {
  return (
    <div
      role="region"
      aria-label={`Margin note for finding ${finding.id}`}
      data-finding-id={finding.id}
      onClick={() => onSelect?.(finding.id)}
      className={cn(
        "relative group p-4 rounded-sm border transition-all duration-200 ease-out cursor-pointer",
        "bg-paper-raised text-ink",
        isActive
          ? "border-ink shadow-hairline ring-1 ring-ink/20"
          : "border-rule hover:border-ink-soft/40 hover:bg-paper",
        className
      )}
    >
      {/* Decorative leader anchor dot */}
      <div
        className={cn(
          "absolute -left-2 top-4 w-2 h-[1px] transition-colors",
          isActive ? "bg-ink" : "bg-rule group-hover:bg-ink-soft"
        )}
        aria-hidden="true"
      />

      {/* Header: Severity + Lane Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <SeverityMark severity={finding.severity} size="sm" />
        <span className="font-mono text-[10px] uppercase text-ink-faint tracking-wider">
          {finding.lane} lane
        </span>
      </div>

      {/* Finding title */}
      <h4 className="font-serif text-sm font-medium text-ink leading-snug">
        {finding.title}
      </h4>

      {/* Explanation */}
      <p className="mt-1 font-sans text-xs text-ink-soft leading-relaxed">
        {finding.explanation}
      </p>

      {/* Source citation */}
      <div className="mt-2.5">
        <SourceChip
          sourceId={finding.sourceId || "N/A"}
          sourceTitle={finding.sourceTitle || "Unverified Knowledge"}
          variant={finding.evidenceStatus}
        />
      </div>

      {/* Suggestion Preview */}
      {finding.suggestedText && (
        <div className="mt-3 p-2.5 rounded-sm bg-paper-sunken/60 border border-rule text-xs font-sans">
          <div className="flex items-center gap-1.5 text-ink-faint text-[10px] font-mono uppercase tracking-wider mb-1">
            <span>Suggestion</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </div>
          <p className="font-serif italic text-ink text-xs leading-normal">
            &ldquo;{finding.suggestedText}&rdquo;
          </p>
        </div>
      )}

      {/* Action controls */}
      {finding.status === "open" && (
        <div className="mt-3 pt-2.5 border-t border-rule-soft flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onAccept?.(finding.id);
              }}
              title="Accept purpose-preserving suggestion"
            >
              <Check className="w-3 h-3 mr-1 stroke-[2]" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="quiet"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(finding.id);
              }}
              title="Edit draft copy manually"
            >
              <Edit3 className="w-3 h-3 mr-1 stroke-[1.5]" />
              Edit
            </Button>
          </div>

          <Button
            size="sm"
            variant="quiet"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss?.(finding.id);
            }}
            title="Dismiss with mandatory recorded reason"
            className="text-ink-faint hover:text-oxblood"
          >
            <X className="w-3 h-3 stroke-[1.5]" />
          </Button>
        </div>
      )}

      {/* Resolved status indicator if not open */}
      {finding.status !== "open" && (
        <div className="mt-3 pt-2 border-t border-rule-soft flex items-center justify-between">
          <span className="font-mono text-[10px] text-ink-faint uppercase">
            Status: {finding.status}
          </span>
          <span className="font-sans text-[11px] text-moss font-medium">
            Resolved
          </span>
        </div>
      )}
    </div>
  );
}
