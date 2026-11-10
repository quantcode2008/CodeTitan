import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/brandproof/app-shell";
import { ReviewsList, ReviewItemSummary } from "@/components/reviews/reviews-list";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Submissions & Reviews — BrandProof",
  description: "Creator draft submissions, automated scans, and governance review status.",
};

export default async function ReviewsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/reviews");
  }

  const adminSb = createAdminClient();

  const { data: membership } = await adminSb
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId =
    membership?.workspace_id || "b0000000-0000-0000-0000-000000000001";
  const currentRole = membership?.role || "creator";

  // Fetch content items with their latest revisions and reviews
  const { data: rawItems } = await adminSb
    .from("content_items")
    .select(`
      id,
      title,
      channel,
      content_type,
      created_at,
      updated_at,
      revisions (id, version, updated_at),
      reviews (
        id,
        status,
        updated_at,
        findings (id, severity, status)
      )
    `)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  const items: ReviewItemSummary[] = (rawItems || []).map((item: any) => {
    // Get latest revision
    const revs = item.revisions || [];
    const latestRev = revs.sort((a: any, b: any) => b.version - a.version)[0];

    // Get latest review
    const rews = item.reviews || [];
    const latestReview = rews.sort(
      (a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];

    // Calculate open findings count by severity
    const allFindings = latestReview?.findings || [];
    const openFindings = allFindings.filter((f: any) => f.status === "open");

    const critical = openFindings.filter((f: any) => f.severity === "critical").length;
    const major = openFindings.filter((f: any) => f.severity === "major").length;
    const minor = openFindings.filter((f: any) => f.severity === "minor").length;
    const advisory = openFindings.filter((f: any) => f.severity === "advisory").length;

    return {
      id: item.id,
      title: item.title,
      channel: item.channel,
      contentType: item.content_type,
      revisionVersion: latestRev?.version || 1,
      reviewId: latestReview?.id,
      status: latestReview?.status || "draft",
      updatedAt: latestReview?.updated_at || item.updated_at,
      openFindingsCount: {
        critical,
        major,
        minor,
        advisory,
        total: openFindings.length,
      },
    };
  });

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Review Desk", href: "/reviews" },
        { label: "Submissions" },
      ]}
      currentRole={currentRole}
    >
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Pre-Publication Governance Intake
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Proofreader&apos;s Review Desk
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            All submitted marketing and product drafts, two-lane governance findings, and human reviewer determination states.
          </p>
        </div>

        <ReviewsList items={items} currentRole={currentRole} />
      </div>
    </AppShell>
  );
}

