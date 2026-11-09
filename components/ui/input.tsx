import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Editorial single-line input.
 * Crisp hairline rule border, subtle paper-raised background.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-sans text-xs font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "w-full h-9 px-3 rounded-sm font-sans text-sm text-ink bg-paper-raised border border-rule transition-colors duration-150 ease-out",
            "placeholder:text-ink-faint",
            "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
            "disabled:opacity-50 disabled:bg-paper-sunken disabled:cursor-not-allowed",
            error && "border-oxblood focus-visible:border-oxblood focus-visible:ring-oxblood",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="font-sans text-[11px] text-ink-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="font-sans text-[11px] text-oxblood font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

