import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Editorial multi-line text input for reasoning, justification, and copy edits.
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 3, ...props }, ref) => {
    const generatedId = React.useId();
    const textareaId = id || generatedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="block font-sans text-xs font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            "w-full p-2.5 rounded-sm font-sans text-sm text-ink bg-paper-raised border border-rule transition-colors duration-150 ease-out resize-y",
            "placeholder:text-ink-faint",
            "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
            "disabled:opacity-50 disabled:bg-paper-sunken disabled:cursor-not-allowed",
            error && "border-oxblood focus-visible:border-oxblood focus-visible:ring-oxblood",
            className
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
          }
          {...props}
        />
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="font-sans text-[11px] text-ink-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="font-sans text-[11px] text-oxblood font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

