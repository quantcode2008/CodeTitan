import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { SourceReadingView, SourceDetailData, VersionItem } from "@/components/brand/source-reading-view";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";

export interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const adminSb = createAdminClient();
  const { data: source } = await adminSb
    .from("brand_sources")
    .select("title, source_key")
    .eq("id", id)
    .maybeSingle();

  if (!source) {
    return { title: "Brand Source Not Found — BrandProof" };
  }

  return {
    title: `[${source.source_key}] ${source.title} — BrandProof`,
  };
}

export default async function BrandSourceDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?returnTo=/brand/sources/${id}`);
  }

  const adminSb = createAdminClient();

  // Get user role in workspace
  const { data: membership } = await adminSb
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const currentRole = membership?.role || "creator";

  // 1. Fetch Source
  const { data: rawSource } = await adminSb
    .from("brand_sources")
    .select(
      "id, workspace_id, source_key, type, title, body, owner_id, review_by, status, current_version, tags, updated_at, profiles (full_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!rawSource) {
    notFound();
  }

  const source: SourceDetailData = {
    id: rawSource.id,
    workspace_id: rawSource.workspace_id,
    source_key: rawSource.source_key,
    type: rawSource.type,
    title: rawSource.title,
    body: rawSource.body,
    review_by: rawSource.review_by,
    status: rawSource.status,
    current_version: rawSource.current_version,
    tags: rawSource.tags || [],
    updated_at: rawSource.updated_at,
    owner_name: (rawSource as any).profiles?.full_name || "Brand Operations",
  };

  // 2. Fetch Versions History
  const { data: rawVersions } = await adminSb
    .from("brand_source_versions")
    .select("id, version, title, body, change_note, created_at, changed_by, profiles (full_name)")
    .eq("source_id", id)
    .order("version", { ascending: false });

  const versions: VersionItem[] = (rawVersions || []).map((v: any) => ({
    id: v.id,
    version: v.version,
    title: v.title,
    body: v.body,
    change_note: v.change_note,
    created_at: v.created_at,
    author_name: v.profiles?.full_name || "Admin",
  }));

  // 3. Fetch Findings Count citing this source
  const { count: findingsCount } = await adminSb
    .from("findings")
    .select("*", { count: "exact", head: true })
    .or(`source_id.eq.${id},source_key.eq.${source.source_key}`);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Brand Pack", href: "/brand" },
        { label: "Sources", href: "/brand/sources" },
        { label: source.source_key },
      ]}
      currentRole={currentRole}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <SourceReadingView
          source={source}
          versions={versions}
          findingsCount={findingsCount || 0}
          currentRole={currentRole}
        />
      </div>
    </AppShell>
  );
}

