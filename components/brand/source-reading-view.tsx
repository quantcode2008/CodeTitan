"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { DiffView } from "@/components/brandproof/diff-view";
import { calculateFreshness } from "@/lib/brand/freshness";
import { BrandSourceType, BrandSourceStatus } from "@/lib/database.types";
import { WorkspaceRole } from "@/lib/auth/types";
import { updateBrandSourceAction, archiveBrandSourceAction } from "@/lib/actions/brand";
import {
  BookOpen,
  Calendar,
  Clock,
  History,
  Edit3,
  Archive,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Lock,
  GitCommit,
  Layers,
} from "lucide-react";

export interface VersionItem {
  id: string;
  version: number;
  title: string;
  body: string;
  change_note: string | null;
  created_at: string;
  author_name?: string | null;
}

export interface SourceDetailData {
  id: string;
  workspace_id: string;
  source_key: string;
  type: BrandSourceType;
  title: string;
  body: string;
  review_by: string | null;
  status: BrandSourceStatus;
  current_version: number;
  tags: string[];
  updated_at: string;
  owner_name?: string | null;
}

export interface SourceReadingViewProps {
  source: SourceDetailData;
  versions: VersionItem[];
  findingsCount: number;
  currentRole: WorkspaceRole;
}

export function SourceReadingView({
  source: initialSource,
  versions: initialVersions,
  findingsCount,
  currentRole,
}: SourceReadingViewProps) {
  const isAdmin = currentRole === "admin";

  const [source, setSource] = React.useState<SourceDetailData>(initialSource);
  const [versions, setVersions] = React.useState<VersionItem[]>(initialVersions);
  const [selectedDiffVersion, setSelectedDiffVersion] = React.useState<VersionItem | null>(null);

  // Edit Drawer State
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(source.title);
  const [editBody, setEditBody] = React.useState(source.body);
  const [editType, setEditType] = React.useState<BrandSourceType>(source.type);
  const [editReviewBy, setEditReviewBy] = React.useState(source.review_by || "");
  const [editTagsText, setEditTagsText] = React.useState(source.tags.join(", "));
  const [editChangeNote, setEditChangeNote] = React.useState("");

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const freshness = calculateFreshness(source.review_by);

  const typeLabel = {
    claim_policy: "Claims & Superlatives Policy",
    terminology: "Terminology & Nomenclature Lexicon",
    guideline: "Standard Brand Guideline",
    fact: "Certified Brand Fact",
    tone_example: "Tone of Voice & Persona Reference",
    asset_rule: "Brand Asset & Accessibility Rule",
  }[source.type] || source.type;

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const tags = editTagsText
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    startTransition(async () => {
      const res = await updateBrandSourceAction(source.workspace_id, {
        id: source.id,
        title: editTitle,
        body: editBody,
        type: editType,
        review_by: editReviewBy || null,
        tags,
        status: source.status,
        change_note: editChangeNote,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update brand source.");
      } else {
        setSuccessMsg("Brand policy updated. New version and audit record created.");
        setSource((prev) => ({
          ...prev,
          title: editTitle,
          body: editBody,
          type: editType,
          review_by: editReviewBy || null,
          tags,
          current_version: prev.current_version + 1,
        }));
        setIsEditOpen(false);
        setEditChangeNote("");
      }
    });
  }

  async function handleArchive() {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to archive source [${source.source_key}]?`)) {
      return;
    }

    startTransition(async () => {
      const res = await archiveBrandSourceAction(source.workspace_id, source.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to archive source.");
      } else {
        setSuccessMsg(`Source [${source.source_key}] archived.`);
        setSource((prev) => ({ ...prev, status: "archived" }));
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Back Link & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-4">
        <Link
          href="/brand/sources"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 stroke-[1.5]" />
          <span>Back to All Brand Sources</span>
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditTitle(source.title);
                  setEditBody(source.body);
                  setEditType(source.type);
                  setEditReviewBy(source.review_by || "");
                  setEditTagsText(source.tags.join(", "));
                  setEditChangeNote("");
                  setIsEditOpen(true);
                }}
                className="text-xs font-mono tracking-wider uppercase h-8"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
                Edit Policy
              </Button>

              {source.status === "active" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleArchive}
                  className="text-xs font-mono text-ink-soft hover:text-oxblood h-8"
                >
                  <Archive className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
                  Archive
                </Button>
              )}
            </>
          ) : (
            <div className="text-[11px] font-mono text-ink-soft flex items-center gap-1 px-2.5 py-1 bg-paper-sunken rounded-sm border border-rule">
              <Lock className="w-3 h-3 text-ink-soft" />
              <span>Read-Only Source ({currentRole})</span>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
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

      {/* Main Reading View Layout (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Style-Guide Reading Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Document Masthead */}
          <div className="space-y-3 border-b border-rule pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent bg-accent-soft px-2 py-0.5 rounded-sm border border-accent/20">
                [{source.source_key}]
              </span>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule text-ink">
                {typeLabel}
              </span>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule text-ink-soft">
                Version {source.current_version}.0
              </span>
              <span
                className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-sm border ${freshness.statusClass}`}
              >
                {freshness.badgeText}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink leading-tight">
              {source.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-ink-soft pt-1">
              <span>Owner: <strong className="text-ink">{source.owner_name || "Legal & Brand Ops"}</strong></span>
              <span>·</span>
              <span>{freshness.label}</span>
            </div>
          </div>

          {/* Reading Body (Newsreader Typography) */}
          <article className="prose prose-neutral max-w-[68ch]">
            <div className="font-serif text-lg leading-relaxed text-ink whitespace-pre-line selection:bg-accent-soft selection:text-ink">
              {source.body}
            </div>
          </article>

          {/* Tags Footer */}
          {source.tags?.length > 0 && (
            <div className="pt-6 border-t border-rule flex items-center gap-2 font-mono text-xs text-ink-soft">
              <span>Indexed tags:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {source.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule text-ink font-mono text-[11px]"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-Side Diff Comparison Panel (when a past version is selected) */}
          {selectedDiffVersion && (
            <div className="p-6 rounded-sm bg-paper-raised border border-accent/40 shadow-hairline space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rule">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent uppercase">
                      Side-by-Side Version Diff
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-sm bg-paper-sunken border border-rule">
                      v{selectedDiffVersion.version}.0 vs Current (v{source.current_version}.0)
                    </span>
                  </div>
                  <div className="text-[11px] font-sans text-ink-soft mt-0.5">
                    Historical change note: &ldquo;{selectedDiffVersion.change_note || "Revision saved"}&rdquo;
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDiffVersion(null)}
                >
                  Close Diff
                </Button>
              </div>

              <DiffView
                originalText={selectedDiffVersion.body}
                revisedText={source.body}
                className="font-serif text-sm"
              />
            </div>
          )}
        </div>

        {/* Right Column: Governance Metadata & Version History (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Finding Governance Impact Card */}
          <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-3">
            <div className="flex items-center gap-2 text-xs font-serif font-medium text-ink">
              <FileCheck2 className="w-4 h-4 text-accent stroke-[1.5]" />
              <span>Governance Impact</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-medium text-ink">
                {findingsCount}
              </span>
              <span className="text-xs font-sans text-ink-soft">
                {findingsCount === 1 ? "finding citing this source" : "findings citing this source"}
              </span>
            </div>

            <p className="text-[11px] font-sans text-ink-soft leading-relaxed border-t border-rule pt-2">
              Every draft audit finding links back to this source key to provide verifiable proofreader authority.
            </p>
          </div>

          {/* Immutable Version History Timeline */}
          <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <div className="flex items-center gap-2 text-xs font-serif font-medium text-ink">
                <History className="w-4 h-4 text-accent stroke-[1.5]" />
                <span>Version History ({versions.length + 1})</span>
              </div>
              <span className="font-mono text-[10px] text-ink-soft">
                Append-Only
              </span>
            </div>

            {/* Current Active Version Item */}
            <div className="p-3 bg-paper rounded-sm border border-accent/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-accent">
                  Version {source.current_version}.0 (Current)
                </span>
                <span className="text-[10px] text-ink-faint">
                  Active
                </span>
              </div>
              <p className="text-xs font-sans text-ink-soft line-clamp-2">
                {source.title}
              </p>
            </div>

            {/* Past Versions List */}
            {versions.length === 0 ? (
              <div className="text-[11px] font-mono text-ink-soft py-2 text-center">
                This policy is at its original initial version (v1.0).
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-3 bg-paper rounded-sm border border-rule hover:border-ink-soft/40 transition-colors space-y-1.5 text-xs font-sans"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-semibold text-ink">
                        Version {ver.version}.0
                      </span>
                      <span className="text-[10px] text-ink-faint">
                        {new Date(ver.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="p-2 bg-paper-sunken rounded-sm text-[11px] font-mono text-ink-soft italic">
                      &ldquo;{ver.change_note || "Policy updated"}&rdquo;
                    </div>

                    <div className="pt-1 flex items-center justify-between font-mono text-[10px] text-ink-faint">
                      <span>By: {ver.author_name || "Admin"}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDiffVersion(ver)}
                        className="text-accent hover:underline cursor-pointer font-medium"
                      >
                        Compare Diff →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Edit Drawer */}
      <Drawer
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit Brand Source [${source.source_key}]`}
        subtitle="Every update automatically snapshots the previous version and records an immutable audit event."
      >
        <form onSubmit={handleUpdate} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Source Title
            </label>
            <Input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-sans text-xs bg-paper"
            />
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value as BrandSourceType)}
              className="w-full h-8 px-2.5 rounded-sm bg-paper border border-rule font-mono text-xs text-ink focus:border-accent"
            >
              <option value="claim_policy">Claims Policy</option>
              <option value="terminology">Terminology</option>
              <option value="guideline">Guideline</option>
              <option value="fact">Certified Fact</option>
              <option value="tone_example">Tone of Voice</option>
              <option value="asset_rule">Asset Rule</option>
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Guideline Text (Markdown/Plaintext)
            </label>
            <textarea
              required
              rows={10}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full p-3 rounded-sm bg-paper border border-rule font-serif text-xs text-ink focus:border-accent focus-visible:outline-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Scheduled Review Date
              </label>
              <input
                type="date"
                value={editReviewBy}
                onChange={(e) => setEditReviewBy(e.target.value)}
                className="w-full h-8 px-2 rounded-sm bg-paper border border-rule font-mono text-xs text-ink"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Tags (comma separated)
              </label>
              <Input
                type="text"
                value={editTagsText}
                onChange={(e) => setEditTagsText(e.target.value)}
                className="font-mono text-xs bg-paper"
              />
            </div>
          </div>

          {/* Mandatory Change Note Field */}
          <div className="p-3 bg-paper-sunken border border-rule rounded-sm space-y-1.5">
            <label className="block font-mono text-[11px] text-accent uppercase tracking-wider font-semibold">
              Required Change Rationale (Audit Trail)
            </label>
            <Input
              type="text"
              required
              minLength={3}
              value={editChangeNote}
              onChange={(e) => setEditChangeNote(e.target.value)}
              placeholder="e.g. Updated recycling threshold per 2026 FTC Green Guide revision"
              className="font-sans text-xs bg-paper"
            />
            <p className="text-[10px] text-ink-faint">
              This reason will be stored permanently in the version ledger and attached to the audit event.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending || !editChangeNote.trim()}
            >
              {isPending ? "Creating Version..." : "Commit Update"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
