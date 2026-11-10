import { Metadata } from "next";
import { AppShell } from "@/components/brandproof/app-shell";
import { BrandSubNav } from "@/components/brand/brand-subnav";
import { getSessionUser } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFreshness } from "@/lib/brand/freshness";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  FileEdit,
  History,
  Lock,
} from "lucide-react";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Brand Pack Overview — BrandProof",
  description: "Controlled brand knowledge base, freshness audit, and recent guidelines revisions.",
};

export default async function BrandOverviewPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/brand");
  }

  const adminSb = createAdminClient();

  // 1. Get workspace membership
  const { data: membership } = await adminSb
    .from("workspace_members")
    .select("workspace_id, role, is_designated_reviewer")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const workspaceId =
    membership?.workspace_id || "b0000000-0000-0000-0000-000000000001";
  const currentRole = membership?.role || "creator";
  const isAdmin = currentRole === "admin";

  // 2. Fetch all sources
  const { data: sources } = await adminSb
    .from("brand_sources")
    .select("id, source_key, type, title, review_by, status, current_version, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("source_key", { ascending: true });

  const activeSources = sources || [];

  // 3. Counts by type
  const typeCounts: Record<string, number> = {
    claim_policy: 0,
    terminology: 0,
    guideline: 0,
    fact: 0,
    tone_example: 0,
    asset_rule: 0,
  };

  for (const s of activeSources) {
    if (typeCounts[s.type] !== undefined) {
      typeCounts[s.type]++;
    }
  }

  // 4. Counts & list for freshness / due for review
  const itemsDueForReview: Array<{
    source: (typeof activeSources)[0];
    freshness: ReturnType<typeof calculateFreshness>;
  }> = [];

  let freshCount = 0;
  let dueSoonCount = 0;
  let overdueCount = 0;

  for (const s of activeSources) {
    const freshness = calculateFreshness(s.review_by);
    if (freshness.state === "overdue") {
      overdueCount++;
      itemsDueForReview.push({ source: s, freshness });
    } else if (freshness.state === "due_soon") {
      dueSoonCount++;
      itemsDueForReview.push({ source: s, freshness });
    } else if (freshness.state === "fresh") {
      freshCount++;
    }
  }

  // Sort due items: overdue first, then nearest due date
  itemsDueForReview.sort(
    (a, b) => (a.freshness.daysRemaining || 0) - (b.freshness.daysRemaining || 0)
  );

  // 5. Fetch counts for other entities
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

  // 6. Recently changed versions
  const { data: recentVersions } = await adminSb
    .from("brand_source_versions")
    .select("id, source_id, version, title, change_note, created_at, changed_by, profiles (full_name)")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Brand Pack", href: "/brand" },
        { label: "Overview" },
      ]}
      currentRole={currentRole}
    >
      <BrandSubNav
        currentRole={currentRole}
        counts={{
          sources: activeSources.length,
          terms: termsCount || 0,
          facts: factsCount || 0,
          assets: assetsCount || 0,
        }}
      />

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Editorial Desk Header */}
        <div className="border-b border-rule pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold mb-1">
              <span className="w-2 h-2 rounded-none bg-accent inline-block" />
              <span>Controlled Brand Knowledge Base</span>
            </div>
            <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
              Brand Pack &amp; Style Governance Desk
            </h1>
            <p className="font-sans text-xs sm:text-sm text-ink-soft max-w-2xl mt-1.5 leading-relaxed">
              The organisation&apos;s approved sources are the authority, not the AI.
              Every automated scan links directly to these verified records.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {!isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-paper-sunken border border-rule font-mono text-xs text-ink-soft">
                <Lock className="w-3.5 h-3.5" />
                Read-Only Access ({currentRole})
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/brand/import"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-paper border border-rule hover:border-accent text-ink text-xs font-mono transition-colors"
                >
                  Import Guidelines →
                </Link>
                <Link
                  href="/brand/sources"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-accent text-paper hover:bg-accent/90 text-xs font-mono transition-colors font-medium"
                >
                  Manage Sources →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Knowledge Base Dimension Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link
            href="/brand/sources?type=claim_policy"
            className="p-3.5 rounded-sm bg-paper-raised border border-rule hover:border-accent transition-colors group"
          >
            <div className="text-[10px] font-mono text-ink-soft uppercase">Claims Policies</div>
            <div className="text-2xl font-serif font-medium text-ink group-hover:text-accent mt-1">
              {typeCounts.claim_policy}
            </div>
            <div className="text-[10px] font-mono text-ink-faint mt-1">superlatives &amp; FTC</div>
          </Link>

          <Link
            href="/brand/terms"
            className="p-3.5 rounded-sm bg-paper-raised border border-rule hover:border-accent transition-colors group"
          >
            <div className="text-[10px] font-mono text-ink-soft uppercase">Terminology</div>
            <div className="text-2xl font-serif font-medium text-ink group-hover:text-accent mt-1">
              {termsCount || 0}
            </div>
            <div className="text-[10px] font-mono text-ink-faint mt-1">banned &amp; preferred</div>
          </Link>

          <Link
            href="/brand/facts"
            className="p-3.5 rounded-sm bg-paper-raised border border-rule hover:border-accent transition-colors group"
          >
            <div className="text-[10px] font-mono text-ink-soft uppercase">Certified Facts</div>
            <div className="text-2xl font-serif font-medium text-ink group-hover:text-accent mt-1">
              {factsCount || 0}
            </div>
            <div className="text-[10px] font-mono text-ink-faint mt-1">with validity dates</div>
          </Link>

          <Link
            href="/brand/sources?type=guideline"
            className="p-3.5 rounded-sm bg-paper-raised border border-rule hover:border-accent transition-colors group"
          >
            <div className="text-[10px] font-mono text-ink-soft uppercase">Core Guidelines</div>
            <div className="text-2xl font-serif font-medium text-ink group-hover:text-accent mt-1">
              {typeCounts.guideline}
            </div>
            <div className="text-[10px] font-mono text-ink-faint mt-1">warranty &amp; pricing</div>
          </Link>

          <Link
            href="/brand/sources?type=tone_example"
            className="p-3.5 rounded-sm bg-paper-raised border border-rule hover:border-accent transition-colors group"
          >
            <div className="text-[10px] font-mono text-ink-soft uppercase">Tone of Voice</div>
            <div className="text-2xl font-serif font-medium text-ink group-hover:text-accent mt-1">
              {typeCounts.tone_example}
            </div>
            <div className="text-[10px] font-mono text-ink-faint mt-1">guide persona &amp; craft</div>
          </Link>

          <Link
            href="/brand/assets"
            className="p-3.5 rounded-sm bg-paper-raised border border-rule hover:border-accent transition-colors group"
          >
            <div className="text-[10px] font-mono text-ink-soft uppercase">Brand Assets</div>
            <div className="text-2xl font-serif font-medium text-ink group-hover:text-accent mt-1">
              {assetsCount || 0}
            </div>
            <div className="text-[10px] font-mono text-ink-faint mt-1">private bucket storage</div>
          </Link>
        </div>

        {/* Freshness Health Banner */}
        <div className="p-4 rounded-sm bg-paper-raised border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-sm bg-accent-soft text-accent flex items-center justify-center font-mono font-bold text-sm border border-accent/20">
              <Calendar className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <div className="text-xs font-serif font-medium text-ink">
                Knowledge Base Freshness Health
              </div>
              <div className="text-[11px] font-sans text-ink-soft">
                Guidelines require regular review to prevent stale statistics and expired certifications from passing into release.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2 py-0.5 rounded-sm bg-moss-tint text-moss border border-moss/30 font-medium">
              {freshCount} Fresh
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-ochre-tint text-ochre border border-ochre/30 font-medium">
              {dueSoonCount} Due Soon (&le;30d)
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-oxblood-tint text-oxblood border border-oxblood/30 font-medium">
              {overdueCount} Overdue
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Items Due for Review (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <div className="flex items-center gap-2 text-sm font-serif font-medium text-ink">
                <AlertTriangle className="w-4 h-4 text-ochre stroke-[1.5]" />
                <span>Items Due for Review ({itemsDueForReview.length})</span>
              </div>
              <span className="text-[11px] font-mono text-ink-soft">
                Past or within 30 days
              </span>
            </div>

            {itemsDueForReview.length === 0 ? (
              <div className="p-8 text-center bg-paper-raised border border-rule rounded-sm space-y-2">
                <CheckCircle2 className="w-6 h-6 text-moss mx-auto stroke-[1.5]" />
                <h4 className="font-serif text-sm font-medium text-ink">
                  All Brand Policies are Current
                </h4>
                <p className="text-xs text-ink-soft font-sans max-w-sm mx-auto leading-relaxed">
                  No brand sources have passed their scheduled review deadline. Every certified claim and guideline is within its active validity window.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {itemsDueForReview.map(({ source, freshness }) => (
                  <div
                    key={source.id}
                    className="p-3.5 bg-paper-raised border border-rule rounded-sm hover:border-ink-soft/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          [{source.source_key}]
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-sm border ${freshness.statusClass}`}
                        >
                          {freshness.badgeText}
                        </span>
                        <span className="font-mono text-[10px] text-ink-faint uppercase">
                          v{source.current_version}
                        </span>
                      </div>
                      <Link
                        href={`/brand/sources/${source.id}`}
                        className="font-serif text-sm font-medium text-ink hover:text-accent transition-colors block truncate"
                      >
                        {source.title}
                      </Link>
                      <div className="text-[11px] font-sans text-ink-soft">
                        {freshness.label}
                      </div>
                    </div>

                    <Link
                      href={`/brand/sources/${source.id}`}
                      className="shrink-0 text-xs font-mono text-accent hover:underline flex items-center gap-1"
                    >
                      <span>Review source</span>
                      <ArrowRight className="w-3 h-3 stroke-[1.5]" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Recently Changed Guidelines (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-2">
              <div className="flex items-center gap-2 text-sm font-serif font-medium text-ink">
                <History className="w-4 h-4 text-accent stroke-[1.5]" />
                <span>Recently Changed Guidelines</span>
              </div>
              <span className="text-[11px] font-mono text-ink-soft">
                Immutable History
              </span>
            </div>

            {(!recentVersions || recentVersions.length === 0) ? (
              <div className="p-6 text-center bg-paper-raised border border-rule rounded-sm text-xs text-ink-soft font-sans">
                No policy version updates recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentVersions.map((v: any) => (
                  <div
                    key={v.id}
                    className="p-3 bg-paper-raised border border-rule rounded-sm text-xs font-sans space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-accent font-semibold">
                        Version {v.version}.0
                      </span>
                      <span className="text-ink-faint">
                        {new Date(v.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="font-serif text-xs font-medium text-ink line-clamp-1">
                      {v.title}
                    </div>

                    <div className="p-2 bg-paper rounded-sm border border-rule/70 text-[11px] font-mono text-ink-soft italic line-clamp-2">
                      &ldquo;{v.change_note || "Policy version updated"}&rdquo;
                    </div>

                    <div className="text-[10px] font-mono text-ink-faint flex items-center justify-between pt-1">
                      <span>By: {v.profiles?.full_name || "Workspace Admin"}</span>
                      <Link
                        href={`/brand/sources/${v.source_id}`}
                        className="text-accent hover:underline"
                      >
                        Inspect Diff →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

