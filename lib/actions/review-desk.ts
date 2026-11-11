"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireRole, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FindingStatus } from "@/lib/database.types";
import { runReview, ReviewRunResult } from "@/lib/review";

export interface UpdateFindingStatusPayload {
  findingId: string;
  status: FindingStatus;
  resolutionNote?: string;
  editedSuggestion?: string;
}

/**
 * Updates the resolution state of a governance finding:
 * 'accepted' | 'edited' | 'dismissed' (reason required) | 'explained' (rationale required)
 */
export async function updateFindingStatusAction(
  payload: UpdateFindingStatusPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const { findingId, status, resolutionNote, editedSuggestion } = payload;

    if (status === "dismissed" && (!resolutionNote || !resolutionNote.trim())) {
      return {
        success: false,
        error: "A dismissal reason is required by brand governance audit standards.",
      };
    }

    if (status === "explained" && (!resolutionNote || !resolutionNote.trim())) {
      return {
        success: false,
        error: "An explanation is required to document why this passage should remain as-is.",
      };
    }

    const adminSb = createAdminClient();

    // 1. Fetch finding to verify workspace
    const { data: finding, error: findErr } = await adminSb
      .from("findings")
      .select("id, review_id, status, category, severity, span_text, suggestion, reviews (content_item_id, content_items (workspace_id))")
      .eq("id", findingId)
      .single();

    if (findErr || !finding) {
      return { success: false, error: "Finding not found." };
    }

    const workspaceId = (finding.reviews as any)?.content_items?.workspace_id;
    if (!workspaceId) {
      return { success: false, error: "Could not resolve workspace for finding." };
    }

    // Role check: Creators and Reviewers can resolve findings
    await requireRole(workspaceId, ["creator", "reviewer", "admin"]);

    // 2. Prepare updates
    const updates: any = {
      status,
      resolution_note: resolutionNote?.trim() || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === "edited" && editedSuggestion) {
      updates.suggestion = editedSuggestion.trim();
    }

    const { error: updateErr } = await adminSb
      .from("findings")
      .update(updates)
      .eq("id", findingId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 3. Record Audit Event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: `finding_${status}` as any,
      entityType: "finding",
      entityId: findingId,
      payload: {
        previous_status: finding.status,
        new_status: status,
        resolution_note: resolutionNote || null,
        edited_suggestion: editedSuggestion || null,
        span_text: finding.span_text,
      },
      injectedClient: adminSb,
    });

    revalidatePath(`/reviews`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update finding status." };
  }
}

/**
 * Submits the revised draft for human review:
 * - Creates revision v2 if workingText was modified by applied suggestions
 * - Sets review status to 'ready_for_review'
 * - Records audit event
 */
export async function submitForHumanReviewAction(params: {
  contentItemId: string;
  revisionId: string;
  reviewId: string;
  workingText: string;
}): Promise<{ success: boolean; newRevisionId?: string; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const { contentItemId, revisionId, reviewId, workingText } = params;
    const adminSb = createAdminClient();

    // 1. Fetch content item & revision
    const { data: item } = await adminSb
      .from("content_items")
      .select("id, workspace_id, title")
      .eq("id", contentItemId)
      .single();

    if (!item) {
      return { success: false, error: "Content item not found." };
    }

    const { data: currentRev } = await adminSb
      .from("revisions")
      .select("id, version, body, source_versions_snapshot")
      .eq("id", revisionId)
      .single();

    let targetRevisionId = revisionId;

    // 2. If working text was altered by accepted/edited suggestions, preserve original and create new revision
    if (currentRev && currentRev.body !== workingText) {
      const nextVersion = (currentRev.version || 1) + 1;

      const { data: newRev, error: revErr } = await adminSb
        .from("revisions")
        .insert({
          content_item_id: contentItemId,
          version: nextVersion,
          body: workingText,
          created_by: user.id,
          source_versions_snapshot: currentRev.source_versions_snapshot || {},
        })
        .select("id")
        .single();

      if (revErr || !newRev) {
        return { success: false, error: `Failed to create revised snapshot: ${revErr?.message}` };
      }

      targetRevisionId = newRev.id;

      // Update current revision pointer
      await adminSb
        .from("content_items")
        .update({ current_revision_id: newRev.id })
        .eq("id", contentItemId);
    }

    // 3. Update review status to 'ready_for_review'
    // FUNDAMENTAL LAW: A clean automated scan NEVER equals approved!
    const { error: rewErr } = await adminSb
      .from("reviews")
      .update({
        revision_id: targetRevisionId,
        status: "ready_for_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (rewErr) {
      return { success: false, error: rewErr.message };
    }

    // 4. Record Audit Event
    await recordAuditEvent({
      workspaceId: item.workspace_id,
      actorId: user.id,
      eventType: "review_submitted_for_human_review",
      entityType: "review",
      entityId: reviewId,
      payload: {
        content_item_id: contentItemId,
        revision_id: targetRevisionId,
        prior_status: "needs_attention",
        new_status: "ready_for_review",
      },
      injectedClient: adminSb,
    });

    revalidatePath(`/reviews`);
    revalidatePath(`/reviews/${contentItemId}`);

    return { success: true, newRevisionId: targetRevisionId };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit for human review." };
  }
}

/**
 * Re-runs governance checks on updated working text:
 * - Creates a new revision (v2, v3...)
 * - Executes runReview
 * - Flags recurring findings that are still present
 */
export async function reRunGovernanceScanAction(params: {
  contentItemId: string;
  workingText: string;
}): Promise<{ success: boolean; result?: ReviewRunResult; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const { contentItemId, workingText } = params;
    const adminSb = createAdminClient();

    // 1. Fetch latest revision version
    const { data: revisions } = await adminSb
      .from("revisions")
      .select("id, version")
      .eq("content_item_id", contentItemId)
      .order("version", { ascending: false });

    const latestVersion = revisions?.[0]?.version || 1;
    const nextVersion = latestVersion + 1;

    // 2. Create new revision
    const { data: newRev, error: revErr } = await adminSb
      .from("revisions")
      .insert({
        content_item_id: contentItemId,
        version: nextVersion,
        body: workingText,
        created_by: user.id,
        source_versions_snapshot: {},
      })
      .select("id")
      .single();

    if (revErr || !newRev) {
      return { success: false, error: `Failed to create revision: ${revErr?.message}` };
    }

    // Update content_item's current revision pointer
    await adminSb
      .from("content_items")
      .update({ current_revision_id: newRev.id })
      .eq("id", contentItemId);

    // 3. Run Review on new revision
    const result = await runReview(contentItemId, newRev.id, {
      actorId: user.id,
      injectedClient: adminSb,
    });

    revalidatePath(`/reviews`);
    revalidatePath(`/reviews/${contentItemId}`);

    return { success: result.success, result, error: result.error };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to re-run governance scan." };
  }
}

