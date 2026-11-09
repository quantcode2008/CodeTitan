import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
}

/**
 * Editorial select element with custom chevron icon and crisp 1px rule.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={selectId}
            className="block font-sans text-xs font-medium text-ink-soft"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "w-full h-9 pl-3 pr-8 rounded-sm font-sans text-sm text-ink bg-paper-raised border border-rule transition-colors duration-150 ease-out appearance-none cursor-pointer",
              "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
              "disabled:opacity-50 disabled:bg-paper-sunken disabled:cursor-not-allowed",
              error && "border-oxblood focus-visible:border-oxblood focus-visible:ring-oxblood",
              className
            )}
            aria-invalid={Boolean(error)}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-soft pointer-events-none stroke-[1.5]"
            aria-hidden="true"
          />
        </div>
        {hint && !error && (
          <p id={`${selectId}-hint`} className="font-sans text-[11px] text-ink-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="font-sans text-[11px] text-oxblood font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

