import * as React from "react";
import { cn } from "@/lib/utils";

export type SeverityLevel = "critical" | "major" | "minor" | "advisory";

export interface SeverityMarkProps {
  severity: SeverityLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Editorial proofreader severity mark.
 * Non-negotiable rule: NEVER color alone. Always pairs a distinct geometric glyph
 * with an explicit text label and high-contrast ink.
 */
export function SeverityMark({
  severity,
  showLabel = true,
  size = "md",
  className,
}: SeverityMarkProps) {
  const config = {
    critical: {
      label: "Critical",
      textColor: "text-oxblood",
      bgColor: "bg-oxblood-tint",
      borderColor: "border-oxblood/30",
      symbol: "◆", // Filled diamond
      ariaLabel: "Critical severity finding",
    },
    major: {
      label: "Major",
      textColor: "text-[#8C5E0D] dark:text-[#E5AA42]", // AA-compliant ochre text
      bgColor: "bg-ochre-tint",
      borderColor: "border-ochre/30",
      symbol: "▲", // Triangle
      ariaLabel: "Major severity warning",
    },
    minor: {
      label: "Minor",
      textColor: "text-slate dark:text-[#8EAEC9]",
      bgColor: "bg-slate-tint",
      borderColor: "border-slate/30",
      symbol: "■", // Square
      ariaLabel: "Minor severity issue",
    },
    advisory: {
      label: "Advisory",
      textColor: "text-ink-soft dark:text-ink-soft",
      bgColor: "bg-paper-sunken",
      borderColor: "border-rule",
      symbol: "●", // Circle
      ariaLabel: "Advisory note",
    },
  }[severity];

  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 font-sans font-medium uppercase tracking-wider rounded-sm border select-none",
        config.bgColor,
        config.borderColor,
        config.textColor,
        {
          "px-1.5 py-0.5 text-[10px] leading-none": size === "sm",
          "px-2 py-1 text-xs leading-none": size === "md",
        },
        className
      )}
    >
      <span className="font-mono text-[9px] scale-90" aria-hidden="true">
        {config.symbol}
      </span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
