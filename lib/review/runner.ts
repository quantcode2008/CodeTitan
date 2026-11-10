import { SupabaseClient } from "@supabase/supabase-js";
import { Database, ReviewStatus } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { LLMProvider } from "@/lib/llm/provider";
import { recordAuditEvent } from "@/lib/auth/server";
import { retrieveTrustedContext } from "./context";
import { runRuleLane } from "./rules";
import { runLLMLane } from "./llm-lane";
import { validateAndMergeFindings } from "./merge";
import { ReviewRunResult, ReviewRunSummary } from "./types";

export type ReviewStage =
  | "loading"
  | "retrieving"
  | "rules"
  | "llm"
  | "validating"
  | "persisting"
  | "complete";

export interface RunReviewOptions {
  injectedClient?: SupabaseClient<Database>;
  llmProvider?: LLMProvider;
  referenceDate?: Date;
  actorId?: string;
  onProgress?: (stage: ReviewStage, label: string) => void | Promise<void>;
}

/**
 * Executes the complete layered review pipeline for a content item revision:
 * 1. LOAD: revision text, workspace, channel, intended_message
 * 2. SNAPSHOT: records active source versions into revisions.source_versions_snapshot
 * 3. RETRIEVE: searches and fetches trusted policy context
 * 4. RULE LANE: executes deterministic rule checks with verified exact spans
 * 5. LLM LANE: executes isolated tone & claim analysis with retry & fallback
 * 6. VALIDATE & MERGE: resolves offsets, strips hallucinated citations, deduplicates, gates confidence
 * 7. PERSIST: records review row, findings, updates status (needs_attention / ready_for_review), records audit event
 * 8. RETURN: typed ReviewRunResult with timing
 */
export async function runReview(
  contentItemId: string,
  revisionId: string,
  options: RunReviewOptions = {}
): Promise<ReviewRunResult> {
  const startTime = performance.now();
  const supabase = options.injectedClient || createAdminClient();

  try {
    // -------------------------------------------------------------------------
    // 1. LOAD DRAFT CONTENT & METADATA
    // -------------------------------------------------------------------------
    await options.onProgress?.("loading", "Loading draft copy and workspace metadata...");

    const { data: contentItem, error: itemErr } = await supabase
      .from("content_items")
      .select("id, workspace_id, title, channel, content_type, intended_message, created_by")
      .eq("id", contentItemId)
      .single();

    if (itemErr || !contentItem) {
      throw new Error(`Content item not found: ${itemErr?.message || contentItemId}`);
    }

    const { data: revision, error: revErr } = await supabase
      .from("revisions")
      .select("id, content_item_id, version, body, created_by")
      .eq("id", revisionId)
      .single();

    if (revErr || !revision) {
      throw new Error(`Revision not found: ${revErr?.message || revisionId}`);
    }

    const workspaceId = contentItem.workspace_id;
    const draftText = revision.body || "";

    // -------------------------------------------------------------------------
    // 2. SNAPSHOT ACTIVE SOURCE VERSIONS
    // -------------------------------------------------------------------------
    const { data: activeSources } = await supabase
      .from("brand_sources")
      .select("id, source_key, current_version")
      .eq("workspace_id", workspaceId)
      .eq("status", "active");

    const sourceVersionsSnapshot: Record<string, number> = {};
    if (activeSources) {
      for (const src of activeSources) {
        sourceVersionsSnapshot[src.source_key] = src.current_version;
      }
    }

    // Persist snapshot to revision
    await supabase
      .from("revisions")
      .update({
        source_versions_snapshot: sourceVersionsSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", revisionId);

    // -------------------------------------------------------------------------
    // 3. RETRIEVE TRUSTED CONTEXT
    // -------------------------------------------------------------------------
    await options.onProgress?.("retrieving", "Retrieving sources from brand knowledge base...");

    const retrievedSources = await retrieveTrustedContext(
      supabase,
      workspaceId,
      draftText
    );

    // -------------------------------------------------------------------------
    // 4. RULE LANE (Deterministic Scanners)
    // -------------------------------------------------------------------------
    await options.onProgress?.("rules", "Checking deterministic governance rules...");

    // Fetch active brand_terms and brand_facts
    const [termsRes, factsRes] = await Promise.all([
      supabase
        .from("brand_terms")
        .select("id, term, kind, replacement, severity, source_id, notes, brand_sources(source_key)")
        .eq("workspace_id", workspaceId),
      supabase
        .from("brand_facts")
        .select("id, key, value, unit, valid_from, valid_until, source_id, brand_sources(source_key)")
        .eq("workspace_id", workspaceId),
    ]);

    const terms = (termsRes.data || []).map((t: any) => ({
      id: t.id,
      term: t.term,
      kind: t.kind,
      replacement: t.replacement,
      severity: t.severity,
      source_id: t.source_id,
      source_key: t.brand_sources?.source_key || null,
      notes: t.notes,
    }));

    const facts = (factsRes.data || []).map((f: any) => ({
      id: f.id,
      key: f.key,
      value: f.value,
      unit: f.unit,
      valid_from: f.valid_from,
      valid_until: f.valid_until,
      source_id: f.source_id,
      source_key: f.brand_sources?.source_key || null,
    }));

    const ruleFindings = runRuleLane({
      draftText,
      terms,
      facts,
      sources: retrievedSources,
      referenceDate: options.referenceDate || new Date(),
    });

    // -------------------------------------------------------------------------
    // 5. LLM LANE (Advisory Tone, Meaning & Claims)
    // -------------------------------------------------------------------------
    await options.onProgress?.("llm", "Analysing context and tone...");

    const llmResult = await runLLMLane({
      draftText,
      channel: contentItem.channel,
      intendedMessage: contentItem.intended_message,
      retrievedSources,
      provider: options.llmProvider,
    });

    // -------------------------------------------------------------------------
    // 6. VALIDATE & MERGE FINDINGS
    // -------------------------------------------------------------------------
    await options.onProgress?.("validating", "Validating evidence and citations...");

    const { findings: mergedFindings } = validateAndMergeFindings({
      draftText,
      ruleFindings,
      llmFindings: llmResult.findings,
      retrievedSources,
      adversarialInjectionDetected: llmResult.adversarial_injection_detected,
      injectionFlags: llmResult.injection_flags,
    });

    // -------------------------------------------------------------------------
    // 7. PERSIST REVIEW & FINDINGS
    // -------------------------------------------------------------------------
    await options.onProgress?.("persisting", "Recording review findings and provenance snapshot...");
    // Determine review status: needs_attention if any finding, otherwise ready_for_review.
    // FUNDAMENTAL LAW: A clean scan NEVER equals approved!
    const reviewStatus: ReviewStatus =
      mergedFindings.length > 0 ? "needs_attention" : "ready_for_review";

    // Find or create review record
    let reviewId: string;
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("content_item_id", contentItemId)
      .eq("revision_id", revisionId)
      .limit(1)
      .maybeSingle();

    if (existingReview) {
      reviewId = existingReview.id;
      await supabase
        .from("reviews")
        .update({
          status: reviewStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      // Clear previous findings on this review
      await supabase.from("findings").delete().eq("review_id", reviewId);
    } else {
      const { data: newReview, error: createRevErr } = await supabase
        .from("reviews")
        .insert({
          content_item_id: contentItemId,
          revision_id: revisionId,
          status: reviewStatus,
        })
        .select("id")
        .single();

      if (createRevErr || !newReview) {
        throw new Error(`Failed to create review: ${createRevErr?.message}`);
      }
      reviewId = newReview.id;
    }

    // Persist all merged findings
    if (mergedFindings.length > 0) {
      const findingsToInsert = mergedFindings.map((f) => ({
        review_id: reviewId,
        lane: f.lane,
        category: f.category,
        severity: f.severity,
        span_start: f.span_start,
        span_end: f.span_end,
        span_text: f.span_text,
        explanation: f.explanation,
        source_id: f.source_id,
        source_key: f.source_key,
        evidence_status: f.evidence_status,
        confidence: f.confidence,
        suggestion: f.suggestion,
        status: f.status,
        requires_designated_reviewer: f.requires_designated_reviewer,
      }));

      const { data: insertedFindings, error: insertFindErr } = await supabase
        .from("findings")
        .insert(findingsToInsert)
        .select();

      if (!insertFindErr && insertedFindings) {
        // Assign generated DB IDs back to findings list
        insertedFindings.forEach((row, i) => {
          if (mergedFindings[i]) {
            mergedFindings[i].id = row.id;
            mergedFindings[i].review_id = reviewId;
          }
        });
      }
    }

    const duration = Math.round(performance.now() - startTime);

    // Summary calculation
    const summary: ReviewRunSummary = {
      total: mergedFindings.length,
      rule_count: mergedFindings.filter((f) => f.lane === "rule").length,
      llm_count: mergedFindings.filter((f) => f.lane === "llm").length,
      critical_count: mergedFindings.filter((f) => f.severity === "critical").length,
      major_count: mergedFindings.filter((f) => f.severity === "major").length,
      minor_count: mergedFindings.filter((f) => f.severity === "minor").length,
      advisory_count: mergedFindings.filter((f) => f.severity === "advisory").length,
      requires_designated_reviewer: mergedFindings.some((f) => f.requires_designated_reviewer),
      ai_available: llmResult.ai_available,
      adversarial_injection_detected: llmResult.adversarial_injection_detected,
    };

    // 8. Write Audit Event (NEVER logging raw text)
    const actorId = options.actorId || revision.created_by || "system";
    await recordAuditEvent({
      workspaceId,
      actorId,
      eventType: "review_run",
      entityType: "review",
      entityId: reviewId,
      payload: {
        content_item_id: contentItemId,
        revision_id: revisionId,
        total_findings: summary.total,
        rule_count: summary.rule_count,
        llm_count: summary.llm_count,
        requires_designated_reviewer: summary.requires_designated_reviewer,
        status: reviewStatus,
        source_versions_snapshot: sourceVersionsSnapshot,
        duration_ms: duration,
      },
      injectedClient: supabase,
    });

    await options.onProgress?.("complete", "Review completed.");

    return {
      success: true,
      review_id: reviewId,
      revision_id: revisionId,
      content_item_id: contentItemId,
      status: reviewStatus,
      findings: mergedFindings,
      summary,
      retrieved_sources: retrievedSources,
      source_versions_snapshot: sourceVersionsSnapshot,
      timing_ms: duration,
    };
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    console.error("runReview pipeline error:", err?.message);

    return {
      success: false,
      review_id: "",
      revision_id: revisionId,
      content_item_id: contentItemId,
      status: "needs_attention",
      findings: [],
      summary: {
        total: 0,
        rule_count: 0,
        llm_count: 0,
        critical_count: 0,
        major_count: 0,
        minor_count: 0,
        advisory_count: 0,
        requires_designated_reviewer: false,
        ai_available: false,
        adversarial_injection_detected: false,
      },
      retrieved_sources: [],
      source_versions_snapshot: {},
      timing_ms: duration,
      error: err?.message || "Review pipeline failed",
    };
  }
}
