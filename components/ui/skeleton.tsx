import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "rectangular" | "circle";
}

/**
 * Editorial subtle paper shimmer loader.
 * No neon flashing; uses calm paper tones.
 */
export function Skeleton({
  className,
  variant = "rectangular",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton-shimmer border border-rule-soft",
        {
          "rounded-sm": variant === "rectangular",
          "h-4 w-full rounded-sm": variant === "text",
          "rounded-full": variant === "circle",
        },
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

