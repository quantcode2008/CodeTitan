"use server";

import { requireSessionUser, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface WorkspaceActionResult {
  success?: boolean;
  error?: string;
  workspaceId?: string;
}

/**
 * Creates a new brand governance workspace.
 * Automatically assigns the creator as the 'admin' of the workspace.
 */
export async function createWorkspaceAction(
  prevState: WorkspaceActionResult | null,
  formData: FormData
): Promise<WorkspaceActionResult> {
  const name = formData.get("name")?.toString().trim();
  const rawSlug = formData.get("slug")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!name) {
    return { error: "Workspace brand name is required." };
  }

  const slug = (rawSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");

  try {
    const user = await requireSessionUser();
    const adminSb = createAdminClient();

    // Check slug uniqueness
    const { data: existing } = await adminSb
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return { error: `Workspace slug "${slug}" is already taken. Please choose another.` };
    }

    // 1. Create workspace
    const { data: workspace, error: wsError } = await adminSb
      .from("workspaces")
      .insert({
        name,
        slug,
        description: description || null,
        created_by: user.id,
      })
      .select("id, name, slug")
      .single();

    if (wsError || !workspace) {
      return { error: wsError?.message || "Failed to create workspace." };
    }

    // 2. Add creator as workspace admin
    const { error: memberError } = await adminSb
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "admin",
        is_designated_reviewer: true,
      });

    if (memberError) {
      console.error("[Workspace Creation Error] Failed to attach admin member:", memberError);
    }

    // 3. Record audit event
    await recordAuditEvent({
      workspaceId: workspace.id,
      actorId: user.id,
      eventType: "workspace_created",
      entityType: "workspace",
      entityId: workspace.id,
      payload: { name, slug, created_by: user.id },
      injectedClient: adminSb,
    });

    revalidatePath("/");
  } catch (err: any) {
    return { error: err.message || "Failed to create workspace." };
  }

  redirect("/");
}

/**
 * Joins an existing workspace by slug.
 */
export async function joinWorkspaceAction(
  prevState: WorkspaceActionResult | null,
  formData: FormData
): Promise<WorkspaceActionResult> {
  const slug = formData.get("slug")?.toString().trim().toLowerCase();

  if (!slug) {
    return { error: "Please provide a workspace slug or code to join." };
  }

  try {
    const user = await requireSessionUser();
    const adminSb = createAdminClient();

    const { data: workspace, error: findError } = await adminSb
      .from("workspaces")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();

    if (findError || !workspace) {
      return { error: `Workspace with slug "${slug}" was not found.` };
    }

    // Join as 'creator' by default
    const { data: member, error: joinError } = await adminSb
      .from("workspace_members")
      .upsert(
        {
          workspace_id: workspace.id,
          user_id: user.id,
          role: "creator",
          is_designated_reviewer: false,
        },
        { onConflict: "workspace_id,user_id" }
      )
      .select("id")
      .single();

    if (joinError || !member) {
      return { error: joinError?.message || "Failed to join workspace." };
    }

    await recordAuditEvent({
      workspaceId: workspace.id,
      actorId: user.id,
      eventType: "member_joined",
      entityType: "workspace_member",
      entityId: member.id,
      payload: { user_id: user.id, role: "creator" },
      injectedClient: adminSb,
    });

    revalidatePath("/");
  } catch (err: any) {
    return { error: err.message || "An unexpected error occurred while joining." };
  }

  redirect("/");
}
