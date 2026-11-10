import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { BrandSubNav } from "@/components/brand/brand-subnav";
import { FactsTableEditor, BrandFactRecord } from "@/components/brand/facts-table-editor";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Certified Brand Facts — BrandProof",
  description: "Certified company metrics, statistics, and certificate expiration dates.",
};

export default async function BrandFactsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/brand/facts");
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

  // 1. Fetch facts
  const { data: rawFacts } = await adminSb
    .from("brand_facts")
    .select("id, workspace_id, key, value, unit, valid_from, valid_until, source_id, created_at, brand_sources (source_key, title)")
    .eq("workspace_id", workspaceId)
    .order("key", { ascending: true });

  const facts: BrandFactRecord[] = (rawFacts || []).map((f: any) => ({
    id: f.id,
    workspace_id: f.workspace_id,
    key: f.key,
    value: f.value,
    unit: f.unit,
    valid_from: f.valid_from,
    valid_until: f.valid_until,
    source_id: f.source_id,
    source_key: f.brand_sources?.source_key || null,
    created_at: f.created_at,
  }));

  // 2. Fetch sources list for fact dropdown
  const { data: sourcesList } = await adminSb
    .from("brand_sources")
    .select("id, source_key, title")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("source_key", { ascending: true });

  // 3. Counts for subnav
  const [{ count: sourcesCount }, { count: termsCount }, { count: assetsCount }] =
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
        .from("brand_assets")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
    ]);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Brand Pack", href: "/brand" },
        { label: "Certified Facts" },
      ]}
      currentRole={currentRole}
    >
      <BrandSubNav
        currentRole={currentRole}
        counts={{
          sources: sourcesCount || 0,
          terms: termsCount || 0,
          facts: facts.length,
          assets: assetsCount || 0,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Certified Metrics &amp; Stale-Statistic Detection
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Certified Brand Facts Sheet
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Authoritative numbers, environmental percentages, and corporate milestones. Expired certifications trigger governance flags in pre-publication copy.
          </p>
        </div>

        <FactsTableEditor
          workspaceId={workspaceId}
          initialFacts={facts}
          sourcesList={sourcesList || []}
          currentRole={currentRole}
        />
      </div>
    </AppShell>
  );
}

