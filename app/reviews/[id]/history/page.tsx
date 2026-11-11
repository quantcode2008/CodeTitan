import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/brandproof/app-shell";
import { ReviewHistory, AuditEventItem, RevisionSnapshot } from "@/components/reviews/review-history";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceRole } from "@/lib/auth/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Audit History — BrandProof`,
    description: `Full immutable audit ledger and revision provenance for draft ${id}.`,
  };
}

export default async function HistoryPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?returnTo=/reviews/${id}/history`);
  }

  const adminSb = createAdminClient();

  // 1. Resolve content item (either by content_item id or review id)
  let contentItemId = id;
  let { data: contentItem } = await adminSb
    .from("content_items")
    .select("id, title, workspace_id, channel, created_by")
    .eq("id", contentItemId)
    .maybeSingle();

  if (!contentItem) {
    const { data: revLookup } = await adminSb
      .from("reviews")
      .select("content_item_id")
      .eq("id", id)
      .maybeSingle();

    if (revLookup) {
      contentItemId = revLookup.content_item_id;
      const { data: resolvedItem } = await adminSb
        .from("content_items")
        .select("id, title, workspace_id, channel, created_by")
        .eq("id", contentItemId)
        .maybeSingle();

      contentItem = resolvedItem;
    }
  }

  if (!contentItem) {
    notFound();
  }

  const workspaceId = contentItem.workspace_id;

  // 2. Fetch User Workspace Role
  const { data: member } = await adminSb
    .from("workspace_members")
    .select("role, is_designated_reviewer")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  const currentUserRole = (member?.role as WorkspaceRole) || "creator";
  const isDesignatedReviewer = Boolean(member?.is_designated_reviewer);

  // 3. Fetch Revisions
  const { data: rawRevisions } = await adminSb
    .from("revisions")
    .select("id, version, body, source_versions_snapshot, created_at, created_by")
    .eq("content_item_id", contentItemId)
    .order("version", { ascending: true });

  const revisions: RevisionSnapshot[] = (rawRevisions || []).map((r: any) => ({
    id: r.id,
    version: r.version,
    body: r.body,
    sourceVersionsSnapshot: (r.source_versions_snapshot as Record<string, number>) || {},
    createdAt: r.created_at,
  }));

  // 4. Fetch Reviews to obtain review IDs for audit querying
  const { data: reviews } = await adminSb
    .from("reviews")
    .select("id")
    .eq("content_item_id", contentItemId);

  const reviewIds = (reviews || []).map((r: any) => r.id);

  // 5. Fetch Audit Events for this content item and reviews
  const { data: rawEvents } = await adminSb
    .from("audit_events")
    .select(`
      id,
      event_type,
      entity_type,
      entity_id,
      payload,
      created_at,
      actor:actor_id (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // Filter events related to this content_item or its reviews
  const relevantEvents = (rawEvents || []).filter((e: any) => {
    if (e.entity_id === contentItemId) return true;
    if (e.entity_id && reviewIds.includes(e.entity_id)) return true;
    if (e.payload?.content_item_id === contentItemId) return true;
    if (e.payload?.review_id && reviewIds.includes(e.payload.review_id)) return true;
    return false;
  });

  const events: AuditEventItem[] = relevantEvents.map((e: any) => {
    const actor = e.actor;
    return {
      id: e.id,
      eventType: e.event_type,
      entityType: e.entity_type,
      entityId: e.entity_id,
      payload: e.payload || {},
      createdAt: e.created_at,
      actor: {
        id: actor?.id || e.actor_id || "system",
        fullName: actor?.full_name || "Governance System",
        avatarUrl: actor?.avatar_url || null,
      },
    };
  });

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
        { label: contentItem.title, href: `/reviews/${contentItemId}` },
        { label: "Audit History" },
      ]}
    >
      <ReviewHistory
        contentItemId={contentItemId}
        draftTitle={contentItem.title}
        channel={contentItem.channel}
        revisions={revisions}
        events={events}
      />
    </AppShell>
  );
}
