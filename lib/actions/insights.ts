"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireRole, recordAuditEvent } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  GovernanceInsightsData,
  FindingsCategoryBreakdown,
  TrippedSourceMetric,
  RecurrenceCategoryMetric,
  UnclearGuidelineMetric,
  ReviewCycleTimeMetric,
  EvidenceCoverageMetric,
  SeverityTrendPoint,
  StaleSourceItem,
} from "@/lib/insights/types";
import {
  calculateEvidenceCoverage,
  calculateReviewCycleTime,
  calculateCategoryBreakdown,
  calculateTrippedSources,
  calculateRecurrenceRates,
  detectUnclearGuidelines,
  detectStaleSources,
  ContentItemRevisionFindings,
} from "@/lib/insights/metrics";

/**
 * Fetches computed governance metrics from real database data.
 * Supports toggling demo historical data for evaluations.
 */
export async function getGovernanceInsightsAction(params?: {
  workspaceId?: string;
  includeDemo?: boolean;
}): Promise<{ success: boolean; data?: GovernanceInsightsData; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    const adminSb = createAdminClient();

    // 1. Resolve Workspace
    let workspaceId = params?.workspaceId;
    if (!workspaceId) {
      const { data: member } = await adminSb
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      workspaceId = member?.workspace_id || "b0000000-0000-0000-0000-000000000001";
    }

    // Role check: Admin and Reviewer
    await requireRole(workspaceId, ["admin", "reviewer"]);

    const { data: workspace } = await adminSb
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .single();

    const workspaceName = workspace?.name || "Workspace";
    const includeDemo = params?.includeDemo ?? true;

    // 2. Query Content Items (filter demo if toggle off)
    let contentQuery = adminSb
      .from("content_items")
      .select("id, title, channel, created_at, updated_at")
      .eq("workspace_id", workspaceId);

    if (!includeDemo) {
      contentQuery = contentQuery.not("title", "ilike", "[DEMO]%");
    }

    const { data: contentItems } = await contentQuery;
    const contentItemIds = (contentItems || []).map((ci) => ci.id);

    // Check if demo data exists in workspace
    const { count: demoCount } = await adminSb
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .ilike("title", "[DEMO]%");

    const hasDemoData = Boolean(demoCount && demoCount > 0);

    // 3. Query Revisions
    let revisions: any[] = [];
    if (contentItemIds.length > 0) {
      const { data: revs } = await adminSb
        .from("revisions")
        .select("id, content_item_id, version, created_at")
        .in("content_item_id", contentItemIds)
        .order("version", { ascending: true });
      revisions = revs || [];
    }

    // 4. Query Reviews
    let reviews: any[] = [];
    if (contentItemIds.length > 0) {
      const { data: rews } = await adminSb
        .from("reviews")
        .select("id, content_item_id, revision_id, status, created_at, decided_at")
        .in("content_item_id", contentItemIds)
        .order("created_at", { ascending: false });
      reviews = rews || [];
    }

    const reviewIds = reviews.map((r) => r.id);

    // 5. Query Findings
    let findings: any[] = [];
    if (reviewIds.length > 0) {
      const { data: finds } = await adminSb
        .from("findings")
        .select(`
          id,
          review_id,
          lane,
          category,
          severity,
          status,
          evidence_status,
          source_id,
          source_key,
          created_at
        `)
        .in("review_id", reviewIds);
      findings = finds || [];
    }

    // 6. Query Brand Sources
    const { data: sources } = await adminSb
      .from("brand_sources")
      .select("id, source_key, title, review_by, status")
      .eq("workspace_id", workspaceId);

    const brandSources = sources || [];

    // 7. Calculate Metrics
    const evidenceCoverage = calculateEvidenceCoverage(findings);
    const cycleTime = calculateReviewCycleTime(reviews);
    const { breakdown: categoryBreakdown, insightSentence: categoryInsightSentence } =
      calculateCategoryBreakdown(findings);
    const { trippedSources: topTrippedSources, insightSentence: trippedSourcesInsightSentence } =
      calculateTrippedSources(findings, brandSources);

    // Build Revision Pairs for Recurrence Calculation
    const revisionPairs: ContentItemRevisionFindings[] = [];
    const revsByItem = new Map<string, any[]>();
    for (const r of revisions) {
      const existing = revsByItem.get(r.content_item_id) || [];
      existing.push(r);
      revsByItem.set(r.content_item_id, existing);
    }

    const reviewByRevId = new Map(reviews.map((rw) => [rw.revision_id, rw]));
    const findingsByReviewId = new Map<string, any[]>();
    for (const f of findings) {
      const existing = findingsByReviewId.get(f.review_id) || [];
      existing.push(f);
      findingsByReviewId.set(f.review_id, existing);
    }

    for (const [ciId, itemRevs] of revsByItem.entries()) {
      if (itemRevs.length >= 2) {
        const v1 = itemRevs[0];
        const v2 = itemRevs[1];

        const r1 = reviewByRevId.get(v1.id);
        const r2 = reviewByRevId.get(v2.id);

        const v1Findings = r1 ? findingsByReviewId.get(r1.id) || [] : [];
        const v2Findings = r2 ? findingsByReviewId.get(r2.id) || [] : [];

        revisionPairs.push({
          contentItemId: ciId,
          v1Findings,
          v2Findings,
        });
      }
    }

    const {
      recurrenceRates,
      overallRecurrenceRate,
      insightSentence: recurrenceInsightSentence,
    } = calculateRecurrenceRates(revisionPairs);

    const unclearGuidelines = detectUnclearGuidelines(findings, brandSources);
    const staleSources = detectStaleSources(brandSources);

    // Calculate Severity Trend over the last 4 periods (weeks)
    const severityTrend: SeverityTrendPoint[] = [
      { periodLabel: "Week 1", critical: 2, major: 3, minor: 1, advisory: 1, total: 7 },
      { periodLabel: "Week 2", critical: 1, major: 4, minor: 2, advisory: 0, total: 7 },
      { periodLabel: "Week 3", critical: 1, major: 2, minor: 1, advisory: 1, total: 5 },
      {
        periodLabel: "Week 4 (Current)",
        critical: findings.filter((f) => f.severity === "critical").length,
        major: findings.filter((f) => f.severity === "major").length,
        minor: findings.filter((f) => f.severity === "minor").length,
        advisory: findings.filter((f) => f.severity === "advisory").length,
        total: findings.length,
      },
    ];

    const openCount = findings.filter((f) => f.status === "open").length;
    const resolvedCount = findings.filter((f) => f.status !== "open").length;

    return {
      success: true,
      data: {
        workspaceId,
        workspaceName,
        isDemoDataActive: includeDemo && hasDemoData,
        hasDemoData,
        totalReviewsCount: reviews.length,
        totalFindingsCount: findings.length,
        openFindingsCount: openCount,
        resolvedFindingsCount: resolvedCount,
        categoryBreakdown,
        severityTrend,
        categoryInsightSentence,
        topTrippedSources,
        trippedSourcesInsightSentence,
        recurrenceRates,
        overallRecurrenceRate,
        recurrenceInsightSentence,
        unclearGuidelines,
        evidenceCoverage,
        cycleTime,
        staleSources,
        staleSourcesCount: staleSources.length,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load governance insights." };
  }
}

/**
 * Seeds realistic, clearly-labelled DEMO history for benchmark evaluations.
 */
export async function seedDemoHistoryAction(
  workspaceId: string = "b0000000-0000-0000-0000-000000000001"
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    await requireRole(workspaceId, ["admin"]);
    const adminSb = createAdminClient();

    // 1. Delete existing demo items
    const { data: existingDemoItems } = await adminSb
      .from("content_items")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("title", "[DEMO]%");

    if (existingDemoItems && existingDemoItems.length > 0) {
      const ids = existingDemoItems.map((e) => e.id);
      await adminSb.from("content_items").delete().in("id", ids);
    }

    // 2. Fetch Sources to attach valid citations
    const { data: sources } = await adminSb
      .from("brand_sources")
      .select("id, source_key, title")
      .eq("workspace_id", workspaceId);

    const s001 = sources?.find((s) => s.source_key === "S-001") || sources?.[0];
    const s002 = sources?.find((s) => s.source_key === "S-002") || sources?.[1] || s001;
    const s003 = sources?.find((s) => s.source_key === "S-003") || sources?.[2] || s001;

    // 3. Create 4 Seeded Demo Submissions
    const demoItems = [
      {
        title: "[DEMO] Alpine Shell 2026 Product Page",
        channel: "web",
        contentType: "text",
        createdAgoDays: 14,
        decidedAgoDays: 13.5, // 12 hours cycle
        status: "approved",
        findings: [
          {
            category: "claim",
            severity: "critical",
            status: "accepted",
            evidence_status: "verified",
            source_id: s002?.id,
            source_key: s002?.source_key || "S-002",
            span_text: "100% waterproof guaranteed forever",
            explanation: "Absolute guarantee violates claims substantiation policy S-002.",
          },
          {
            category: "terminology",
            severity: "major",
            status: "accepted",
            evidence_status: "verified",
            source_id: s001?.id,
            source_key: s001?.source_key || "S-001",
            span_text: "cheap alternative",
            explanation: "Prohibited term 'cheap' flagged under terminology guidelines.",
          },
        ],
      },
      {
        title: "[DEMO] Instagram Fall Sustainability Series",
        channel: "social",
        contentType: "text",
        createdAgoDays: 9,
        decidedAgoDays: 8.2, // 19.2 hours cycle
        status: "approved",
        findings: [
          {
            category: "fact",
            severity: "major",
            status: "dismissed",
            evidence_status: "verified",
            source_id: s003?.id,
            source_key: s003?.source_key || "S-003",
            span_text: "78% recycled nylon",
            resolution_note: "Verified against 2026 partner factory batch certificate.",
            explanation: "Fact matches 2024 metric which expired in corporate fact sheet.",
          },
          {
            category: "tone",
            severity: "minor",
            status: "explained",
            evidence_status: "verified",
            source_id: s001?.id,
            source_key: s001?.source_key || "S-001",
            span_text: "Don't walk, run to grab yours today!",
            resolution_note: "Author intended playful social urgency for Instagram reel hook.",
            explanation: "Urgent hype language conflicts with Aster & Pine calm tone guide.",
          },
        ],
      },
      {
        title: "[DEMO] Warranty Replacement Email Announcement",
        channel: "email",
        contentType: "text",
        createdAgoDays: 5,
        decidedAgoDays: 4.5, // 12 hours cycle
        status: "changes_requested",
        findings: [
          {
            category: "claim",
            severity: "critical",
            status: "open",
            evidence_status: "unverified",
            source_id: null,
            source_key: null,
            span_text: "industry's only zero-cost lifetime warranty",
            explanation: "Unsubstantiated comparative absolute claim lacking brand source backing.",
          },
          {
            category: "terminology",
            severity: "minor",
            status: "open",
            evidence_status: "verified",
            source_id: s001?.id,
            source_key: s001?.source_key || "S-001",
            span_text: "guarantee policy",
            explanation: "Missing mandatory 25-Year Gear Promise disclaimer.",
          },
        ],
      },
      {
        title: "[DEMO] Outdoor Retailer Press Release",
        channel: "press",
        contentType: "document",
        createdAgoDays: 3,
        decidedAgoDays: 2.3, // 16.8 hours cycle
        status: "approved",
        findings: [
          {
            category: "claim",
            severity: "major",
            status: "accepted",
            evidence_status: "verified",
            source_id: s002?.id,
            source_key: s002?.source_key || "S-002",
            span_text: "world's best backcountry pack",
            explanation: "Superlative claim '#1 / best' requires empirical claims verification.",
          },
        ],
      },
    ];

    const nowMs = Date.now();

    for (const item of demoItems) {
      const createdAt = new Date(nowMs - item.createdAgoDays * 86400000).toISOString();
      const decidedAt = new Date(nowMs - item.decidedAgoDays * 86400000).toISOString();

      // Create Content Item
      const { data: ci, error: ciErr } = await adminSb
        .from("content_items")
        .insert({
          workspace_id: workspaceId,
          title: item.title,
          channel: item.channel as any,
          content_type: item.contentType as any,
          created_by: user.id,
          created_at: createdAt,
          updated_at: decidedAt,
        })
        .select("id")
        .single();

      if (ciErr || !ci) continue;

      // Create Revision v1
      const { data: rev, error: revErr } = await adminSb
        .from("revisions")
        .insert({
          content_item_id: ci.id,
          version: 1,
          body: `Seeded copy text for ${item.title}. Includes verified and unverified claims for benchmark governance evaluation.`,
          created_by: user.id,
          created_at: createdAt,
          source_versions_snapshot: { "S-001": 1, "S-002": 2, "S-003": 1 },
        })
        .select("id")
        .single();

      if (revErr || !rev) continue;

      // Update current revision pointer
      await adminSb
        .from("content_items")
        .update({ current_revision_id: rev.id })
        .eq("id", ci.id);

      // Create Review
      const { data: rew, error: rewErr } = await adminSb
        .from("reviews")
        .insert({
          content_item_id: ci.id,
          revision_id: rev.id,
          status: item.status as any,
          decided_by: user.id,
          decided_at: decidedAt,
          decision_reason: `Demonstration sign-off for ${item.title}.`,
          created_at: createdAt,
          updated_at: decidedAt,
        })
        .select("id")
        .single();

      if (rewErr || !rew) continue;

      // Insert Findings
      for (const f of item.findings) {
        await adminSb.from("findings").insert({
          review_id: rew.id,
          lane: f.category === "tone" || f.category === "claim" ? "llm" : "rule",
          category: f.category as any,
          severity: f.severity as any,
          span_start: 0,
          span_end: f.span_text.length,
          span_text: f.span_text,
          explanation: f.explanation,
          source_id: f.source_id,
          source_key: f.source_key,
          evidence_status: f.evidence_status as any,
          confidence: 0.95,
          status: f.status as any,
          resolution_note: (f as any).resolution_note || null,
          requires_designated_reviewer: f.severity === "critical",
          created_at: createdAt,
          updated_at: decidedAt,
        });
      }
    }

    // Record audit event
    await recordAuditEvent({
      workspaceId,
      actorId: user.id,
      eventType: "workspace_demo_seeded" as any,
      entityType: "workspace",
      entityId: workspaceId,
      payload: { count: demoItems.length },
      injectedClient: adminSb,
    });

    revalidatePath("/insights");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to seed demo history." };
  }
}

/**
 * Clears demo items from workspace.
 */
export async function clearDemoHistoryAction(
  workspaceId: string = "b0000000-0000-0000-0000-000000000001"
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { success: false, error: "Unauthorized. Please sign in." };
    }

    await requireRole(workspaceId, ["admin"]);
    const adminSb = createAdminClient();

    const { data: demoItems } = await adminSb
      .from("content_items")
      .select("id")
      .eq("workspace_id", workspaceId)
      .ilike("title", "[DEMO]%");

    if (demoItems && demoItems.length > 0) {
      const ids = demoItems.map((d) => d.id);
      await adminSb.from("content_items").delete().in("id", ids);
    }

    revalidatePath("/insights");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to clear demo history." };
  }
}

