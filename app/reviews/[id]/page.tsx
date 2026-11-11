import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/brandproof/app-shell";
import { ProofreaderDesk } from "@/components/reviews/proofreader-desk";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewFinding } from "@/lib/review/types";
import { BrandSourcePreview } from "@/components/reviews/source-drawer";
import { CommentItem, getCommentsAction } from "@/lib/actions/comments";
import { WorkspaceRole } from "@/lib/auth/types";
import { ReviewStatus } from "@/lib/database.types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Review Desk — BrandProof`,
    description: `Pre-publication governance review workspace for draft ${id}.`,
  };
}

export default async function ReviewDeskPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?returnTo=/reviews/${id}`);
  }

  const adminSb = createAdminClient();

  // 1. Resolve content item (either by content_item id or review id)
  let contentItemId = id;
  let { data: contentItem } = await adminSb
    .from("content_items")
    .select(`
      id,
      title,
      workspace_id,
      channel,
      content_type,
      created_by,
      current_revision_id
    `)
    .eq("id", contentItemId)
    .maybeSingle();

  if (!contentItem) {
    // Try finding by review id
    const { data: revLookup } = await adminSb
      .from("reviews")
      .select("content_item_id")
      .eq("id", id)
      .maybeSingle();

    if (revLookup) {
      contentItemId = revLookup.content_item_id;
      const { data: resolvedItem } = await adminSb
        .from("content_items")
        .select(`
          id,
          title,
          workspace_id,
          channel,
          content_type,
          created_by,
          current_revision_id
        `)
        .eq("id", contentItemId)
        .maybeSingle();

      contentItem = resolvedItem;
    }
  }

  if (!contentItem) {
    notFound();
  }

  const workspaceId = contentItem.workspace_id;

  // 2. Fetch User Workspace Role & Designation
  const { data: member } = await adminSb
    .from("workspace_members")
    .select("role, is_designated_reviewer")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const currentUserRole = (member?.role as WorkspaceRole) || "creator";
  const isDesignatedReviewer = Boolean(member?.is_designated_reviewer);

  // 3. Fetch Revisions (v1 original vs latest working text)
  const { data: revisions } = await adminSb
    .from("revisions")
    .select("id, version, body, source_versions_snapshot, created_at")
    .eq("content_item_id", contentItemId)
    .order("version", { ascending: true });

  const originalRev = revisions?.[0];
  const currentRev = revisions?.[revisions.length - 1] || originalRev;

  const originalText = originalRev?.body || "";
  const workingText = currentRev?.body || "";

  // 4. Fetch Latest Review and Findings
  const { data: reviews } = await adminSb
    .from("reviews")
    .select(`
      id,
      status,
      revision_id,
      decision_reason,
      decided_by,
      decided_at,
      created_at,
      updated_at
    `)
    .eq("content_item_id", contentItemId)
    .order("created_at", { ascending: false });

  const latestReview = reviews?.[0];

  if (!latestReview) {
    return (
      <AppShell currentRole={currentUserRole} isDesignatedReviewer={isDesignatedReviewer}>
        <div className="p-8 text-center text-ink-soft">
          <p>No governance scans recorded for this draft yet.</p>
        </div>
      </AppShell>
    );
  }

  // 5. Fetch Findings
  const { data: rawFindings } = await adminSb
    .from("findings")
    .select(`
      id,
      review_id,
      lane,
      category,
      severity,
      span_start,
      span_end,
      span_text,
      explanation,
      source_id,
      source_key,
      evidence_status,
      confidence,
      suggestion,
      status,
      resolution_note,
      requires_designated_reviewer
    `)
    .eq("review_id", latestReview.id);

  const findings: ReviewFinding[] = (rawFindings || []).map((f: any) => ({
    id: f.id,
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
    confidence: f.confidence !== null && f.confidence !== undefined ? Number(f.confidence) : 1.0,
    suggestion: f.suggestion,
    status: f.status,
    resolution_note: f.resolution_note,
    requires_designated_reviewer: Boolean(f.requires_designated_reviewer),
  }));

  // 6. Fetch Brand Sources for drawer previews
  const sourceIds = Array.from(new Set(findings.map((f) => f.source_id).filter(Boolean))) as string[];
  let brandSourcesMap: Record<string, BrandSourcePreview> = {};

  if (sourceIds.length > 0) {
    const { data: sources } = await adminSb
      .from("brand_sources")
      .select("id, source_key, title, type, body, current_version, status")
      .in("id", sourceIds);

    if (sources) {
      brandSourcesMap = (sources as any[]).reduce((acc, s) => {
        acc[s.id] = {
          id: s.id,
          source_key: s.source_key,
          title: s.title,
          type: s.type,
          body: s.body,
          version: s.current_version,
          status: s.status,
        };
        return acc;
      }, {} as Record<string, BrandSourcePreview>);
    }
  }

  // 7. Fetch Comments
  const commentsRes = await getCommentsAction(latestReview.id);
  const initialComments: CommentItem[] = commentsRes.comments || [];

  return (
    <AppShell
      currentRole={currentUserRole}
      isDesignatedReviewer={isDesignatedReviewer}
      userEmail={user.email || undefined}
      userName={user.email?.split("@")[0]}
      activeWorkspaceId={workspaceId}
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: currentUserRole === "creator" ? "Drafts" : "Review Queue", href: currentUserRole === "creator" ? "/reviews" : "/queue" },
        { label: contentItem.title },
      ]}
    >
      <ProofreaderDesk
        contentItemId={contentItemId}
        reviewId={latestReview.id}
        revisionId={currentRev?.id || latestReview.revision_id}
        initialRevisionVersion={currentRev?.version || 1}
        initialStatus={latestReview.status as ReviewStatus}
        originalText={originalText}
        initialWorkingText={workingText}
        initialFindings={findings}
        brandSourcesMap={brandSourcesMap}
        initialComments={initialComments}
        draftCreatorId={contentItem.created_by || ""}
        currentUserId={user.id}
        currentUserRole={currentUserRole}
        isDesignatedReviewer={isDesignatedReviewer}
        draftTitle={contentItem.title}
        channel={contentItem.channel}
        decisionReason={latestReview.decision_reason}
        decidedBy={latestReview.decided_by}
        decidedAt={latestReview.decided_at}
      />
    </AppShell>
  );
}
