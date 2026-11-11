import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and next/cache for testing server actions in Vitest
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { submitReviewDecisionAction } from "@/lib/actions/review-decision";
import { addCommentAction } from "@/lib/actions/comments";
import * as authServer from "@/lib/auth/server";
import * as adminSupabase from "@/lib/supabase/admin";

describe("Human Review & Approval Workflow (Governance Enforcements)", () => {
  const creatorUser = {
    id: "a0000000-0000-0000-0000-000000000003",
    email: "creator1@asterandpine.demo",
  };

  const standardReviewerUser = {
    id: "a0000000-0000-0000-0000-000000000005",
    email: "reviewer.standard@asterandpine.demo",
  };

  const designatedReviewerUser = {
    id: "a0000000-0000-0000-0000-000000000002",
    email: "marcus.reviewer@asterandpine.demo",
  };

  const adminUser = {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "elena.admin@asterandpine.demo",
  };

  const mockWorkspaceId = "b0000000-0000-0000-0000-000000000001";
  const mockReviewId = "f0000000-0000-0000-0000-000000000001";
  const mockContentItemId = "d0000000-0000-0000-0000-000000000001";

  let recordedAuditEvents: any[] = [];

  function buildMockSupabase(params: {
    draftCreatorId: string;
    currentUserRole: "admin" | "reviewer" | "creator";
    isDesignatedReviewer: boolean;
    findings: any[];
  }) {
    return {
      from: vi.fn((table: string) => {
        if (table === "reviews") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockReviewId,
                status: "ready_for_review",
                content_item_id: mockContentItemId,
                revision_id: "rev-1",
                content_items: {
                  id: mockContentItemId,
                  workspace_id: mockWorkspaceId,
                  title: "SummitX Expedition Pack Copy",
                  created_by: params.draftCreatorId,
                },
              },
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === "findings") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: params.findings,
              error: null,
            }),
          };
        }

        if (table === "workspace_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                role: params.currentUserRole,
                is_designated_reviewer: params.isDesignatedReviewer,
              },
              error: null,
            }),
          };
        }

        if (table === "content_items") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === "comments") {
          return {
            insert: vi.fn((insertPayload: any) => ({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "comm-001",
                    review_id: mockReviewId,
                    finding_id: insertPayload?.finding_id || null,
                    author_id: "any-user",
                    body: insertPayload?.body || "Test comment",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    profiles: {
                      id: "any-user",
                      full_name: "Test Reviewer",
                      avatar_url: null,
                    },
                  },
                  error: null,
                }),
              }),
            })),
          };
        }

        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    } as any;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    recordedAuditEvents = [];

    // Mock recordAuditEvent to record calls in memory
    vi.spyOn(authServer, "recordAuditEvent").mockImplementation(async (params: any) => {
      recordedAuditEvents.push(params);
      return { id: "audit-evt-" + recordedAuditEvents.length } as any;
    });
  });

  it("1. Conflict of Interest: Creator CANNOT approve their own draft", async () => {
    // Current user is the creator of the draft
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(creatorUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id, // match
      currentUserRole: "reviewer", // even if given reviewer role
      isDesignatedReviewer: false,
      findings: [],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    const res = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "approved",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Conflict of Interest: A creator cannot approve their own draft");
  });

  it("2. Level 2 Governance: Non-designated reviewer CANNOT decide draft with critical findings", async () => {
    // Current user is a reviewer WITHOUT designated reviewer flag
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(standardReviewerUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id,
      currentUserRole: "reviewer",
      isDesignatedReviewer: false, // NOT designated
      findings: [
        {
          id: "f-1",
          severity: "critical",
          status: "open",
          evidence_status: "verified",
          requires_designated_reviewer: true,
        },
      ],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    const res = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "approved",
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Level 2 Governance");
    expect(res.error).toContain("requires approval by a Designated Reviewer");
  });

  it("3. Designated Reviewer CAN decide high-risk draft with critical findings", async () => {
    // Current user has is_designated_reviewer = true
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(designatedReviewerUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id,
      currentUserRole: "reviewer",
      isDesignatedReviewer: true, // DESIGNATED
      findings: [
        {
          id: "f-1",
          severity: "critical",
          status: "accepted",
          evidence_status: "verified",
          requires_designated_reviewer: true,
        },
      ],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    const res = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "approved",
      reason: "Verified against claims policy S-002.",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("approved");

    // Verify audit event written
    expect(recordedAuditEvents).toHaveLength(1);
    expect(recordedAuditEvents[0].eventType).toBe("decision_made");
    expect(recordedAuditEvents[0].payload.decision).toBe("approved");
    expect(recordedAuditEvents[0].payload.is_designated_reviewer).toBe(true);
  });

  it("4. Administrator CAN approve draft with critical findings", async () => {
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(adminUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id,
      currentUserRole: "admin",
      isDesignatedReviewer: false,
      findings: [
        {
          id: "f-1",
          severity: "critical",
          status: "accepted",
          evidence_status: "verified",
          requires_designated_reviewer: true,
        },
      ],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    const res = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "approved",
      reason: "Executive sign-off under administrator authority.",
    });

    expect(res.success).toBe(true);
    expect(res.status).toBe("approved");
    expect(recordedAuditEvents[0].eventType).toBe("decision_made");
  });

  it("5. Mandatory Written Reason: Request Changes and Reject REQUIRE an explanation", async () => {
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(designatedReviewerUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id,
      currentUserRole: "reviewer",
      isDesignatedReviewer: true,
      findings: [],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    // Request changes without reason -> fail
    const changesRes = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "changes_requested",
      reason: "   ", // whitespace only
    });
    expect(changesRes.success).toBe(false);
    expect(changesRes.error).toContain("A written reason is required");

    // Reject without reason -> fail
    const rejectRes = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "rejected",
      reason: "",
    });
    expect(rejectRes.success).toBe(false);
    expect(rejectRes.error).toContain("A written reason is required");

    // With reason -> succeed
    const validReject = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "rejected",
      reason: "Unsubstantiated absolute claim violates core truth-in-advertising guidelines.",
    });
    expect(validReject.success).toBe(true);
    expect(validReject.status).toBe("rejected");
  });

  it("6. Explicit Confirmation: Approving unverified critical claims requires explicit confirmation", async () => {
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(designatedReviewerUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id,
      currentUserRole: "reviewer",
      isDesignatedReviewer: true,
      findings: [
        {
          id: "f-unverified-crit",
          severity: "critical",
          status: "open",
          evidence_status: "unverified", // Unverified critical claim
          requires_designated_reviewer: true,
        },
      ],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    // Attempt approve without explicit confirmation -> fail
    const unconfirmedRes = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "approved",
      confirmedUnverifiedCritical: false,
    });
    expect(unconfirmedRes.success).toBe(false);
    expect(unconfirmedRes.error).toContain("Explicit confirmation is required");

    // Attempt approve with confirmation -> succeed
    const confirmedRes = await submitReviewDecisionAction({
      reviewId: mockReviewId,
      decision: "approved",
      confirmedUnverifiedCritical: true,
    });
    expect(confirmedRes.success).toBe(true);
    expect(confirmedRes.status).toBe("approved");
    expect(recordedAuditEvents[0].payload.confirmed_unverified_critical).toBe(true);
  });

  it("7. Comments: adding comment records an immutable audit event", async () => {
    vi.spyOn(authServer, "getSessionUser").mockResolvedValue(designatedReviewerUser as any);

    const mockSb = buildMockSupabase({
      draftCreatorId: creatorUser.id,
      currentUserRole: "reviewer",
      isDesignatedReviewer: true,
      findings: [],
    });
    vi.spyOn(adminSupabase, "createAdminClient").mockReturnValue(mockSb);

    const res = await addCommentAction({
      reviewId: mockReviewId,
      findingId: null,
      body: "Please verify whether 25-Year Gear Promise disclaimer is mandatory here.",
    });

    expect(res.success).toBe(true);
    expect(res.comment?.body).toContain("25-Year Gear Promise");
    expect(recordedAuditEvents.some((e) => e.eventType === "comment_added")).toBe(true);
  });
});
