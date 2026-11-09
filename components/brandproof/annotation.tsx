"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SeverityLevel } from "./severity-mark";

export interface AnnotationProps {
  findingId: string;
  severity: SeverityLevel;
  isActive?: boolean;
  children: React.ReactNode;
  onClick?: (findingId: string) => void;
  className?: string;
}

/**
 * Editorial proofreader annotation.
 * Hand-proofed underline marks directly in draft text.
 * Keyboard accessible with distinct focus ring and ARIA markup.
 */
export function Annotation({
  findingId,
  severity,
  isActive = false,
  children,
  onClick,
  className,
}: AnnotationProps) {
  const underlineClass = {
    critical: "annotation-wavy-critical",
    major: "annotation-wavy-major",
    minor: "annotation-solid-minor",
    advisory: "annotation-dashed-advisory",
  }[severity];

  const activeTint = {
    critical: "bg-oxblood-tint/60 text-ink",
    major: "bg-ochre-tint/60 text-ink",
    minor: "bg-slate-tint/60 text-ink",
    advisory: "bg-paper-sunken/80 text-ink",
  }[severity];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(findingId);
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      data-finding-id={findingId}
      onClick={() => onClick?.(findingId)}
      onKeyDown={handleKeyDown}
      aria-label={`${severity} finding annotation: ${findingId}`}
      aria-pressed={isActive}
      className={cn(
        "cursor-pointer px-0.5 py-0.5 rounded-sm transition-colors duration-150 inline font-serif",
        underlineClass,
        isActive ? activeTint : "hover:bg-paper-sunken/50",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-1",
        className
      )}
    >
      {children}
    </span>
  );
}

