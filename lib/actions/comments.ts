"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceRole } from "@/lib/auth/types";

export interface CommentItem {
  id: string;
  review_id: string;
  finding_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: WorkspaceRole;
    is_designated_reviewer: boolean;
  };
}

export interface AddCommentPayload {
  reviewId: string;
  findingId?: string | null;
  body: string;
}

/**
 * Adds a threaded comment to a review or finding.
 */
export async function addCommentAction(
  payload: AddCommentPayload
): Promise<{ success: boolean; comment?: CommentItem; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const { reviewId, findingId, body } = payload;
    if (!body || !body.trim()) {
      return { success: false, error: "Comment text cannot be empty." };
    }

    const adminSb = createAdminClient();

    // 1. Fetch review to resolve workspace
    const { data: review, error: revErr } = await adminSb
      .from("reviews")
      .select("id, content_item_id, content_items (workspace_id)")
      .eq("id", reviewId)
      .single();

    if (revErr || !review) {
      return { success: false, error: "Review not found." };
    }

    const workspaceId = (review.content_items as any)?.workspace_id;
    if (!workspaceId) {
      return { success: false, error: "Workspace context not found." };
    }

    // 2. Verify workspace membership
    const { data: member, error: memErr } = await adminSb
      .from("workspace_members")
      .select("role, is_designated_reviewer")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (memErr || !member) {
      return { success: false, error: "You must be a member of this workspace to comment." };
    }

    // 3. Insert comment
    const { data: comment, error: insertErr } = await adminSb
      .from("comments")
      .insert({
        review_id: reviewId,
        finding_id: findingId || null,
        author_id: user.id,
        body: body.trim(),
      })
      .select(`
        id,
        review_id,
        finding_id,
        author_id,
        body,
        created_at,
        updated_at,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (insertErr || !comment) {
      return { success: false, error: insertErr?.message || "Failed to post comment." };
    }

    // 4. Record audit event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "comment_added",
      entityType: "comment",
      entityId: comment.id,
      payload: {
        review_id: reviewId,
        finding_id: findingId || null,
        body_snippet: body.slice(0, 100),
      },
      injectedClient: adminSb,
    });

    const prof = (comment as any).profiles;
    const formattedComment: CommentItem = {
      id: comment.id,
      review_id: comment.review_id,
      finding_id: comment.finding_id,
      author_id: comment.author_id || user.id,
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: user.id,
        full_name: prof?.full_name || "Unknown Member",
        avatar_url: prof?.avatar_url || null,
        role: member.role as WorkspaceRole,
        is_designated_reviewer: member.is_designated_reviewer,
      },
    };

    revalidatePath(`/reviews`);
    revalidatePath(`/reviews/${review.content_item_id}`);

    return { success: true, comment: formattedComment };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to post comment." };
  }
}

/**
 * Retrieves all comments for a review, populated with author details.
 */
export async function getCommentsAction(
  reviewId: string
): Promise<{ success: boolean; comments?: CommentItem[]; error?: string }> {
  try {
    const adminSb = createAdminClient();

    // 1. Fetch review to get workspace_id
    const { data: review } = await adminSb
      .from("reviews")
      .select("content_items (workspace_id)")
      .eq("id", reviewId)
      .single();

    const workspaceId = (review?.content_items as any)?.workspace_id;

    // 2. Fetch comments with profiles
    const { data: comments, error } = await adminSb
      .from("comments")
      .select(`
        id,
        review_id,
        finding_id,
        author_id,
        body,
        created_at,
        updated_at,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    // 3. Fetch workspace members to attach role badges
    let membersMap: Record<string, { role: WorkspaceRole; is_designated_reviewer: boolean }> = {};
    if (workspaceId) {
      const { data: members } = await adminSb
        .from("workspace_members")
        .select("user_id, role, is_designated_reviewer")
        .eq("workspace_id", workspaceId);

      if (members) {
        membersMap = members.reduce((acc, m) => {
          acc[m.user_id] = {
            role: m.role as WorkspaceRole,
            is_designated_reviewer: m.is_designated_reviewer,
          };
          return acc;
        }, {} as any);
      }
    }

    const formatted: CommentItem[] = (comments || []).map((c: any) => {
      const prof = c.profiles;
      const mem = membersMap[c.author_id] || { role: "creator" as WorkspaceRole, is_designated_reviewer: false };

      return {
        id: c.id,
        review_id: c.review_id,
        finding_id: c.finding_id,
        author_id: c.author_id,
        body: c.body,
        created_at: c.created_at,
        updated_at: c.updated_at,
        author: {
          id: c.author_id,
          full_name: prof?.full_name || "Unknown Author",
          avatar_url: prof?.avatar_url || null,
          role: mem.role,
          is_designated_reviewer: mem.is_designated_reviewer,
        },
      };
    });

    return { success: true, comments: formatted };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load comments." };
  }
}
