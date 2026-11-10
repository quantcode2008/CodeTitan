import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, requireRole } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReview } from "@/lib/review";

const RunReviewPayloadSchema = z.object({
  contentItemId: z.string().uuid("Invalid content item UUID"),
  revisionId: z.string().uuid("Invalid revision UUID"),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user session
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Rate-limit: max 10 review runs per minute per user
    const rateLimit = checkRateLimit(`review-run:${user.id}`, {
      windowMs: 60_000,
      maxRequests: 10,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Maximum 10 automated scans per minute. Try again in ${Math.ceil(
            rateLimit.resetMs / 1000
          )} seconds.`,
        },
        { status: 429 }
      );
    }

    // 3. Validate request payload
    const body = await req.json();
    const parsed = RunReviewPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { contentItemId, revisionId } = parsed.data;
    const adminSb = createAdminClient();

    // 4. Role check: Verify content item existence & user role on workspace
    const { data: item, error: itemErr } = await adminSb
      .from("content_items")
      .select("workspace_id, created_by")
      .eq("id", contentItemId)
      .single();

    if (itemErr || !item) {
      return NextResponse.json(
        { success: false, error: "Content item not found." },
        { status: 404 }
      );
    }

    // Require creator or admin role on the item's workspace
    await requireRole(item.workspace_id, ["creator", "admin"]);

    // 5. Execute layered review pipeline
    const result = await runReview(contentItemId, revisionId, {
      actorId: user.id,
      injectedClient: adminSb,
    });

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to run review." },
      { status }
    );
  }
}
