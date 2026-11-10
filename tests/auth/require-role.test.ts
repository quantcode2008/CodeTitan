import { describe, it, expect, vi } from "vitest";
import { requireRole, requireSessionUser } from "@/lib/auth/server";
import { AuthError } from "@/lib/auth/types";

describe("Authentication & Role-Aware Authorization (requireRole)", () => {
  const mockUser = {
    id: "a0000000-0000-0000-0000-000000000003",
    email: "creator1@asterandpine.demo",
    user_metadata: { full_name: "Chloe Bennett" },
  };

  const mockWorkspaceId = "b0000000-0000-0000-0000-000000000001";

  function createMockSupabase(params: {
    authenticatedUser: any | null;
    membership: any | null;
  }) {
    return {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: params.authenticatedUser },
          error: params.authenticatedUser ? null : { message: "No session" },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          return Promise.resolve({
            data: params.membership,
            error: null,
          });
        }),
      }),
    } as any;
  }

  it("1. Denies with 401 UNAUTHORIZED when no authenticated session exists", async () => {
    const client = createMockSupabase({
      authenticatedUser: null,
      membership: null,
    });

    await expect(
      requireSessionUser(client)
    ).rejects.toThrowError(AuthError);

    try {
      await requireRole(mockWorkspaceId, ["creator"], { injectedClient: client });
      expect.fail("Should have thrown 401 AuthError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AuthError);
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe("UNAUTHORIZED");
      expect(err.message).toContain("Authentication required");
    }
  });

  it("2. Denies with 403 FORBIDDEN when user is not a member of the workspace", async () => {
    const client = createMockSupabase({
      authenticatedUser: mockUser,
      membership: null, // No membership record
    });

    try {
      await requireRole(mockWorkspaceId, ["creator", "admin"], {
        injectedClient: client,
      });
      expect.fail("Should have thrown 403 AuthError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AuthError);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("You are not a member");
    }
  });

  it("3. Denies with 403 FORBIDDEN when member role is not in allowedRoles (e.g. creator attempting admin action)", async () => {
    const client = createMockSupabase({
      authenticatedUser: mockUser,
      membership: {
        id: "m-001",
        workspace_id: mockWorkspaceId,
        user_id: mockUser.id,
        role: "creator",
        is_designated_reviewer: false,
      },
    });

    try {
      await requireRole(mockWorkspaceId, ["admin", "reviewer"], {
        injectedClient: client,
      });
      expect.fail("Should have thrown 403 AuthError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AuthError);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("Insufficient permissions");
      expect(err.message).toContain("creator");
    }
  });

  it("4. Denies with 403 FORBIDDEN when action requires designated reviewer authority and member is not designated", async () => {
    const client = createMockSupabase({
      authenticatedUser: {
        id: "a0000000-0000-0000-0000-000000000002",
        email: "reviewer@asterandpine.demo",
      },
      membership: {
        id: "m-002",
        workspace_id: mockWorkspaceId,
        user_id: "a0000000-0000-0000-0000-000000000002",
        role: "reviewer",
        is_designated_reviewer: false, // Standard reviewer, not designated
      },
    });

    try {
      await requireRole(mockWorkspaceId, ["reviewer"], {
        requireDesignatedReviewer: true,
        injectedClient: client,
      });
      expect.fail("Should have thrown 403 AuthError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(AuthError);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe("FORBIDDEN");
      expect(err.message).toContain("requires designated reviewer authority");
    }
  });

  it("5. Allows access when member has required role (admin)", async () => {
    const client = createMockSupabase({
      authenticatedUser: {
        id: "a0000000-0000-0000-0000-000000000001",
        email: "admin@asterandpine.demo",
      },
      membership: {
        id: "m-admin",
        workspace_id: mockWorkspaceId,
        user_id: "a0000000-0000-0000-0000-000000000001",
        role: "admin",
        is_designated_reviewer: false,
      },
    });

    const result = await requireRole(mockWorkspaceId, ["admin"], {
      injectedClient: client,
    });

    expect(result.user.id).toBe("a0000000-0000-0000-0000-000000000001");
    expect(result.membership.role).toBe("admin");
  });

  it("6. Allows access when designated reviewer requirements are satisfied", async () => {
    const client = createMockSupabase({
      authenticatedUser: {
        id: "a0000000-0000-0000-0000-000000000002",
        email: "reviewer@asterandpine.demo",
      },
      membership: {
        id: "m-designated",
        workspace_id: mockWorkspaceId,
        user_id: "a0000000-0000-0000-0000-000000000002",
        role: "reviewer",
        is_designated_reviewer: true,
      },
    });

    const result = await requireRole(mockWorkspaceId, ["reviewer", "admin"], {
      requireDesignatedReviewer: true,
      injectedClient: client,
    });

    expect(result.user.id).toBe("a0000000-0000-0000-0000-000000000002");
    expect(result.membership.role).toBe("reviewer");
    expect(result.membership.is_designated_reviewer).toBe(true);
  });

  it("7. Allows access for creator roles on standard creator endpoints", async () => {
    const client = createMockSupabase({
      authenticatedUser: mockUser,
      membership: {
        id: "m-001",
        workspace_id: mockWorkspaceId,
        user_id: mockUser.id,
        role: "creator",
        is_designated_reviewer: false,
      },
    });

    const result = await requireRole(mockWorkspaceId, ["creator", "admin"], {
      injectedClient: client,
    });

    expect(result.user.id).toBe(mockUser.id);
    expect(result.membership.role).toBe("creator");
  });
});
