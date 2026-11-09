import * as React from "react";
import { BookOpen, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SourceChipProps {
  sourceId?: string;
  sourceTitle?: string;
  sectionRef?: string;
  variant?: "verified" | "unverified";
  onClick?: () => void;
  className?: string;
}

/**
 * Footnote-style source citation chip.
 * Displays authoritative knowledge base references: [S-014 · Claims Policy v3].
 * Unverified variants show an explicit dashed border with a "No approved source" tag.
 */
export function SourceChip({
  sourceId = "S-000",
  sourceTitle = "Brand Knowledge Base",
  sectionRef,
  variant = "verified",
  onClick,
  className,
}: SourceChipProps) {
  const isVerified = variant === "verified";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        isVerified
          ? `View verified source: ${sourceId} ${sourceTitle}`
          : "Unverified claim: No approved source found"
      }
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-mono text-[11px] tracking-tight transition-colors duration-150 ease-out cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
        isVerified
          ? "bg-moss-tint text-moss border border-moss/35 hover:border-moss hover:bg-moss-tint/80"
          : "bg-oxblood-tint/50 text-oxblood border border-dashed border-oxblood/40 hover:border-oxblood",
        className
      )}
    >
      {isVerified ? (
        <BookOpen className="w-3 h-3 shrink-0 stroke-[1.5]" aria-hidden="true" />
      ) : (
        <AlertCircle className="w-3 h-3 shrink-0 stroke-[1.5]" aria-hidden="true" />
      )}
      <span className="font-semibold">[{sourceId}]</span>
      <span className="font-sans font-normal truncate max-w-[160px]">
        {isVerified ? sourceTitle : "no approved source"}
      </span>
      {sectionRef && isVerified && (
        <span className="text-ink-faint">· {sectionRef}</span>
      )}
    </button>
  );
}

