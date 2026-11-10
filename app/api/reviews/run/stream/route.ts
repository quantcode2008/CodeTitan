import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser, requireRole } from "@/lib/auth/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { runReview, ReviewStage } from "@/lib/review";

const RunReviewPayloadSchema = z.object({
  contentItemId: z.string().uuid("Invalid content item UUID"),
  revisionId: z.string().uuid("Invalid revision UUID"),
});

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  // 1. Authenticate user
  const user = await getSessionUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized. Please sign in." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Rate-limit check
  const rateLimit = checkRateLimit(`review-run:${user.id}`, {
    windowMs: 60_000,
    maxRequests: 10,
  });

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: `Rate limit exceeded. Maximum 10 automated scans per minute. Try again in ${Math.ceil(
          rateLimit.resetMs / 1000
        )} seconds.`,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // 3. Parse and validate body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = RunReviewPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "Invalid payload", details: parsed.error.format() }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { contentItemId, revisionId } = parsed.data;
  const adminSb = createAdminClient();

  // 4. Role check
  const { data: item, error: itemErr } = await adminSb
    .from("content_items")
    .select("workspace_id, created_by")
    .eq("id", contentItemId)
    .single();

  if (itemErr || !item) {
    return new Response(JSON.stringify({ error: "Content item not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await requireRole(item.workspace_id, ["creator", "admin"]);
  } catch (authErr: any) {
    return new Response(JSON.stringify({ error: authErr.message || "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 5. Create streaming response driven by real review stages
  const stream = new ReadableStream({
    async start(controller) {
      function sendEvent(payload: {
        stage: ReviewStage;
        label: string;
        result?: any;
        error?: string;
      }) {
        const msg = `data: ${JSON.stringify(payload)}\n\n`;
        controller.enqueue(encoder.encode(msg));
      }

      try {
        const result = await runReview(contentItemId, revisionId, {
          actorId: user.id,
          injectedClient: adminSb,
          onProgress: (stage: ReviewStage, label: string) => {
            sendEvent({ stage, label });
          },
        });

        sendEvent({
          stage: "complete",
          label: "Review completed.",
          result,
        });

        controller.close();
      } catch (err: any) {
        sendEvent({
          stage: "complete",
          label: "Review encountered an error.",
          error: err?.message || "Execution failure",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

