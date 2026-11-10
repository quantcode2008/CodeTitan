import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { BrandSubNav } from "@/components/brand/brand-subnav";
import { AssetsManager, BrandAssetRecord } from "@/components/brand/assets-manager";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Brand Assets & Usage Rules — BrandProof",
  description: "Private brand asset registry, alt-text mandates, and locked asset usage guidelines.",
};

export default async function BrandAssetsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/brand/assets");
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

  // 1. Fetch brand assets
  const { data: rawAssets } = await adminSb
    .from("brand_assets")
    .select("id, workspace_id, name, storage_path, alt_text_required, usage_rule, source_id, created_at, brand_sources (source_key, title)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // 2. Fetch signed URLs for each asset
  const assets: BrandAssetRecord[] = await Promise.all(
    (rawAssets || []).map(async (a: any) => {
      let signedUrl: string | null = null;
      if (a.storage_path) {
        try {
          const { data: signed } = await adminSb.storage
            .from("brand-assets")
            .createSignedUrl(a.storage_path, 3600);
          signedUrl = signed?.signedUrl || null;
        } catch {
          signedUrl = null;
        }
      }

      return {
        id: a.id,
        workspace_id: a.workspace_id,
        name: a.name,
        storage_path: a.storage_path,
        alt_text_required: Boolean(a.alt_text_required),
        usage_rule: a.usage_rule,
        source_id: a.source_id,
        source_key: a.brand_sources?.source_key || null,
        created_at: a.created_at,
        signedUrl,
      };
    })
  );

  // 3. Fetch sources for dropdown
  const { data: sourcesList } = await adminSb
    .from("brand_sources")
    .select("id, source_key, title")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("source_key", { ascending: true });

  // 4. Counts for subnav
  const [{ count: sourcesCount }, { count: termsCount }, { count: factsCount }] =
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
    ]);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Brand Pack", href: "/brand" },
        { label: "Brand Assets" },
      ]}
      currentRole={currentRole}
    >
      <BrandSubNav
        currentRole={currentRole}
        counts={{
          sources: sourcesCount || 0,
          terms: termsCount || 0,
          facts: factsCount || 0,
          assets: assets.length,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Private Storage Registry &amp; Compliance Rules
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Brand Assets &amp; Imagery Rules
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Logos, imagery, and lockups kept in encrypted private storage. Displayed strictly through time-limited signed URLs to preserve brand integrity.
          </p>
        </div>

        <AssetsManager
          workspaceId={workspaceId}
          initialAssets={assets}
          sourcesList={sourcesList || []}
          currentRole={currentRole}
        />
      </div>
    </AppShell>
  );
}

