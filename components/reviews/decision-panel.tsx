"use client";

import * as React from "react";
import { ReviewFinding } from "@/lib/review/types";
import { ReviewStatus } from "@/lib/database.types";
import { submitReviewDecisionAction } from "@/lib/actions/review-decision";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Lock,
  Loader2,
  FileText,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DecisionPanelProps {
  reviewId: string;
  contentItemId: string;
  currentStatus: ReviewStatus;
  draftCreatorId: string;
  currentUserId: string;
  currentUserRole: "admin" | "creator" | "reviewer";
  isDesignatedReviewer: boolean;
  findings: ReviewFinding[];
  decisionReason?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
  onDecisionSubmitted?: (newStatus: ReviewStatus) => void;
}

export function DecisionPanel({
  reviewId,
  contentItemId,
  currentStatus,
  draftCreatorId,
  currentUserId,
  currentUserRole,
  isDesignatedReviewer,
  findings,
  decisionReason,
  decidedBy,
  decidedAt,
  onDecisionSubmitted,
}: DecisionPanelProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<"approve" | "changes" | "reject" | null>(null);
  const [reasonText, setReasonText] = React.useState("");
  const [confirmUnverifiedCritical, setConfirmUnverifiedCritical] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const isCreator = currentUserId === draftCreatorId;
  const isAdmin = currentUserRole === "admin";
  const isReviewerOrAdmin = currentUserRole === "reviewer" || isAdmin;

  // Check if draft contains critical risk findings requiring a designated reviewer
  const hasCriticalFindings = findings.some((f) => f.severity === "critical");
  const requiresDesignatedReviewer = hasCriticalFindings || findings.some((f) => f.requires_designated_reviewer);

  // User permission evaluation
  const canDecideHighRisk = isAdmin || isDesignatedReviewer;
  const isBlockedByDesignation = requiresDesignatedReviewer && !canDecideHighRisk;
  const isBlockedByCreator = isCreator && !isAdmin;

  // Finding resolution breakdown
  const dismissedFindings = findings.filter((f) => f.status === "dismissed");
  const explainedFindings = findings.filter((f) => f.status === "explained");
  const unverifiedFindings = findings.filter((f) => f.evidence_status === "unverified" && f.status !== "dismissed");
  const unverifiedCriticalFindings = unverifiedFindings.filter((f) => f.severity === "critical");
  const openFindings = findings.filter((f) => f.status === "open");

  const isDecided = ["approved", "changes_requested", "rejected"].includes(currentStatus);

  const handleOpenModal = (type: "approve" | "changes" | "reject") => {
    setErrorMessage(null);
    setReasonText("");
    setConfirmUnverifiedCritical(false);
    setActiveModal(type);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setErrorMessage(null);
  };

  const handleSubmitDecision = async (decision: "approved" | "changes_requested" | "rejected") => {
    if (["changes_requested", "rejected"].includes(decision) && !reasonText.trim()) {
      setErrorMessage("A written explanation is required for this decision.");
      return;
    }

    if (decision === "approved" && unverifiedCriticalFindings.length > 0 && !confirmUnverifiedCritical) {
      setErrorMessage("You must explicitly confirm editorial liability for unverified critical findings.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await submitReviewDecisionAction({
      reviewId,
      decision,
      reason: reasonText.trim() || undefined,
      confirmedUnverifiedCritical: confirmUnverifiedCritical,
    });

    setIsSubmitting(false);

    if (res.success && res.status) {
      setActiveModal(null);
      if (onDecisionSubmitted) {
        onDecisionSubmitted(res.status);
      }
    } else {
      setErrorMessage(res.error || "Failed to record review decision.");
    }
  };

  return (
    <div className="bg-paper-raised border border-rule rounded-sm p-4 space-y-4 font-sans text-xs">
      {/* Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-accent stroke-[1.75]" />
          <span className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
            Human Editorial Governance
          </span>
        </div>
        <div className="flex items-center gap-2">
          {requiresDesignatedReviewer && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-oxblood/10 border border-oxblood/30 text-oxblood font-mono text-[11px] font-medium">
              <ShieldAlert className="w-3 h-3 stroke-[2]" />
              Designated Reviewer Required
            </span>
          )}
          <span
            className={cn(
              "font-mono text-[11px] px-2 py-0.5 rounded-sm uppercase tracking-wide border",
              currentStatus === "approved" && "bg-moss/10 border-moss/30 text-moss font-semibold",
              currentStatus === "changes_requested" && "bg-ochre/10 border-ochre/30 text-ochre font-semibold",
              currentStatus === "rejected" && "bg-oxblood/10 border-oxblood/30 text-oxblood font-semibold",
              currentStatus === "ready_for_review" && "bg-accent/10 border-accent/30 text-accent font-semibold",
              (currentStatus === "draft" || currentStatus === "needs_attention") &&
                "bg-paper-sunken border-rule text-ink-soft"
            )}
          >
            {currentStatus.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Fundamental Law Banner */}
      <div className="p-2.5 bg-paper border border-rule rounded-sm flex items-start gap-2.5 text-ink-soft">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-ink font-semibold">Governance Principle:</strong> A clean automated scan never
          equals approval. Every publication requires human verification against the controlled brand pack.
        </div>
      </div>

      {/* Decision Status if already decided */}
      {isDecided && (
        <div
          className={cn(
            "p-3 rounded-sm border space-y-1.5",
            currentStatus === "approved" && "bg-moss/5 border-moss/30 text-moss",
            currentStatus === "changes_requested" && "bg-ochre/5 border-ochre/30 text-ochre",
            currentStatus === "rejected" && "bg-oxblood/5 border-oxblood/30 text-oxblood"
          )}
        >
          <div className="font-semibold flex items-center gap-1.5 text-xs">
            {currentStatus === "approved" && <CheckCircle2 className="w-4 h-4 text-moss" />}
            {currentStatus === "changes_requested" && <AlertTriangle className="w-4 h-4 text-ochre" />}
            {currentStatus === "rejected" && <XCircle className="w-4 h-4 text-oxblood" />}
            <span>
              Decision: {currentStatus === "approved" ? "Approved for Publication" : currentStatus === "changes_requested" ? "Changes Requested" : "Rejected"}
            </span>
          </div>
          {decisionReason && (
            <p className="text-[11px] text-ink font-serif italic bg-paper-raised/60 p-2 rounded-sm border border-rule">
              &ldquo;{decisionReason}&rdquo;
            </p>
          )}
          {decidedAt && (
            <div className="font-mono text-[10px] text-ink-soft pt-1">
              Recorded at {new Date(decidedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Conflict of Interest Warning for Creator */}
      {isBlockedByCreator && (
        <div className="p-2.5 bg-ochre/10 border border-ochre/30 rounded-sm text-ochre flex items-start gap-2 text-[11px]">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Independent Review Required:</strong> You authored this draft. Under Brand Governance Rule 1.4,
            creators cannot approve their own submissions. An independent reviewer must evaluate this draft.
          </div>
        </div>
      )}

      {/* Designation Warning for Non-Designated Reviewers */}
      {isBlockedByDesignation && !isBlockedByCreator && (
        <div className="p-2.5 bg-oxblood/10 border border-oxblood/30 rounded-sm text-oxblood flex items-start gap-2 text-[11px]">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Level 2 Reviewer Authority Required:</strong> This draft flagged critical severity or promotional claims.
            Only designated reviewers with full brand authority can record approval.
          </div>
        </div>
      )}

      {/* Reviewer Action Buttons */}
      {isReviewerOrAdmin && !isBlockedByCreator && !isBlockedByDesignation && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-mono text-ink-soft uppercase tracking-wider">
            Reviewer Determination
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isSubmitting || openFindings.length > 0}
              onClick={() => handleOpenModal("approve")}
              title={openFindings.length > 0 ? "All open findings must be resolved first" : "Approve draft"}
              className={cn(
                "px-3 py-2 rounded-sm border font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs",
                openFindings.length > 0
                  ? "bg-paper-sunken border-rule text-ink-soft opacity-60 cursor-not-allowed"
                  : "bg-moss/10 hover:bg-moss/20 text-moss border-moss/30"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleOpenModal("changes")}
              className="px-3 py-2 rounded-sm border border-ochre/30 bg-ochre/10 hover:bg-ochre/20 text-ochre font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Request Changes</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleOpenModal("reject")}
              className="px-3 py-2 rounded-sm border border-oxblood/30 bg-oxblood/10 hover:bg-oxblood/20 text-oxblood font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
          </div>
          {openFindings.length > 0 && (
            <p className="text-[11px] text-ink-soft italic">
              * Approval is gated until all {openFindings.length} open findings are accepted, edited, dismissed, or explained.
            </p>
          )}
        </div>
      )}

      {/* APPROVE MODAL */}
      {activeModal === "approve" && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule shadow-lg rounded-sm max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <h3 className="font-serif text-base font-semibold text-ink flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-moss" />
                Confirm Publication Approval
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-ink-soft hover:text-ink text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-ink max-h-[60vh] overflow-y-auto pr-1">
              {/* Summary of Dismissed Findings */}
              {dismissedFindings.length > 0 && (
                <div className="p-3 bg-paper border border-rule rounded-sm space-y-2">
                  <div className="font-mono text-[11px] font-semibold text-ochre uppercase tracking-wider">
                    Dismissed Findings ({dismissedFindings.length})
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {dismissedFindings.map((f) => (
                      <div key={f.id} className="border-l-2 border-ochre pl-2 py-0.5">
                        <span className="font-semibold text-ink">&ldquo;{f.span_text}&rdquo;</span>
                        <div className="text-ink-soft italic">Reason: {f.resolution_note || "None specified"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary of Explained Findings */}
              {explainedFindings.length > 0 && (
                <div className="p-3 bg-paper border border-rule rounded-sm space-y-2">
                  <div className="font-mono text-[11px] font-semibold text-accent uppercase tracking-wider">
                    Author-Explained Findings ({explainedFindings.length})
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {explainedFindings.map((f) => (
                      <div key={f.id} className="border-l-2 border-accent pl-2 py-0.5">
                        <span className="font-semibold text-ink">&ldquo;{f.span_text}&rdquo;</span>
                        <div className="text-ink-soft italic">Rationale: {f.resolution_note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unverified Findings Warning */}
              {unverifiedFindings.length > 0 && (
                <div className="p-3 bg-oxblood/5 border border-oxblood/30 rounded-sm space-y-2 text-ink">
                  <div className="font-mono text-[11px] font-semibold text-oxblood uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Unverified Claims in Draft ({unverifiedFindings.length})
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    The following passages do not match any verified fact or claim in the brand pack:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    {unverifiedFindings.map((f) => (
                      <li key={f.id}>
                        <strong className="text-oxblood">&ldquo;{f.span_text}&rdquo;</strong> ({f.category})
                      </li>
                    ))}
                  </ul>

                  {/* Mandatory Checkbox for Critical Unverified Claims */}
                  {unverifiedCriticalFindings.length > 0 && (
                    <label className="flex items-start gap-2.5 pt-2 border-t border-oxblood/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmUnverifiedCritical}
                        onChange={(e) => setConfirmUnverifiedCritical(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded-sm border-rule text-oxblood focus:ring-oxblood"
                      />
                      <span className="text-[11px] font-medium text-oxblood leading-snug">
                        I explicitly confirm that I have evaluated these unverified critical claims and approve publication under editorial authority.
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Optional approval note */}
              <div>
                <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                  Optional Approval Note
                </label>
                <textarea
                  rows={2}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Record editorial sign-off comments..."
                  className="w-full text-xs p-2 rounded-sm bg-paper border border-rule focus:outline-hidden focus:border-accent"
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-oxblood/10 border border-oxblood/30 text-oxblood text-xs rounded-sm">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-3 py-1.5 border border-rule rounded-sm text-ink-soft hover:text-ink cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitDecision("approved")}
                disabled={isSubmitting || (unverifiedCriticalFindings.length > 0 && !confirmUnverifiedCritical)}
                className="px-4 py-1.5 bg-moss text-paper rounded-sm font-semibold hover:bg-moss/90 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirm & Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST CHANGES OR REJECT MODAL */}
      {(activeModal === "changes" || activeModal === "reject") && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule shadow-lg rounded-sm max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <h3 className="font-serif text-base font-semibold text-ink flex items-center gap-2">
                {activeModal === "changes" ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-ochre" />
                    Request Changes on Draft
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-oxblood" />
                    Reject Draft
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-ink-soft hover:text-ink text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-ink-soft">
                {activeModal === "changes"
                  ? "Detail the brand compliance corrections or source verifications required before this draft can proceed."
                  : "State the governance policy violations that justify rejecting this draft."}
              </p>

              <div>
                <label className="block font-mono text-[11px] font-semibold text-ink uppercase tracking-wider mb-1">
                  Written Reason <span className="text-oxblood">*</span>
                </label>
                <textarea
                  rows={4}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder={
                    activeModal === "changes"
                      ? "e.g., Replace the unapproved recycled nylon statistic with our verified 2026 sustainability fact sheet."
                      : "e.g., Unsubstantiated absolute guarantee claims violate policy S-002."
                  }
                  className="w-full text-xs p-2.5 rounded-sm bg-paper border border-rule focus:outline-hidden focus:border-accent text-ink"
                  required
                />
              </div>

              {errorMessage && (
                <div className="p-2 bg-oxblood/10 border border-oxblood/30 text-oxblood text-xs rounded-sm">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-rule">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="px-3 py-1.5 border border-rule rounded-sm text-ink-soft hover:text-ink cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitDecision(activeModal === "changes" ? "changes_requested" : "rejected")}
                disabled={isSubmitting || !reasonText.trim()}
                className={cn(
                  "px-4 py-1.5 rounded-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs text-paper disabled:opacity-50 disabled:cursor-not-allowed",
                  activeModal === "changes" ? "bg-ochre hover:bg-ochre/90" : "bg-oxblood hover:bg-oxblood/90"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : activeModal === "changes" ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

