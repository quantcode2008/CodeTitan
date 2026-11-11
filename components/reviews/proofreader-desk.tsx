"use client";

import * as React from "react";
import { ReviewFinding } from "@/lib/review/types";
import { ReviewStatus, FindingStatus } from "@/lib/database.types";
import { AnnotatedDraft } from "./annotated-draft";
import { MarginNotes } from "./margin-notes";
import { FindingDetail } from "./finding-detail";
import { DecisionPanel } from "./decision-panel";
import { CommentsPanel } from "./comments-panel";
import { SourceDrawer, BrandSourcePreview } from "./source-drawer";
import { StatusTrail } from "@/components/brandproof/status-trail";
import { DiffView } from "@/components/brandproof/diff-view";
import { CommentItem } from "@/lib/actions/comments";
import {
  updateFindingStatusAction,
  submitForHumanReviewAction,
  reRunGovernanceScanAction,
} from "@/lib/actions/review-desk";
import {
  FileText,
  Filter,
  RefreshCw,
  Send,
  MessageSquare,
  Columns2,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Shield,
  Loader2,
  Keyboard,
  History,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ProofreaderDeskProps {
  contentItemId: string;
  reviewId: string;
  revisionId: string;
  initialRevisionVersion: number;
  initialStatus: ReviewStatus;
  originalText: string;
  initialWorkingText: string;
  initialFindings: ReviewFinding[];
  brandSourcesMap: Record<string, BrandSourcePreview>;
  initialComments: CommentItem[];
  draftCreatorId: string;
  currentUserId: string;
  currentUserRole: "admin" | "creator" | "reviewer";
  isDesignatedReviewer: boolean;
  draftTitle: string;
  channel: string;
  decisionReason?: string | null;
  decidedBy?: string | null;
  decidedAt?: string | null;
}

export function ProofreaderDesk({
  contentItemId,
  reviewId,
  revisionId,
  initialRevisionVersion,
  initialStatus,
  originalText,
  initialWorkingText,
  initialFindings,
  brandSourcesMap,
  initialComments,
  draftCreatorId,
  currentUserId,
  currentUserRole,
  isDesignatedReviewer,
  draftTitle,
  channel,
  decisionReason,
  decidedBy,
  decidedAt,
}: ProofreaderDeskProps) {
  // State
  const [currentStatus, setCurrentStatus] = React.useState<ReviewStatus>(initialStatus);
  const [workingText, setWorkingText] = React.useState<string>(initialWorkingText);
  const [findings, setFindings] = React.useState<ReviewFinding[]>(initialFindings);
  const [activeFindingId, setActiveFindingId] = React.useState<string | null>(
    initialFindings.length > 0 ? initialFindings[0].id || null : null
  );

  // Filters
  const [severityFilter, setSeverityFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [unverifiedOnly, setUnverifiedOnly] = React.useState<boolean>(false);

  // Modals & Panels
  const [showDiffModal, setShowDiffModal] = React.useState<boolean>(false);
  const [showCommentsTab, setShowCommentsTab] = React.useState<boolean>(false);
  const [activeSourceModal, setActiveSourceModal] = React.useState<BrandSourcePreview | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = React.useState<boolean>(false);
  const [isReRunning, setIsReRunning] = React.useState<boolean>(false);

  // Accessibility Announcements
  const [ariaAnnouncement, setAriaAnnouncement] = React.useState<string>("");

  // Finding Counts
  const openCount = findings.filter((f) => f.status === "open").length;
  const resolvedCount = findings.filter((f) => f.status !== "open").length;
  const needsJudgementCount = findings.filter(
    (f) => f.evidence_status === "unverified" && f.status === "open"
  ).length;

  // Filtered Findings
  const filteredFindingIds = React.useMemo(() => {
    return new Set(
      findings
        .filter((f) => {
          if (severityFilter !== "all" && f.severity !== severityFilter) return false;
          if (statusFilter === "open" && f.status !== "open") return false;
          if (statusFilter === "resolved" && f.status === "open") return false;
          if (unverifiedOnly && f.evidence_status !== "unverified") return false;
          return true;
        })
        .map((f) => f.id || "")
    );
  }, [findings, severityFilter, statusFilter, unverifiedOnly]);

  const selectedFinding = React.useMemo(() => {
    return findings.find((f) => f.id === activeFindingId) || null;
  }, [findings, activeFindingId]);

  // Keyboard navigation & shortcuts (j, k, Enter, a, e, d)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts inside text inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = findings.findIndex((f) => f.id === activeFindingId);
        const nextIndex = currentIndex < findings.length - 1 ? currentIndex + 1 : 0;
        if (findings[nextIndex]) {
          setActiveFindingId(findings[nextIndex].id || null);
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = findings.findIndex((f) => f.id === activeFindingId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : findings.length - 1;
        if (findings[prevIndex]) {
          setActiveFindingId(findings[prevIndex].id || null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [findings, activeFindingId]);

  // Handle Finding Resolution (Accept, Edit, Dismiss, Explain)
  const handleUpdateFindingStatus = async (
    findingId: string,
    newStatus: FindingStatus,
    resolutionNote?: string,
    editedSuggestion?: string
  ) => {
    const targetFinding = findings.find((f) => f.id === findingId);
    if (!targetFinding) return;

    // 1. Optimistic update
    setFindings((prev) =>
      prev.map((f) => {
        if (f.id === findingId) {
          return {
            ...f,
            status: newStatus,
            resolution_note: resolutionNote || f.resolution_note,
            suggestion: editedSuggestion || f.suggestion,
          };
        }
        return f;
      })
    );

    // 2. If accepted or edited, update working text state non-destructively
    if (newStatus === "accepted" || newStatus === "edited") {
      const replacement = editedSuggestion || targetFinding.suggestion;
      if (replacement && targetFinding.span_text) {
        setWorkingText((prev) => {
          // Replace target phrase in working text
          if (prev.includes(targetFinding.span_text)) {
            return prev.replace(targetFinding.span_text, replacement);
          }
          return prev;
        });
      }
    }

    setAriaAnnouncement(`Finding ${targetFinding.category} marked as ${newStatus}.`);

    // 3. Persist to server
    await updateFindingStatusAction({
      findingId,
      status: newStatus,
      resolutionNote,
      editedSuggestion,
    });
  };

  // Submit for Human Review
  const handleSubmitForHumanReview = async () => {
    setIsSubmittingReview(true);
    const res = await submitForHumanReviewAction({
      contentItemId,
      revisionId,
      reviewId,
      workingText,
    });
    setIsSubmittingReview(false);

    if (res.success) {
      setCurrentStatus("ready_for_review");
      setAriaAnnouncement("Draft successfully submitted for human editorial review.");
    }
  };

  // Re-run Governance Checks
  const handleReRunChecks = async () => {
    setIsReRunning(true);
    const res = await reRunGovernanceScanAction({
      contentItemId,
      workingText,
    });
    setIsReRunning(false);

    if (res.success && res.result) {
      setFindings(res.result.findings);
      setAriaAnnouncement(`Governance scan complete. ${res.result.findings.length} findings identified.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="polite" role="status">
        {ariaAnnouncement}
      </div>

      {/* Header Bar */}
      <div className="bg-paper-raised border border-rule rounded-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule uppercase tracking-wide text-ink-soft">
                {channel}
              </span>
              <span className="font-mono text-xs text-ink-soft">
                v{initialRevisionVersion}
              </span>
              <h1 className="font-serif text-lg font-bold text-ink">
                {draftTitle}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-ink-soft">
              <span>{openCount} open</span>
              <span>·</span>
              <span className="text-ochre font-medium">{needsJudgementCount} needs judgement</span>
              <span>·</span>
              <span className="text-moss font-medium">{resolvedCount} resolved</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/reviews/${contentItemId}/history`}
              className="px-3 py-1.5 rounded-sm border border-rule bg-paper hover:bg-paper-sunken font-mono text-xs flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History</span>
            </Link>

            <button
              type="button"
              onClick={() => setShowDiffModal(true)}
              className="px-3 py-1.5 rounded-sm border border-rule bg-paper hover:bg-paper-sunken font-mono text-xs flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors cursor-pointer"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Compare Original</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCommentsTab(!showCommentsTab)}
              className={cn(
                "px-3 py-1.5 rounded-sm border font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer",
                showCommentsTab
                  ? "bg-accent text-paper border-accent"
                  : "bg-paper border-rule hover:bg-paper-sunken text-ink-soft hover:text-ink"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Comments ({initialComments.length})</span>
            </button>

            <button
              type="button"
              disabled={isReRunning}
              onClick={handleReRunChecks}
              className="px-3 py-1.5 rounded-sm border border-rule bg-paper hover:bg-paper-sunken font-mono text-xs flex items-center gap-1.5 text-ink-soft hover:text-ink transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isReRunning && "animate-spin")} />
              <span>Re-run Checks</span>
            </button>

            {currentStatus === "needs_attention" && (
              <button
                type="button"
                disabled={openCount > 0 || isSubmittingReview}
                onClick={handleSubmitForHumanReview}
                title={openCount > 0 ? "Resolve all open findings before submitting" : "Submit for human review"}
                className={cn(
                  "px-3.5 py-1.5 rounded-sm font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer",
                  openCount > 0
                    ? "bg-paper-sunken border border-rule text-ink-soft/60 cursor-not-allowed"
                    : "bg-accent hover:bg-accent/90 text-paper shadow-hairline"
                )}
              >
                {isSubmittingReview ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit for Human Review</span>
              </button>
            )}
          </div>
        </div>

        {/* Workflow Status Trail */}
        <StatusTrail currentState={currentStatus} unresolvedCount={openCount} />
      </div>

      {/* Reviewer Human Decision Panel */}
      <DecisionPanel
        reviewId={reviewId}
        contentItemId={contentItemId}
        currentStatus={currentStatus}
        draftCreatorId={draftCreatorId}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        isDesignatedReviewer={isDesignatedReviewer}
        findings={findings}
        decisionReason={decisionReason}
        decidedBy={decidedBy}
        decidedAt={decidedAt}
        onDecisionSubmitted={(newStat) => setCurrentStatus(newStat)}
      />

      {/* Main 3-Zone Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* CENTER READING DESK (Newsreader Typography) */}
        <div className={cn("space-y-4", showCommentsTab ? "lg:col-span-5" : "lg:col-span-8")}>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-paper-raised border border-rule rounded-sm font-mono text-[11px] text-ink-soft">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" />
              <span>Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-paper border border-rule rounded-sm px-1.5 py-0.5 text-ink cursor-pointer focus:outline-hidden"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="advisory">Advisory</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unverifiedOnly}
                  onChange={(e) => setUnverifiedOnly(e.target.checked)}
                  className="rounded-sm border-rule text-accent focus:ring-accent h-3.5 w-3.5"
                />
                <span>Unverified Only</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-1.5 py-0.5 rounded-sm border cursor-pointer",
                    statusFilter === "all" ? "bg-accent/10 border-accent text-accent" : "border-rule text-ink-soft"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("open")}
                  className={cn(
                    "px-1.5 py-0.5 rounded-sm border cursor-pointer",
                    statusFilter === "open" ? "bg-accent/10 border-accent text-accent" : "border-rule text-ink-soft"
                  )}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("resolved")}
                  className={cn(
                    "px-1.5 py-0.5 rounded-sm border cursor-pointer",
                    statusFilter === "resolved" ? "bg-moss/10 border-moss text-moss" : "border-rule text-ink-soft"
                  )}
                >
                  Resolved
                </button>
              </div>
            </div>
          </div>

          {/* Center Draft Component */}
          <AnnotatedDraft
            draftText={workingText}
            findings={findings}
            activeFindingId={activeFindingId}
            onSelectFinding={(id) => setActiveFindingId(id)}
            filteredFindingIds={filteredFindingIds}
          />

          {/* Finding Detail Expand Block */}
          {selectedFinding && (
            <FindingDetail
              finding={selectedFinding}
              source={selectedFinding.source_id ? brandSourcesMap[selectedFinding.source_id] : undefined}
              onAccept={(id) => handleUpdateFindingStatus(id, "accepted")}
              onEdit={(id, edited) => handleUpdateFindingStatus(id, "edited", undefined, edited)}
              onDismiss={(id, reason) => handleUpdateFindingStatus(id, "dismissed", reason)}
              onExplain={(id, reason) => handleUpdateFindingStatus(id, "explained", reason)}
              onOpenSourceModal={(source: BrandSourcePreview) => setActiveSourceModal(source)}
            />
          )}
        </div>

        {/* RIGHT MARGIN NOTES & COLLISION-AVOIDED CARDS */}
        <div className={cn("space-y-4", showCommentsTab ? "lg:col-span-4" : "lg:col-span-4")}>
          <div className="flex items-center justify-between pb-1 border-b border-rule font-mono text-[11px] text-ink-soft">
            <span className="uppercase tracking-wider">Margin Annotations</span>
            <span className="flex items-center gap-1">
              <Keyboard className="w-3 h-3" />
              <span>[J] / [K] to navigate</span>
            </span>
          </div>

          <MarginNotes
            findings={findings}
            activeFindingId={activeFindingId}
            onSelectFinding={(id) => setActiveFindingId(id)}
            filteredFindingIds={filteredFindingIds}
          />
        </div>

        {/* EXPANDABLE COMMENTS COLUMN (If Open) */}
        {showCommentsTab && (
          <div className="lg:col-span-3">
            <CommentsPanel
              reviewId={reviewId}
              initialComments={initialComments}
              activeFindingId={activeFindingId}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isDesignatedReviewer={isDesignatedReviewer}
            />
          </div>
        )}
      </div>

      {/* FULL-DOCUMENT DIFF MODAL (Original vs Working Text) */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule shadow-xl rounded-sm max-w-4xl w-full p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <div className="flex items-center gap-2">
                <Columns2 className="w-4 h-4 text-accent" />
                <h3 className="font-serif text-base font-semibold text-ink">
                  Full Document Diff: Original Submission vs. Revised Draft
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                className="text-ink-soft hover:text-ink text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <DiffView originalText={originalText} revisedText={workingText} />
            </div>

            <div className="flex justify-end pt-2 border-t border-rule font-mono text-xs">
              <button
                type="button"
                onClick={() => setShowDiffModal(false)}
                className="px-4 py-1.5 bg-paper-sunken border border-rule rounded-sm hover:bg-paper cursor-pointer text-ink"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOURCE DRAWER MODAL */}
      <SourceDrawer
        source={activeSourceModal}
        isOpen={Boolean(activeSourceModal)}
        onClose={() => setActiveSourceModal(null)}
        highlightPassage={selectedFinding?.span_text}
      />
    </div>
  );
}
