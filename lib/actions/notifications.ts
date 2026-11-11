"use server";

import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NotificationItem {
  id: string;
  type: "decision" | "submission" | "comment" | "audit";
  title: string;
  message: string;
  timestamp: string;
  link: string;
  read: boolean;
}

/**
 * Retrieves simple in-app notifications derived from workspace audit events.
 */
export async function getNotificationsAction(): Promise<{
  success: boolean;
  notifications: NotificationItem[];
}> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: true, notifications: [] };
    }

    const adminSb = createAdminClient();

    // 1. Get user's active workspace membership
    const { data: member } = await adminSb
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!member) {
      return { success: true, notifications: [] };
    }

    const workspaceId = member.workspace_id;
    const isReviewerOrAdmin = member.role === "reviewer" || member.role === "admin";

    // 2. Query recent audit events in workspace
    const { data: rawEvents } = await (adminSb
      .from("audit_events") as any)
      .select(`
        id,
        event_type,
        entity_id,
        payload,
        created_at,
        actor:actor_id (
          full_name
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);

    const events = (rawEvents || []) as any[];
    const notifications: NotificationItem[] = [];

    for (const evt of events || []) {
      const actorName = (evt.actor as any)?.full_name || "A collaborator";
      const p = evt.payload || {};

      if (evt.event_type === "decision_made") {
        const dec = p.decision;
        const draftTitle = p.draft_title || "Draft";
        const contentItemId = p.content_item_id;

        notifications.push({
          id: evt.id,
          type: "decision",
          title: `Review Decision: ${dec === "approved" ? "Approved" : dec === "changes_requested" ? "Changes Requested" : "Rejected"}`,
          message: `${actorName} recorded decision '${dec}' on "${draftTitle}".`,
          timestamp: evt.created_at,
          link: contentItemId ? `/reviews/${contentItemId}` : "/reviews",
          read: false,
        });
      } else if (
        (evt.event_type === "review_submitted_for_human_review" || evt.event_type === "submitted_for_review") &&
        isReviewerOrAdmin
      ) {
        const contentItemId = p.content_item_id || evt.entity_id;
        notifications.push({
          id: evt.id,
          type: "submission",
          title: "New Draft Pending Review",
          message: `${actorName} submitted a revised draft for human verification.`,
          timestamp: evt.created_at,
          link: contentItemId ? `/reviews/${contentItemId}` : "/queue",
          read: false,
        });
      } else if (evt.event_type === "comment_added") {
        notifications.push({
          id: evt.id,
          type: "comment",
          title: "New Editorial Comment",
          message: `${actorName}: "${(p.body_snippet || "Commented on draft").slice(0, 60)}..."`,
          timestamp: evt.created_at,
          link: p.review_id ? `/reviews/${p.review_id}` : "/reviews",
          read: false,
        });
      }
    }

    return { success: true, notifications };
  } catch (err) {
    return { success: true, notifications: [] };
  }
}
