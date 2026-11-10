import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { BrandSubNav } from "@/components/brand/brand-subnav";
import { SourcesList, SourceRow } from "@/components/brand/sources-list";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Brand Sources & Policies — BrandProof",
  description: "Controlled brand knowledge base sources, claims policies, and search.",
};

export default async function BrandSourcesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/brand/sources");
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

  // Fetch sources with profile owner names
  const { data: rawSources } = await adminSb
    .from("brand_sources")
    .select(
      "id, source_key, type, title, body, owner_id, review_by, status, current_version, tags, updated_at, profiles (full_name)"
    )
    .eq("workspace_id", workspaceId)
    .order("source_key", { ascending: true });

  const sources: SourceRow[] = (rawSources || []).map((s: any) => ({
    id: s.id,
    source_key: s.source_key,
    type: s.type,
    title: s.title,
    body: s.body,
    owner_id: s.owner_id,
    owner_name: s.profiles?.full_name || "Brand Operations",
    review_by: s.review_by,
    status: s.status,
    current_version: s.current_version,
    tags: s.tags || [],
    updated_at: s.updated_at,
  }));

  // Fetch counts for subnav
  const [{ count: termsCount }, { count: factsCount }, { count: assetsCount }] =
    await Promise.all([
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
        { label: "Sources & Policies" },
      ]}
      currentRole={currentRole}
    >
      <BrandSubNav
        currentRole={currentRole}
        counts={{
          sources: sources.length,
          terms: termsCount || 0,
          facts: factsCount || 0,
          assets: assetsCount || 0,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Knowledge Base Catalog
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Brand Sources &amp; Governance Policies
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Authoritative documents referenced during pre-publication proofreading. Each source key is immutable and permanently auditable.
          </p>
        </div>

        <SourcesList
          workspaceId={workspaceId}
          initialSources={sources}
          currentRole={currentRole}
        />
      </div>
    </AppShell>
  );
}
