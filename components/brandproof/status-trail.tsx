import * as React from "react";
import { Check, ShieldAlert, ArrowRight, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowState =
  | "draft"
  | "needs_attention"
  | "ready_for_review"
  | "approved"
  | "changes_requested"
  | "rejected";

export interface StatusTrailProps {
  currentState: WorkflowState;
  unresolvedCount?: number;
  className?: string;
}

/**
 * Editorial workflow status trail.
 * Clearly articulates that automated scans are advisory and a clean scan NEVER equals approval.
 */
export function StatusTrail({
  currentState,
  unresolvedCount = 0,
  className,
}: StatusTrailProps) {
  const steps = [
    {
      id: "scan",
      label: "Automated Scan",
      caption: unresolvedCount > 0 ? `${unresolvedCount} findings open` : "Scan complete",
      isComplete: currentState !== "draft",
      isActive: currentState === "draft" || currentState === "needs_attention",
      icon: ShieldAlert,
    },
    {
      id: "ready",
      label: "Ready for Review",
      caption: "Creator verified",
      isComplete: ["ready_for_review", "approved", "changes_requested", "rejected"].includes(currentState),
      isActive: currentState === "ready_for_review",
      icon: ArrowRight,
    },
    {
      id: "decision",
      label: "Human Decision",
      caption:
        currentState === "approved"
          ? "Approved by reviewer"
          : currentState === "changes_requested"
          ? "Changes requested"
          : currentState === "rejected"
          ? "Rejected with reason"
          : "Designated human reviewer required",
      isComplete: ["approved", "changes_requested", "rejected"].includes(currentState),
      isActive: ["approved", "changes_requested", "rejected"].includes(currentState),
      icon: UserCheck,
    },
  ];

  return (
    <div
      role="region"
      aria-label="Document governance review status"
      className={cn(
        "p-4 rounded-sm bg-paper-raised border border-rule font-sans",
        className
      )}
    >
      {/* Top Banner: Fundamental Law */}
      <div className="flex items-center justify-between pb-3 border-b border-rule mb-4">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
          Governance State:{" "}
          <strong className="text-ink font-semibold uppercase">
            {currentState.replace(/_/g, " ")}
          </strong>
        </span>
        <span className="text-[11px] font-sans text-ink-faint italic">
          Law: A clean automated scan never equals approval
        </span>
      </div>

      {/* Stepper Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          return (
            <div
              key={step.id}
              className={cn(
                "relative p-3 rounded-sm border transition-colors duration-150 flex items-start gap-3",
                step.isActive
                  ? "bg-paper border-ink"
                  : step.isComplete
                  ? "bg-paper-raised border-rule text-ink"
                  : "bg-paper-sunken/40 border-rule-soft text-ink-faint"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-sm shrink-0 flex items-center justify-center font-mono text-xs border",
                  step.isComplete
                    ? "bg-moss-tint text-moss border-moss/40"
                    : step.isActive
                    ? "bg-accent-soft text-accent border-accent/40 font-bold"
                    : "bg-paper-sunken text-ink-faint border-rule"
                )}
              >
                {step.isComplete ? (
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink leading-tight">
                  {step.label}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-soft truncate">
                  {step.caption}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
