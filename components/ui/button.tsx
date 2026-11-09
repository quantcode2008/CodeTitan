import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "quiet" | "destructive";
  size?: "sm" | "md" | "lg";
}

/**
 * Editorial proofreader button.
 * Capped at 4px radius, hairline rules, zero heavy dropshadows.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-sans text-sm font-medium tracking-tight transition-colors duration-150 ease-out select-none cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-1 focus-visible:ring-offset-paper",
          "disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed",
          "rounded-sm",
          {
            // Primary: Deep ink-blue, high-contrast crisp text
            "bg-accent text-paper hover:bg-accent/90 active:bg-accent/95 shadow-hairline":
              variant === "primary",
            // Secondary: Raised paper sheet, crisp hairline rule
            "bg-paper-raised text-ink border border-rule hover:border-ink-soft/40 hover:bg-paper active:bg-paper-sunken":
              variant === "secondary",
            // Quiet: Ghost style with subtle hover wash
            "bg-transparent text-ink-soft hover:text-ink hover:bg-paper-sunken/60 active:bg-paper-sunken":
              variant === "quiet",
            // Destructive: Oxblood editorial warning
            "bg-oxblood text-paper hover:bg-oxblood/90 active:bg-oxblood/95 shadow-hairline":
              variant === "destructive",
          },
          {
            "h-7 px-2.5 text-xs": size === "sm",
            "h-9 px-3.5 text-sm": size === "md",
            "h-10 px-4 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
