import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { BrandSubNav } from "@/components/brand/brand-subnav";
import { GuidelinesImporter } from "@/components/brand/guidelines-importer";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNextKeyIndex } from "@/lib/brand/source-key";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Import Guidelines & Policies — BrandProof",
  description: "Bulk parse markdown guidelines and split into sequential immutable brand sources.",
};

export default async function BrandImportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/brand/import");
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

  // 1. Fetch existing keys to determine next sequential key number
  const { data: existingSources } = await adminSb
    .from("brand_sources")
    .select("source_key")
    .eq("workspace_id", workspaceId);

  const existingKeys = (existingSources || []).map((s) => s.source_key);
  const nextKeyNum = getNextKeyIndex(existingKeys);

  // 2. Counts for subnav
  const [{ count: sourcesCount }, { count: termsCount }, { count: factsCount }, { count: assetsCount }] =
    await Promise.all([
      adminSb
        .from("brand_sources")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      adminSb
        .from("brand_terms")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      adminSb
        .from("brand_facts")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      adminSb
        .from("brand_assets")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Brand Pack", href: "/brand" },
        { label: "Import Guidelines" },
      ]}
      currentRole={currentRole}
    >
      <BrandSubNav
        currentRole={currentRole}
        counts={{
          sources: sourcesCount || 0,
          terms: termsCount || 0,
          facts: factsCount || 0,
          assets: assetsCount || 0,
        }}
      />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Knowledge Base Onboarding &amp; Migration
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Import Brand Guidelines
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Convert monolithic style guides, regulatory handbooks, and Markdown playbooks into atomic, versioned brand sources. Headings are automatically parsed into individual policies with sequential key indexing.
          </p>
        </div>

        <GuidelinesImporter
          workspaceId={workspaceId}
          currentRole={currentRole}
          nextAvailableKeyNumber={nextKeyNum}
        />
      </div>
    </AppShell>
  );
}
