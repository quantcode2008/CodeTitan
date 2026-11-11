"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewStatus } from "@/lib/database.types";

export interface SubmitDecisionPayload {
  reviewId: string;
  decision: "approved" | "changes_requested" | "rejected";
  reason?: string;
  confirmedUnverifiedCritical?: boolean;
}

export interface ReviewDecisionResult {
  success: boolean;
  status?: ReviewStatus;
  error?: string;
}

/**
 * Submits a human governance decision (Approve, Request Changes, Reject).
 * 
 * Server-Side Enforcements:
 * 1. Only Reviewers and Admins can decide.
 * 2. A Creator CANNOT approve their own draft (Non-negotiable conflict-of-interest check).
 * 3. If review contains critical findings or requires_designated_reviewer, the decider
 *    MUST have is_designated_reviewer = true or role = 'admin'.
 * 4. 'changes_requested' and 'rejected' REQUIRE a written reason.
 * 5. Approving with unverified critical findings requires explicit confirmation.
 * 6. Writes reviews.status, decided_by, decision_reason, decided_at.
 * 7. Logs immutable audit event 'decision_made'.
 */
export async function submitReviewDecisionAction(
  payload: SubmitDecisionPayload
): Promise<ReviewDecisionResult> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const { reviewId, decision, reason, confirmedUnverifiedCritical } = payload;

    if (!["approved", "changes_requested", "rejected"].includes(decision)) {
      return { success: false, error: "Invalid review decision." };
    }

    // Reason required for changes_requested and rejected
    if (["changes_requested", "rejected"].includes(decision) && (!reason || !reason.trim())) {
      return {
        success: false,
        error: `A written reason is required when ${decision === "rejected" ? "rejecting" : "requesting changes on"} a draft.`,
      };
    }

    const adminSb = createAdminClient();

    // 1. Fetch Review with Content Item
    const { data: review, error: revErr } = await adminSb
      .from("reviews")
      .select(`
        id,
        status,
        content_item_id,
        revision_id,
        content_items (
          id,
          workspace_id,
          title,
          created_by
        )
      `)
      .eq("id", reviewId)
      .single();

    if (revErr || !review) {
      return { success: false, error: "Review not found." };
    }

    // Fetch findings for this review
    const { data: rawFindings } = await adminSb
      .from("findings")
      .select(`
        id,
        severity,
        status,
        evidence_status,
        requires_designated_reviewer,
        resolution_note
      `)
      .eq("review_id", reviewId);

    const findings = (rawFindings || []) as any[];

    const contentItem = review.content_items as any;
    const workspaceId = contentItem?.workspace_id;
    const draftCreatorId = contentItem?.created_by;

    if (!workspaceId) {
      return { success: false, error: "Workspace context could not be resolved." };
    }

    // 2. Fetch User's Workspace Membership & Designated Reviewer Flag
    const { data: membership, error: memErr } = await adminSb
      .from("workspace_members")
      .select("role, is_designated_reviewer")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (memErr || !membership) {
      return {
        success: false,
        error: "Forbidden. You are not a member of this workspace.",
      };
    }

    // Only Reviewer or Admin can decide
    if (membership.role !== "reviewer" && membership.role !== "admin") {
      return {
        success: false,
        error: "Forbidden. Only reviewers and administrators can decide review outcomes.",
      };
    }

    // 3. ENFORCEMENT: A creator cannot approve their own content!
    if (draftCreatorId === user.id && decision === "approved") {
      return {
        success: false,
        error: "Conflict of Interest: A creator cannot approve their own draft. Independent human review is mandatory.",
      };
    }

    // 4. ENFORCEMENT: Check if Designated Reviewer is required
    const hasCriticalFinding = findings.some((f) => f.severity === "critical");
    const requiresDesignated = findings.some((f) => f.requires_designated_reviewer);

    if ((hasCriticalFinding || requiresDesignated) && !membership.is_designated_reviewer && membership.role !== "admin") {
      return {
        success: false,
        error: "Level 2 Governance: This draft contains critical risk findings and requires approval by a Designated Reviewer.",
      };
    }

    // 5. ENFORCEMENT: Approving with unverified critical findings requires explicit confirmation
    if (decision === "approved") {
      const openUnverifiedCritical = findings.filter(
        (f) =>
          f.severity === "critical" &&
          f.evidence_status === "unverified" &&
          f.status !== "dismissed"
      );

      if (openUnverifiedCritical.length > 0 && !confirmedUnverifiedCritical) {
        return {
          success: false,
          error: "Explicit confirmation is required to approve drafts with unverified critical findings.",
        };
      }
    }

    const now = new Date().toISOString();

    // 6. Update reviews table
    const { error: updateErr } = await adminSb
      .from("reviews")
      .update({
        status: decision,
        decided_by: user.id,
        decision_reason: reason?.trim() || null,
        decided_at: now,
        updated_at: now,
      })
      .eq("id", reviewId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 7. Update content_items table timestamp
    await adminSb
      .from("content_items")
      .update({
        updated_at: now,
      })
      .eq("id", contentItem.id);

    // 8. Record Immutable Audit Event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "decision_made",
      entityType: "review",
      entityId: reviewId,
      payload: {
        decision,
        reason: reason?.trim() || null,
        decided_by: user.id,
        content_item_id: contentItem.id,
        draft_title: contentItem.title,
        is_designated_reviewer: membership.is_designated_reviewer,
        confirmed_unverified_critical: Boolean(confirmedUnverifiedCritical),
      },
      injectedClient: adminSb,
    });

    // Revalidate affected routes
    revalidatePath("/queue");
    revalidatePath("/reviews");
    revalidatePath(`/reviews/${contentItem.id}`);
    revalidatePath(`/reviews/${contentItem.id}/history`);

    return {
      success: true,
      status: decision,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to submit review decision.",
    };
  }
}
