import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { BrandSubNav } from "@/components/brand/brand-subnav";
import { TermsTableEditor, BrandTermRecord } from "@/components/brand/terms-table-editor";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Brand Terminology Dictionary — BrandProof",
  description: "Prohibited and preferred terminology rules, automated replacements, and severity levels.",
};

export default async function BrandTermsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/brand/terms");
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

  // 1. Fetch terms with linked source keys
  const { data: rawTerms } = await adminSb
    .from("brand_terms")
    .select("id, workspace_id, term, kind, replacement, severity, source_id, notes, created_at, brand_sources (source_key, title)")
    .eq("workspace_id", workspaceId)
    .order("term", { ascending: true });

  const terms: BrandTermRecord[] = (rawTerms || []).map((t: any) => ({
    id: t.id,
    workspace_id: t.workspace_id,
    term: t.term,
    kind: t.kind,
    replacement: t.replacement,
    severity: t.severity,
    source_id: t.source_id,
    source_key: t.brand_sources?.source_key || null,
    notes: t.notes,
    created_at: t.created_at,
  }));

  // 2. Fetch sources list for term creation dropdown
  const { data: sourcesList } = await adminSb
    .from("brand_sources")
    .select("id, source_key, title")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("source_key", { ascending: true });

  // 3. Counts for subnav
  const [{ count: sourcesCount }, { count: factsCount }, { count: assetsCount }] =
    await Promise.all([
      adminSb
        .from("brand_sources")
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
        { label: "Terminology" },
      ]}
      currentRole={currentRole}
    >
      <BrandSubNav
        currentRole={currentRole}
        counts={{
          sources: sourcesCount || 0,
          terms: terms.length,
          facts: factsCount || 0,
          assets: assetsCount || 0,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Deterministic Vocabulary Enforcement
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Brand Terminology &amp; Nomenclature Dictionary
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Exact word boundaries scanned during Lane 1 execution. Prohibited words flag violations with non-destructive replacement suggestions.
          </p>
        </div>

        <TermsTableEditor
          workspaceId={workspaceId}
          initialTerms={terms}
          sourcesList={sourcesList || []}
          currentRole={currentRole}
        />
      </div>
    </AppShell>
  );
}

