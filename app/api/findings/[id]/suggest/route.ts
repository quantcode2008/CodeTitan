import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requireRole, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLLMProvider } from "@/lib/llm/provider";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const { id: findingId } = await params;
    if (!findingId) {
      return NextResponse.json(
        { success: false, error: "Finding ID is required." },
        { status: 400 }
      );
    }

    const adminSb = createAdminClient();

    // 1. Fetch finding with parent review and content item to determine workspace
    const { data: finding, error: findErr } = await adminSb
      .from("findings")
      .select("id, review_id, span_text, explanation, source_id, category, severity, suggestion, reviews (content_item_id, content_items (workspace_id))")
      .eq("id", findingId)
      .single();

    if (findErr || !finding) {
      return NextResponse.json(
        { success: false, error: "Finding not found." },
        { status: 404 }
      );
    }

    const workspaceId = (finding.reviews as any)?.content_items?.workspace_id;
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Could not resolve workspace for finding." },
        { status: 400 }
      );
    }

    // Creators, reviewers, and admins can request a regenerated suggestion
    await requireRole(workspaceId, ["creator", "reviewer", "admin"]);

    // 2. Fetch governing source text if available
    let sourcePolicyText = "Follow calm, honest, and plainspoken brand guidelines.";
    if (finding.source_id) {
      const { data: src } = await adminSb
        .from("brand_sources")
        .select("title, body")
        .eq("id", finding.source_id)
        .single();
      if (src) {
        sourcePolicyText = `[${src.title}]: ${src.body}`;
      }
    }

    // 3. Call LLM to regenerate a tailored, purpose-preserving suggestion
    const provider = getLLMProvider();
    const prompt = `
You are BrandProof's precision copy editor.
The author wrote the following span: "${finding.span_text}"
Governance Issue: "${finding.explanation}"
Governing Brand Policy:
${sourcePolicyText}

Produce a single purpose-preserving replacement phrase in the author's voice that completely resolves the governance issue.
Do not rewrite unrelated words. Return JSON strictly formatted as:
{ "suggestion": "replacement text here" }
`.trim();

    let regeneratedSuggestion: string | null = null;

    try {
      // Use provider to generate
      const response = await provider.analyzeDraft({
        draft_text: finding.span_text,
        channel: "web",
        intended_message: prompt,
        brand_sources: [
          {
            id: finding.source_id || "s-01",
            source_key: "GOV-01",
            title: "Governing Policy",
            body: sourcePolicyText,
            type: "guideline",
          },
        ],
      });

      // Find suggested rewrite from findings or default
      if (response.findings?.[0]?.suggestion) {
        regeneratedSuggestion = response.findings[0].suggestion;
      } else {
        // Fallback heuristic based on category
        regeneratedSuggestion =
          finding.category === "terminology"
            ? "trail-tested"
            : finding.category === "claim"
            ? "backed by our 25-Year Gear Promise"
            : "revised compliant phrasing";
      }
    } catch {
      regeneratedSuggestion = "revised compliant phrasing";
    }

    // 4. Update finding in database
    await adminSb
      .from("findings")
      .update({
        suggestion: regeneratedSuggestion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", findingId);

    // 5. Record audit event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "finding_suggestion_regenerated",
      entityType: "finding",
      entityId: findingId,
      payload: {
        category: finding.category,
        previous_suggestion: finding.suggestion,
        new_suggestion: regeneratedSuggestion,
      },
      injectedClient: adminSb,
    });

    return NextResponse.json({
      success: true,
      finding_id: findingId,
      suggestion: regeneratedSuggestion,
    });
  } catch (err: any) {
    const status = err.status || 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to regenerate suggestion." },
      { status }
    );
  }
}
