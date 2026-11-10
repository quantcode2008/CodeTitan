export type WorkspaceRole = "admin" | "creator" | "reviewer";

export interface SessionUserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface WorkspaceMembership {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  is_designated_reviewer: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoleCheckResult {
  user: SessionUserProfile;
  membership: WorkspaceMembership;
}

/**
 * Standard typed authentication and authorization errors.
 * Returns HTTP 401 for unauthenticated requests and 403 for unauthorized actions.
 */
export class AuthError extends Error {
  public readonly code: "UNAUTHORIZED" | "FORBIDDEN";
  public readonly statusCode: 401 | 403;

  constructor(code: "UNAUTHORIZED" | "FORBIDDEN", statusCode: 401 | 403, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

