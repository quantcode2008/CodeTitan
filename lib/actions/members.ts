"use server";

import { requireRole, recordAuditEvent } from "@/lib/auth/server";
import { WorkspaceRole } from "@/lib/auth/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MemberActionResult {
  success: boolean;
  error?: string;
  member?: any;
}

/**
 * Adds an existing user by email to the workspace as a member.
 * Strictly restricted to workspace 'admin' role via requireRole().
 * Emits an immutable 'member_added' audit_events record.
 */
export async function addWorkspaceMemberAction(params: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  isDesignatedReviewer: boolean;
}): Promise<MemberActionResult> {
  const { workspaceId, email, role, isDesignatedReviewer } = params;

  try {
    // 1. Role verification: ONLY admins can add workspace members
    const { user: actor } = await requireRole(workspaceId, ["admin"]);

    const cleanEmail = email.trim().toLowerCase();
    const adminSb = createAdminClient();

    // 2. Find target user by email in auth.users
    const { data: userData, error: userLookupError } =
      await adminSb.auth.admin.listUsers();

    if (userLookupError) {
      return { success: false, error: "Database error during user lookup." };
    }

    const targetUser = userData.users.find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    if (!targetUser) {
      return {
        success: false,
        error: `No registered user found with email "${cleanEmail}". Seed accounts available: admin@asterandpine.demo, reviewer@asterandpine.demo, creator1@asterandpine.demo, creator2@asterandpine.demo.`,
      };
    }

    // 3. Ensure profile row exists
    await adminSb
      .from("profiles")
      .upsert({
        id: targetUser.id,
        full_name: (targetUser.user_metadata?.full_name as string) ?? cleanEmail.split("@")[0],
      })
      .select();

    // 4. Insert or update workspace member
    const { data: member, error: insertError } = await adminSb
      .from("workspace_members")
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: targetUser.id,
          role,
          is_designated_reviewer: isDesignatedReviewer,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,user_id" }
      )
      .select("id, workspace_id, user_id, role, is_designated_reviewer, created_at, updated_at")
      .single();

    if (insertError || !member) {
      return {
        success: false,
        error: insertError?.message || "Failed to add member to workspace.",
      };
    }

    // 5. Write immutable audit log event
    await recordAuditEvent({
      workspaceId,
      actorId: actor.id,
      eventType: "member_added",
      entityType: "workspace_member",
      entityId: member.id,
      payload: {
        member_email: cleanEmail,
        assigned_role: role,
        is_designated_reviewer: isDesignatedReviewer,
        added_by_user_id: actor.id,
      },
      injectedClient: adminSb,
    });

    revalidatePath("/settings");
    return { success: true, member };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected authorization error occurred.",
    };
  }
}

/**
 * Updates an existing member's role or designated reviewer status.
 * Strictly restricted to workspace 'admin' role via requireRole().
 * Emits an immutable 'role_changed' audit_events record.
 */
export async function updateWorkspaceMemberRoleAction(params: {
  workspaceId: string;
  memberId: string;
  role: WorkspaceRole;
  isDesignatedReviewer: boolean;
}): Promise<MemberActionResult> {
  const { workspaceId, memberId, role, isDesignatedReviewer } = params;

  try {
    // 1. Role verification: ONLY admins can modify member roles
    const { user: actor } = await requireRole(workspaceId, ["admin"]);

    const adminSb = createAdminClient();

    // 2. Fetch existing membership record to capture diff
    const { data: existing, error: fetchError } = await adminSb
      .from("workspace_members")
      .select("id, role, is_designated_reviewer, user_id")
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Member record not found in this workspace." };
    }

    // 3. Update membership
    const { error: updateError } = await adminSb
      .from("workspace_members")
      .update({
        role,
        is_designated_reviewer: isDesignatedReviewer,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 4. Record 'role_changed' audit event
    await recordAuditEvent({
      workspaceId,
      actorId: actor.id,
      eventType: "role_changed",
      entityType: "workspace_member",
      entityId: memberId,
      payload: {
        target_user_id: existing.user_id,
        previous_role: existing.role,
        new_role: role,
        previous_designated_reviewer: existing.is_designated_reviewer,
        new_designated_reviewer: isDesignatedReviewer,
        changed_by_user_id: actor.id,
      },
      injectedClient: adminSb,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An unexpected error occurred during role change.",
    };
  }
}

/**
 * Removes a member from the workspace.
 * Strictly restricted to workspace 'admin' role via requireRole().
 * Emits an immutable 'member_removed' audit_events record.
 */
export async function removeWorkspaceMemberAction(params: {
  workspaceId: string;
  memberId: string;
}): Promise<MemberActionResult> {
  const { workspaceId, memberId } = params;

  try {
    const { user: actor } = await requireRole(workspaceId, ["admin"]);

    const adminSb = createAdminClient();

    const { data: existing } = await adminSb
      .from("workspace_members")
      .select("id, user_id, role")
      .eq("id", memberId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!existing) {
      return { success: false, error: "Member record not found." };
    }

    const { error: deleteError } = await adminSb
      .from("workspace_members")
      .delete()
      .eq("id", memberId)
      .eq("workspace_id", workspaceId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    await recordAuditEvent({
      workspaceId,
      actorId: actor.id,
      eventType: "member_removed",
      entityType: "workspace_member",
      entityId: memberId,
      payload: {
        removed_user_id: existing.user_id,
        former_role: existing.role,
        removed_by_user_id: actor.id,
      },
      injectedClient: adminSb,
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An error occurred while removing the member.",
    };
  }
}
