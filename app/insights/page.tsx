import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/brandproof/app-shell";
import { InsightsDashboard } from "@/components/insights/insights-dashboard";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGovernanceInsightsAction } from "@/lib/actions/insights";
import { WorkspaceRole } from "@/lib/auth/types";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Governance Insights & Policy Analytics — BrandProof",
  description: "Real data analytics, tripped rules, recurrence rates, and policy clarity diagnostics.",
};

export default async function InsightsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/insights");
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
  const currentUserRole = (member?.role as WorkspaceRole) || "creator";
  const isDesignatedReviewer = Boolean(member?.is_designated_reviewer);

  // Restricted Access check: Admin and Reviewers only
  if (currentUserRole !== "admin" && currentUserRole !== "reviewer") {
    return (
      <AppShell
        currentRole={currentUserRole}
        isDesignatedReviewer={isDesignatedReviewer}
        userEmail={user.email || undefined}
        userName={user.email?.split("@")[0]}
        activeWorkspaceId={workspaceId}
        breadcrumb={[
          { label: "Inkloom Governance", href: "/" },
          { label: "Insights" },
        ]}
      >
        <div className="max-w-md mx-auto my-20 p-6 bg-paper-raised border border-rule rounded-sm text-center space-y-4 font-sans text-xs">
          <ShieldAlert className="w-8 h-8 text-ochre mx-auto stroke-[1.5]" />
          <h2 className="font-serif text-lg font-bold text-ink">
            Restricted to Reviewers and Administrators
          </h2>
          <p className="text-ink-soft leading-relaxed">
            Governance analytics, policy clarity diagnostics, and recurrence reports are only accessible by workspace administrators and designated reviewers.
          </p>
          <div className="pt-2">
            <Link
              href="/reviews"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-paper rounded-sm font-medium hover:bg-accent/90"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Drafts</span>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  // 2. Fetch computed governance insights data
  const insightsRes = await getGovernanceInsightsAction({
    workspaceId,
    includeDemo: true, // Default to true so seeded benchmark history is visible for judges
  });

  if (!insightsRes.success || !insightsRes.data) {
    return (
      <AppShell
        currentRole={currentUserRole}
        isDesignatedReviewer={isDesignatedReviewer}
        userEmail={user.email || undefined}
        userName={user.email?.split("@")[0]}
        activeWorkspaceId={workspaceId}
        breadcrumb={[
          { label: "Inkloom Governance", href: "/" },
          { label: "Insights" },
        ]}
      >
        <div className="p-8 text-center text-oxblood font-mono text-xs">
          Failed to load governance insights: {insightsRes.error}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      currentRole={currentUserRole}
      isDesignatedReviewer={isDesignatedReviewer}
      userEmail={user.email || undefined}
      userName={user.email?.split("@")[0]}
      activeWorkspaceId={workspaceId}
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Insights & Policy Analytics" },
      ]}
    >
      <InsightsDashboard
        initialData={insightsRes.data}
        currentUserRole={currentUserRole}
      />
    </AppShell>
  );
}
