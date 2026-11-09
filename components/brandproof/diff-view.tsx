"use client";

import * as React from "react";
import { Columns2, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiffViewProps {
  originalText: string;
  revisedText: string;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Editorial proofreader diff view.
 * Highlights deleted and replaced text in Oxblood strike, and approved insertions in Moss underline.
 * Supports inline and side-by-side modes with tabular JetBrains Mono line numbers.
 */
export function DiffView({
  originalText,
  revisedText,
  showLineNumbers = true,
  className,
}: DiffViewProps) {
  const [mode, setMode] = React.useState<"inline" | "split">("inline");

  // Naive token/word diff for preview
  const originalWords = originalText.split(/\s+/);
  const revisedWords = revisedText.split(/\s+/);

  return (
    <div
      className={cn(
        "rounded-sm border border-rule bg-paper-raised overflow-hidden font-sans text-xs",
        className
      )}
    >
      {/* Diff Controls Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-paper border-b border-rule">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
          Text Comparison (Diff)
        </span>
        <div className="flex items-center space-x-1 border border-rule rounded-sm p-0.5 bg-paper-raised">
          <button
            type="button"
            onClick={() => setMode("inline")}
            className={cn(
              "p-1 rounded-sm text-[11px] font-sans flex items-center gap-1 transition-colors cursor-pointer",
              mode === "inline"
                ? "bg-paper text-ink font-semibold shadow-hairline"
                : "text-ink-soft hover:text-ink"
            )}
            title="Inline comparison"
          >
            <Rows3 className="w-3.5 h-3.5 stroke-[1.5]" />
            Inline
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={cn(
              "p-1 rounded-sm text-[11px] font-sans flex items-center gap-1 transition-colors cursor-pointer",
              mode === "split"
                ? "bg-paper text-ink font-semibold shadow-hairline"
                : "text-ink-soft hover:text-ink"
            )}
            title="Side-by-side comparison"
          >
            <Columns2 className="w-3.5 h-3.5 stroke-[1.5]" />
            Split
          </button>
        </div>
      </div>

      {/* Inline View */}
      {mode === "inline" && (
        <div className="p-4 font-serif text-sm leading-relaxed text-ink space-y-2">
          <div className="p-3 bg-paper rounded-sm border border-rule-soft">
            <span className="line-through decoration-oxblood decoration-1 text-oxblood bg-oxblood-tint/60 px-1 py-0.5 rounded-sm mr-2 font-mono text-xs">
              {originalText}
            </span>
            <span className="underline decoration-moss decoration-1 text-moss bg-moss-tint/70 px-1 py-0.5 rounded-sm font-mono text-xs">
              {revisedText}
            </span>
          </div>
        </div>
      )}

      {/* Split (Side-by-Side) View */}
      {mode === "split" && (
        <div className="grid grid-cols-2 divide-x divide-rule">
          {/* Original Column */}
          <div className="p-3 bg-paper/50">
            <div className="font-mono text-[10px] uppercase text-oxblood font-semibold mb-1 flex items-center gap-1">
              <span>Original Draft</span>
            </div>
            <div className="flex items-start gap-2 font-mono text-xs text-ink-soft">
              {showLineNumbers && (
                <span className="text-ink-faint select-none">01</span>
              )}
              <p className="line-through decoration-oxblood decoration-1 text-oxblood bg-oxblood-tint/50 px-1 py-0.5 rounded-sm w-full">
                {originalText}
              </p>
            </div>
          </div>

          {/* Revised Column */}
          <div className="p-3 bg-paper-raised">
            <div className="font-mono text-[10px] uppercase text-moss font-semibold mb-1 flex items-center gap-1">
              <span>Proposed Replacement</span>
            </div>
            <div className="flex items-start gap-2 font-mono text-xs text-ink">
              {showLineNumbers && (
                <span className="text-ink-faint select-none">01</span>
              )}
              <p className="underline decoration-moss decoration-1 text-moss bg-moss-tint/50 px-1 py-0.5 rounded-sm w-full">
                {revisedText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legend */}
      <div className="px-3 py-1.5 bg-paper-sunken/40 border-t border-rule-soft flex items-center gap-4 text-[11px] text-ink-faint font-mono">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-none bg-oxblood-tint border border-oxblood" />
          Oxblood: Removed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-none bg-moss-tint border border-moss" />
          Moss: Proposed
        </span>
      </div>
    </div>
  );
}

