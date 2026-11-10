"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { calculateFreshness } from "@/lib/brand/freshness";
import { BrandSourceType, BrandSourceStatus } from "@/lib/database.types";
import { WorkspaceRole } from "@/lib/auth/types";
import { createBrandSourceAction } from "@/lib/actions/brand";
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  BookOpen,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Lock,
  Tag,
} from "lucide-react";

export interface SourceRow {
  id: string;
  source_key: string;
  type: BrandSourceType;
  title: string;
  body: string;
  owner_id: string | null;
  owner_name?: string | null;
  review_by: string | null;
  status: BrandSourceStatus;
  current_version: number;
  tags: string[];
  updated_at: string;
}

export interface SourcesListProps {
  workspaceId: string;
  initialSources: SourceRow[];
  currentRole: WorkspaceRole;
}

export function SourcesList({
  workspaceId,
  initialSources,
  currentRole,
}: SourcesListProps) {
  const isAdmin = currentRole === "admin";

  const [sources, setSources] = React.useState<SourceRow[]>(initialSources);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("active");
  const [tagFilter, setTagFilter] = React.useState<string>("all");

  // Create Source Drawer State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [createTitle, setCreateTitle] = React.useState("");
  const [createBody, setCreateBody] = React.useState("");
  const [createType, setCreateType] = React.useState<BrandSourceType>("claim_policy");
  const [createReviewBy, setCreateReviewBy] = React.useState("");
  const [createTagsText, setCreateTagsText] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Extract all unique tags
  const allTags = React.useMemo(() => {
    const s = new Set<string>();
    for (const src of sources) {
      for (const t of src.tags || []) {
        if (t) s.add(t);
      }
    }
    return Array.from(s).sort();
  }, [sources]);

  // Client-side filtering & search
  const filteredSources = React.useMemo(() => {
    return sources.filter((s) => {
      // Type filter
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      // Status filter
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      // Tag filter
      if (tagFilter !== "all" && !s.tags?.includes(tagFilter)) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = s.source_key.toLowerCase().includes(q);
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesBody = s.body.toLowerCase().includes(q);
        const matchesTags = s.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesKey && !matchesTitle && !matchesBody && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [sources, typeFilter, statusFilter, tagFilter, searchQuery]);

  async function handleCreateSource(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const tags = createTagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    startTransition(async () => {
      const res = await createBrandSourceAction(workspaceId, {
        title: createTitle,
        body: createBody,
        type: createType,
        review_by: createReviewBy || null,
        tags,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create brand source.");
      } else {
        setSuccessMsg(`Brand source [${res.data?.source_key}] created successfully.`);
        if (res.data) {
          setSources((prev) => [...prev, res.data]);
        }
        setIsCreateOpen(false);
        setCreateTitle("");
        setCreateBody("");
        setCreateTagsText("");
        setCreateReviewBy("");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-sm bg-oxblood-tint/60 border border-oxblood/30 text-oxblood text-xs font-sans flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-3 rounded-sm bg-moss-tint/60 border border-moss/30 text-moss text-xs font-sans flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control Bar: Search, Filters, Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search policies or cite key (e.g. S-003 or claims)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-sm font-sans text-xs text-ink bg-paper-raised border border-rule placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none stroke-[1.5]" />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-2.5 rounded-sm bg-paper-raised border border-rule font-mono text-xs text-ink focus:border-accent"
          >
            <option value="all">All Types ({sources.length})</option>
            <option value="claim_policy">Claims Policy</option>
            <option value="terminology">Terminology</option>
            <option value="guideline">Guideline</option>
            <option value="fact">Fact</option>
            <option value="tone_example">Tone of Voice</option>
            <option value="asset_rule">Asset Rules</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2.5 rounded-sm bg-paper-raised border border-rule font-mono text-xs text-ink focus:border-accent"
          >
            <option value="active">Active Only</option>
            <option value="archived">Archived</option>
            <option value="all">All Statuses</option>
          </select>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="h-9 px-2.5 rounded-sm bg-paper-raised border border-rule font-mono text-xs text-ink focus:border-accent"
            >
              <option value="all">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          {isAdmin ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs font-mono tracking-wider uppercase h-9 px-3.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[1.5]" />
              New Source
            </Button>
          ) : (
            <div className="text-[11px] font-mono text-ink-soft flex items-center gap-1 px-2 py-1 bg-paper-sunken rounded-sm border border-rule">
              <Lock className="w-3 h-3 text-ink-soft" />
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Sources Table / List */}
      <div className="border border-rule rounded-sm bg-paper-raised overflow-hidden">
        {filteredSources.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-8 h-8 text-ink-soft mx-auto stroke-[1.5]" />
            <h3 className="font-serif text-base font-medium text-ink">
              No approved sources found
            </h3>
            <p className="font-sans text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
              No approved claims yet. Reviewers can only verify claims against
              sources you add here. Add authoritative brand policies or import existing guidelines to start governance scanning.
            </p>
            {isAdmin && (
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Brand Source
                </Button>
                <Link href="/brand/import">
                  <Button variant="secondary" size="sm">
                    Import Markdown Guidelines
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filteredSources.map((source) => {
              const freshness = calculateFreshness(source.review_by);

              const typeBadgeClass = {
                claim_policy: "bg-oxblood-tint text-oxblood border-oxblood/30",
                terminology: "bg-ochre-tint text-ochre border-ochre/30",
                guideline: "bg-paper-sunken text-ink-soft border-rule",
                fact: "bg-moss-tint text-moss border-moss/30",
                tone_example: "bg-slate-tint text-slate border-slate/30",
                asset_rule: "bg-accent-soft text-accent border-accent/20",
              }[source.type] || "bg-paper-sunken text-ink border-rule";

              return (
                <div
                  key={source.id}
                  className="p-4 hover:bg-paper transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent bg-accent-soft px-1.5 py-0.2 rounded-sm border border-accent/20">
                        [{source.source_key}]
                      </span>
                      <span
                        className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm border ${typeBadgeClass}`}
                      >
                        {source.type.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-[10px] text-ink-soft">
                        v{source.current_version}.0
                      </span>
                      {source.status === "archived" && (
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-paper-sunken text-ink-faint border border-rule">
                          Archived
                        </span>
                      )}
                      <span
                        className={`font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm border ${freshness.statusClass}`}
                      >
                        {freshness.badgeText}
                      </span>
                    </div>

                    <Link
                      href={`/brand/sources/${source.id}`}
                      className="font-serif text-base font-medium text-ink hover:text-accent transition-colors block leading-snug"
                    >
                      {source.title}
                    </Link>

                    <p className="font-sans text-xs text-ink-soft line-clamp-2 leading-relaxed">
                      {source.body}
                    </p>

                    {/* Metadata & Tags */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[10px] text-ink-faint">
                      <span>Owner: {source.owner_name || "Legal & Brand Ops"}</span>
                      <span>·</span>
                      <span>{freshness.label}</span>
                      {source.tags?.length > 0 && (
                        <>
                          <span>·</span>
                          <div className="flex items-center gap-1">
                            {source.tags.map((t) => (
                              <span
                                key={t}
                                className="px-1 rounded-sm bg-paper-sunken border border-rule text-ink-soft"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <Link
                      href={`/brand/sources/${source.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-paper border border-rule hover:border-accent text-xs font-mono text-ink hover:text-accent transition-colors"
                    >
                      <span>Read Policy</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Admin: Create Source Drawer */}
      <Drawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add Authoritative Brand Source"
        subtitle="Keys are generated sequentially and become permanently auditable."
      >
        <form onSubmit={handleCreateSource} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Source Title
            </label>
            <Input
              type="text"
              required
              value={createTitle}
              onChange={(e) => setCreateTitle(e.target.value)}
              placeholder="e.g. Global Claims Policy v3.0"
              className="font-sans text-xs bg-paper"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Source Category
            </label>
            <select
              value={createType}
              onChange={(e) => setCreateType(e.target.value as BrandSourceType)}
              className="w-full h-8 px-2.5 rounded-sm bg-paper border border-rule font-mono text-xs text-ink focus:border-accent"
            >
              <option value="claim_policy">Claims Policy (Superlatives, Comparisons)</option>
              <option value="terminology">Terminology (Prohibited & Preferred)</option>
              <option value="guideline">Guideline (General compliance & legal)</option>
              <option value="fact">Certified Fact (Founding, metrics)</option>
              <option value="tone_example">Tone of Voice (Guide character & copy)</option>
              <option value="asset_rule">Asset Rule (Logos, badges, alt-text)</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Authoritative Guideline Text
            </label>
            <textarea
              required
              rows={8}
              value={createBody}
              onChange={(e) => setCreateBody(e.target.value)}
              placeholder="Write the full authoritative brand policy. Automated governance checks will cross-reference drafts against this text verbatim..."
              className="w-full p-3 rounded-sm bg-paper border border-rule font-serif text-xs text-ink focus:border-accent focus-visible:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Review Scheduled Date
              </label>
              <input
                type="date"
                value={createReviewBy}
                onChange={(e) => setCreateReviewBy(e.target.value)}
                className="w-full h-8 px-2 rounded-sm bg-paper border border-rule font-mono text-xs text-ink"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Tags (comma separated)
              </label>
              <Input
                type="text"
                value={createTagsText}
                onChange={(e) => setCreateTagsText(e.target.value)}
                placeholder="claims, legal, ftc"
                className="font-mono text-xs bg-paper"
              />
            </div>
          </div>

          <div className="p-3 bg-paper-sunken border border-rule rounded-sm font-mono text-[11px] text-ink-soft space-y-1">
            <span className="font-semibold text-accent block uppercase">
              Sequential Source Key Notice
            </span>
            <span>
              The system will automatically allocate the next available sequential identifier (e.g. S-013). Once assigned, keys are immutable to preserve audit integrity.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Allocating Key..." : "Commit Brand Source"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
