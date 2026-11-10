import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import {
  AuthError,
  SessionUserProfile,
  WorkspaceMembership,
  WorkspaceRole,
  RoleCheckResult,
} from "./types";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

/**
 * Retrieves the currently authenticated user session and their profile.
 * Does NOT throw; returns null if unauthenticated.
 */
export async function getSessionUser(
  injectedClient?: SupabaseClient<Database>
): Promise<SessionUserProfile | null> {
  const supabase = injectedClient ?? (await createServerSupabaseClient());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch linked profile for display details
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: profile?.full_name ?? (user.user_metadata?.full_name as string) ?? null,
    avatar_url: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string) ?? null,
  };
}

/**
 * Requires an active authenticated user session.
 * Throws a typed 401 UNAUTHORIZED AuthError if not logged in.
 */
export async function requireSessionUser(
  injectedClient?: SupabaseClient<Database>
): Promise<SessionUserProfile> {
  const user = await getSessionUser(injectedClient);
  if (!user) {
    throw new AuthError(
      "UNAUTHORIZED",
      401,
      "Authentication required. Please sign in to access this workspace."
    );
  }
  return user;
}

export interface RequireRoleOptions {
  requireDesignatedReviewer?: boolean;
  injectedClient?: SupabaseClient<Database>;
}

/**
 * Core security authorization helper.
 * Enforces workspace membership, role authorization, and optional designated-reviewer requirement.
 * 
 * MUST be invoked at the top of every server action and route handler that mutates data.
 * Throws typed AuthError (401 or 403).
 */
export async function requireRole(
  workspaceId: string,
  allowedRoles: WorkspaceRole[],
  options?: RequireRoleOptions
): Promise<RoleCheckResult> {
  if (!workspaceId) {
    throw new AuthError(
      "FORBIDDEN",
      403,
      "A valid workspace ID is required for role verification."
    );
  }

  const supabase = options?.injectedClient ?? (await createServerSupabaseClient());
  const user = await requireSessionUser(supabase);

  // Query workspace membership
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, is_designated_reviewer, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !membership) {
    throw new AuthError(
      "FORBIDDEN",
      403,
      `Access denied: You are not a member of workspace ${workspaceId}.`
    );
  }

  // Verify role permission
  if (!allowedRoles.includes(membership.role as WorkspaceRole)) {
    throw new AuthError(
      "FORBIDDEN",
      403,
      `Insufficient permissions: Action requires role [${allowedRoles.join(
        ", "
      )}], but your assigned role in this workspace is '${membership.role}'.`
    );
  }

  // Verify designated reviewer requirement if specified
  if (options?.requireDesignatedReviewer && !membership.is_designated_reviewer) {
    throw new AuthError(
      "FORBIDDEN",
      403,
      "Action restricted: This operation requires designated reviewer authority."
    );
  }

  return {
    user,
    membership: {
      id: membership.id,
      workspace_id: membership.workspace_id,
      user_id: membership.user_id,
      role: membership.role as WorkspaceRole,
      is_designated_reviewer: Boolean(membership.is_designated_reviewer),
      created_at: membership.created_at,
      updated_at: membership.updated_at,
    },
  };
}

export interface AuditEventPayload {
  workspaceId: string;
  actorId: string | null;
  eventType: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  injectedClient?: SupabaseClient<Database>;
}

/**
 * Records an immutable audit entry in the workspace audit trail.
 */
export async function recordAuditEvent({
  workspaceId,
  actorId,
  eventType,
  entityType,
  entityId,
  payload = {},
  injectedClient,
}: AuditEventPayload): Promise<void> {
  let supabase = injectedClient;
  if (!supabase) {
    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      supabase = createAdminClient();
    } catch {
      supabase = await createServerSupabaseClient();
    }
  }

  const { error } = await supabase.from("audit_events").insert({
    workspace_id: workspaceId,
    actor_id: actorId,
    event_type: eventType,
    entity_type: entityType,
    entity_id: entityId,
    payload: payload as any,
  });

  if (error) {
    console.error("[Audit Trail Error] Failed to write audit event:", error);
    // Non-fatal for client, but logged for ops
  }
}
