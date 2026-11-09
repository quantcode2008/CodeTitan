import * as React from "react";
import { LucideIcon, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Editorial empty state block with real copy and purposeful layout.
 */
export function EmptyState({
  icon: Icon = FileCheck,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center bg-paper-raised border border-rule border-dashed rounded-sm",
        className
      )}
    >
      <div className="w-10 h-10 rounded-sm bg-paper-sunken border border-rule flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-ink-soft stroke-[1.5]" aria-hidden="true" />
      </div>
      <h4 className="font-serif text-base font-medium text-ink">
        {title}
      </h4>
      <p className="mt-1 font-sans text-xs text-ink-soft max-w-sm leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
