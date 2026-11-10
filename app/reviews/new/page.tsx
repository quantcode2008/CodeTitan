import { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/brandproof/app-shell";
import { SubmissionSlip } from "@/components/reviews/submission-slip";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "New Draft Submission — BrandProof",
  description: "Submit a new draft or document for automated brand governance review.",
};

export default async function NewReviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/reviews/new");
  }

  const adminSb = createAdminClient();

  // Fetch workspaces the user is a member of
  const { data: memberships } = await adminSb
    .from("workspace_members")
    .select("workspace_id, role, workspaces (id, name, slug)")
    .eq("user_id", user.id);

  const workspaces = (memberships || [])
    .filter((m) => m.workspaces)
    .map((m: any) => ({
      id: m.workspaces.id,
      name: m.workspaces.name,
      slug: m.workspaces.slug,
    }));

  const activeWorkspaceId =
    workspaces[0]?.id || "b0000000-0000-0000-0000-000000000001";
  const currentRole = memberships?.[0]?.role || "creator";

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Review Desk", href: "/reviews" },
        { label: "New Submission" },
      ]}
      currentRole={currentRole}
    >
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <SubmissionSlip
          workspaces={
            workspaces.length > 0
              ? workspaces
              : [
                  {
                    id: "b0000000-0000-0000-0000-000000000001",
                    name: "Aster & Pine (Demo)",
                    slug: "aster-and-pine",
                  },
                ]
          }
          defaultWorkspaceId={activeWorkspaceId}
        />
      </div>
    </AppShell>
  );
}

