"use client";

import * as React from "react";
import { ReviewFinding } from "@/lib/review/types";
import { SeverityMark } from "@/components/brandproof/severity-mark";
import { SourceChip } from "@/components/brandproof/source-chip";
import { DiffView } from "@/components/brandproof/diff-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Check,
  Edit3,
  XCircle,
  HelpCircle,
  RefreshCw,
  FileText,
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

export interface FindingDetailProps {
  finding: ReviewFinding;
  source?: any;
  onAccept: (findingId: string, suggestion: string) => Promise<void> | void;
  onEdit: (findingId: string, customSuggestion: string) => Promise<void> | void;
  onDismiss: (findingId: string, reason: string) => Promise<void> | void;
  onExplain: (findingId: string, rationale: string) => Promise<void> | void;
  onInspectSource?: (sourceKey: string, sourceId: string | null) => void;
  onOpenSourceModal?: (source: any) => void;
  onClose?: () => void;
}

export function FindingDetail({
  finding,
  source,
  onAccept,
  onEdit,
  onDismiss,
  onExplain,
  onInspectSource,
  onOpenSourceModal,
  onClose,
}: FindingDetailProps) {
  const isResolved = finding.status !== "open";

  // Action Modes
  const [isEditingInline, setIsEditingInline] = React.useState(false);
  const [editedText, setEditedText] = React.useState(finding.suggestion || finding.span_text);
  const [isDismissing, setIsDismissing] = React.useState(false);
  const [dismissReason, setDismissReason] = React.useState("");
  const [isExplaining, setIsExplaining] = React.useState(false);
  const [explainRationale, setExplainRationale] = React.useState("");

  // Suggestion Regeneration
  const [currentSuggestion, setCurrentSuggestion] = React.useState(finding.suggestion);
  const [isRegenerating, setIsRegenerating] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Confidence Caveat Label
  const caveatLabel = React.useMemo(() => {
    if (finding.lane === "rule") {
      return "Deterministic rule · exact match";
    }
    const conf = typeof finding.confidence === "number" ? finding.confidence : 0.8;
    if (conf >= 0.85) return `AI-assisted · high confidence (${conf.toFixed(2)})`;
    if (conf >= 0.55) return `AI-assisted · moderate confidence (${conf.toFixed(2)})`;
    return `AI-assisted · low confidence (${conf.toFixed(2)})`;
  }, [finding.lane, finding.confidence]);

  // Handle Regenerate Suggestion
  async function handleRegenerate() {
    if (!finding.id) return;
    setIsRegenerating(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/findings/${finding.id}/suggest`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to regenerate suggestion");
      }
      setCurrentSuggestion(data.suggestion);
      setEditedText(data.suggestion);
    } catch (err: any) {
      setActionError(err.message || "Failed to regenerate suggestion.");
    } finally {
      setIsRegenerating(false);
    }
  }

  // Handle Action Submissions
  async function handleAcceptClick() {
    if (!finding.id || !currentSuggestion) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onAccept(finding.id, currentSuggestion);
    } catch (err: any) {
      setActionError(err.message || "Could not accept suggestion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditApply() {
    if (!finding.id || !editedText.trim()) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onEdit(finding.id, editedText.trim());
      setIsEditingInline(false);
    } catch (err: any) {
      setActionError(err.message || "Could not apply edit.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDismissConfirm() {
    if (!finding.id) return;
    if (!dismissReason.trim()) {
      setActionError("A reason is mandatory when dismissing a finding.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onDismiss(finding.id, dismissReason.trim());
      setIsDismissing(false);
    } catch (err: any) {
      setActionError(err.message || "Could not dismiss finding.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExplainConfirm() {
    if (!finding.id) return;
    if (!explainRationale.trim()) {
      setActionError("Please provide a rationale explaining why this should remain.");
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onExplain(finding.id, explainRationale.trim());
      setIsExplaining(false);
    } catch (err: any) {
      setActionError(err.message || "Could not save explanation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-paper-raised border border-rule rounded-sm p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <SeverityMark severity={finding.severity} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase font-bold text-ink">
                {finding.category} Finding
              </span>
              <span className="text-rule">•</span>
              <span className="font-mono text-[11px] text-ink-soft bg-paper border border-rule px-1.5 py-0.5 rounded-xs">
                {caveatLabel}
              </span>
            </div>
            {isResolved && (
              <div className="text-[11px] font-mono text-moss font-semibold mt-0.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                Status: {finding.status.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {onClose && (
          <Button
            variant="quiet"
            size="sm"
            onClick={onClose}
            className="text-xs font-sans h-7 text-ink-soft hover:text-ink"
          >
            Close Detail
          </Button>
        )}
      </div>

      {/* 1. Flagged Passage */}
      <div className="space-y-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
          Flagged Passage
        </span>
        <div className="p-3 bg-paper border-l-2 border-oxblood border-y border-r border-rule rounded-r-sm font-serif text-sm text-ink italic leading-relaxed">
          &ldquo;{finding.span_text}&rdquo;
        </div>
      </div>

      {/* 2. Why It Matters (Explanation) */}
      <div className="space-y-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
          Why It Matters (Governance Risk)
        </span>
        <p className="font-sans text-xs text-ink-soft leading-relaxed bg-paper-sunken/40 p-3 rounded-sm border border-rule">
          {finding.explanation}
        </p>
      </div>

      {/* 3. The Evidence: SourceChip or Unverified Notice */}
      <div className="space-y-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold">
          Governing Brand Authority
        </span>
        <div className="p-3 bg-paper border border-rule rounded-sm flex items-center justify-between gap-3">
          {finding.source_key ? (
            <div className="flex items-center gap-3">
              <SourceChip
                sourceId={finding.source_key}
                sourceTitle={source?.title || "Brand Knowledge Base"}
                onClick={() => {
                  if (source && onOpenSourceModal) {
                    onOpenSourceModal(source);
                  } else if (onInspectSource) {
                    onInspectSource(finding.source_key!, finding.source_id);
                  }
                }}
              />
              <span className="font-sans text-xs text-ink-soft">
                Anchored to approved policy [{finding.source_key}]
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] px-2 py-0.5 border border-dashed border-rule text-ink-soft rounded-xs">
                Unverified Citation
              </span>
              <span className="font-sans text-xs text-ink-soft">
                No approved source supports or contradicts this. A human should decide.
              </span>
            </div>
          )}

          {finding.source_key && onInspectSource && (
            <button
              type="button"
              onClick={() => onInspectSource(finding.source_key!, finding.source_id)}
              className="font-sans text-xs text-accent hover:underline flex items-center gap-1 cursor-pointer"
            >
              Inspect Source <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Suggestion Block with DiffView */}
      {currentSuggestion && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-soft font-semibold flex items-center gap-1.5">
              <span>Purpose-Preserving Suggestion</span>
              {finding.lane === "llm" && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating || isResolved}
                  className="text-[10px] font-sans text-accent hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  title="Re-prompt AI for an alternative suggestion"
                >
                  <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              )}
            </span>

            <span className="font-mono text-[10px] text-ink-soft">
              Diff Preview
            </span>
          </div>

          <DiffView
            originalText={finding.span_text}
            revisedText={isEditingInline ? editedText : currentSuggestion}
            className="font-serif text-sm"
          />

          {/* Inline Edit Box */}
          {isEditingInline && (
            <div className="p-3 bg-paper border border-rule rounded-sm space-y-2 mt-2">
              <label className="block font-sans text-xs font-medium text-ink-soft">
                Customize Proposed Replacement:
              </label>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={2}
                className="w-full p-2.5 font-serif text-xs bg-paper-raised border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setIsEditingInline(false)}
                  className="text-xs h-7"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEditApply}
                  disabled={isSubmitting || !editedText.trim()}
                  className="text-xs h-7"
                >
                  Apply Custom Edit
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dismissal Input Drawer/Box */}
      {isDismissing && (
        <div className="p-3.5 bg-oxblood/5 border border-oxblood/30 rounded-sm space-y-2">
          <label className="block font-sans text-xs font-medium text-oxblood">
            Mandatory Dismissal Reason (Audited):
          </label>
          <Input
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            placeholder="e.g. Approved under special exception by Marketing Director..."
            className="bg-paper border-rule text-xs h-8"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setIsDismissing(false)}
              className="text-xs h-7"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDismissConfirm}
              disabled={isSubmitting || !dismissReason.trim()}
              className="text-xs h-7"
            >
              Confirm Dismissal
            </Button>
          </div>
        </div>
      )}

      {/* Explain Rationale Input Box */}
      {isExplaining && (
        <div className="p-3.5 bg-paper border border-rule rounded-sm space-y-2">
          <label className="block font-sans text-xs font-medium text-ink-soft">
            Explain Why This Passage Should Stay (For Reviewer):
          </label>
          <Input
            value={explainRationale}
            onChange={(e) => setExplainRationale(e.target.value)}
            placeholder="e.g. This is a technical product specification verified in lab test report #204..."
            className="bg-paper-raised border-rule text-xs h-8"
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="quiet"
              size="sm"
              onClick={() => setIsExplaining(false)}
              className="text-xs h-7"
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExplainConfirm}
              disabled={isSubmitting || !explainRationale.trim()}
              className="text-xs h-7"
            >
              Save Explanation
            </Button>
          </div>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="p-2.5 bg-oxblood/10 border border-oxblood/30 text-oxblood text-xs rounded-sm">
          {actionError}
        </div>
      )}

      {/* Creator Action Buttons Bar */}
      {!isResolved && !isEditingInline && !isDismissing && !isExplaining && (
        <div className="border-t border-rule pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentSuggestion && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptClick}
                  disabled={isSubmitting}
                  className="font-sans text-xs h-8 bg-accent text-paper"
                  title="Accept suggestion (shortcut: A)"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Accept Suggestion <span className="ml-1 opacity-70 font-mono text-[10px]">[A]</span>
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingInline(true)}
                  disabled={isSubmitting}
                  className="font-sans text-xs h-8 border-rule"
                  title="Edit suggestion inline (shortcut: E)"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Edit <span className="ml-1 opacity-70 font-mono text-[10px]">[E]</span>
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setIsExplaining(true)}
              disabled={isSubmitting}
              className="font-sans text-xs h-8 text-ink-soft hover:text-ink"
              title="Provide rationale for reviewer"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Explain
            </Button>

            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => setIsDismissing(true)}
              disabled={isSubmitting}
              className="font-sans text-xs h-8 text-oxblood hover:bg-oxblood/10"
              title="Dismiss finding with reason (shortcut: D)"
            >
              <XCircle className="w-3.5 h-3.5 mr-1" />
              Dismiss <span className="ml-1 opacity-70 font-mono text-[10px]">[D]</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

