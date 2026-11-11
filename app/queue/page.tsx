import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/brandproof/app-shell";
import { ReviewerQueue, QueueItem } from "@/components/reviews/reviewer-queue";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceRole } from "@/lib/auth/types";
import { ReviewStatus, SeverityLevel } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Review Queue — BrandProof",
  description: "Prioritised human governance review backlog ordered by risk severity and queue age.",
};

export default async function QueuePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/queue");
  }

  const adminSb = createAdminClient();

  // 1. Fetch user membership
  const { data: member } = await adminSb
    .from("workspace_members")
    .select("workspace_id, role, is_designated_reviewer")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId = member?.workspace_id || "b0000000-0000-0000-0000-000000000001";
  const currentUserRole = (member?.role as WorkspaceRole) || "reviewer";
  const isDesignatedReviewer = Boolean(member?.is_designated_reviewer);

  // 2. Fetch Content Items in Workspace
  const { data: rawItems } = await adminSb
    .from("content_items")
    .select(`
      id,
      title,
      channel,
      content_type,
      created_by,
      created_at,
      updated_at,
      profiles:created_by (
        id,
        full_name,
        avatar_url
      ),
      revisions (
        id,
        version,
        created_at
      ),
      reviews (
        id,
        status,
        created_at,
        updated_at,
        findings (
          id,
          severity,
          status,
          requires_designated_reviewer
        )
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // 3. Format into QueueItems
  const queueItems: QueueItem[] = (rawItems || []).map((item: any) => {
    const revs = item.revisions || [];
    const latestRev = revs.sort((a: any, b: any) => b.version - a.version)[0];

    const rews = item.reviews || [];
    const latestReview = rews.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    const allFindings = latestReview?.findings || [];
    const openFindings = allFindings.filter((f: any) => f.status === "open");

    const critical = openFindings.filter((f: any) => f.severity === "critical").length;
    const major = openFindings.filter((f: any) => f.severity === "major").length;
    const minor = openFindings.filter((f: any) => f.severity === "minor").length;
    const advisory = openFindings.filter((f: any) => f.severity === "advisory").length;

    let highestSeverity: SeverityLevel | "none" = "none";
    if (critical > 0) highestSeverity = "critical";
    else if (major > 0) highestSeverity = "major";
    else if (minor > 0) highestSeverity = "minor";
    else if (advisory > 0) highestSeverity = "advisory";

    const requiresDesignated =
      critical > 0 ||
      allFindings.some((f: any) => f.requires_designated_reviewer);

    return {
      id: item.id,
      reviewId: latestReview?.id || "",
      title: item.title,
      channel: item.channel,
      contentType: item.content_type,
      status: (latestReview?.status as ReviewStatus) || "draft",
      version: latestRev?.version || 1,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      creator: {
        id: item.created_by,
        fullName: item.profiles?.full_name || "Unknown Creator",
        avatarUrl: item.profiles?.avatar_url || null,
      },
      openCounts: {
        critical,
        major,
        minor,
        advisory,
        total: openFindings.length,
      },
      requiresDesignatedReviewer: requiresDesignated,
      highestSeverity,
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
        { label: "Review Queue" },
      ]}
    >
      <ReviewerQueue
        items={queueItems}
        currentUserRole={currentUserRole}
        isDesignatedReviewer={isDesignatedReviewer}
        currentUserId={user.id}
      />
    </AppShell>
  );
}
