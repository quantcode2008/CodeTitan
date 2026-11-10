"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityMark, SeverityLevel } from "@/components/brandproof/severity-mark";
import { Drawer } from "@/components/ui/drawer";
import { WorkspaceRole } from "@/lib/auth/types";
import {
  createBrandTermAction,
  updateBrandTermAction,
  deleteBrandTermAction,
} from "@/lib/actions/brand";
import {
  Plus,
  Search,
  Filter,
  SpellCheck,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export type TermKind = "prohibited" | "preferred" | "required_phrase";

export interface BrandTermRecord {
  id: string;
  workspace_id: string;
  term: string;
  kind: TermKind;
  replacement: string | null;
  severity: SeverityLevel;
  source_id: string | null;
  source_key?: string | null;
  notes: string | null;
  created_at: string;
}

export interface TermsTableEditorProps {
  workspaceId: string;
  initialTerms: BrandTermRecord[];
  sourcesList: Array<{ id: string; source_key: string; title: string }>;
  currentRole: WorkspaceRole;
}

export function TermsTableEditor({
  workspaceId,
  initialTerms,
  sourcesList,
  currentRole,
}: TermsTableEditorProps) {
  const isAdmin = currentRole === "admin";

  const [terms, setTerms] = React.useState<BrandTermRecord[]>(initialTerms);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<string>("all");
  const [severityFilter, setSeverityFilter] = React.useState<string>("all");

  // Form State
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingTermId, setEditingTermId] = React.useState<string | null>(null);

  const [formTerm, setFormTerm] = React.useState("");
  const [formKind, setFormKind] = React.useState<TermKind>("prohibited");
  const [formReplacement, setFormReplacement] = React.useState("");
  const [formSeverity, setFormSeverity] = React.useState<SeverityLevel>("major");
  const [formSourceId, setFormSourceId] = React.useState("");
  const [formNotes, setFormNotes] = React.useState("");

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const filteredTerms = React.useMemo(() => {
    return terms.filter((t) => {
      if (kindFilter !== "all" && t.kind !== kindFilter) return false;
      if (severityFilter !== "all" && t.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTerm = t.term.toLowerCase().includes(q);
        const matchesReplacement = t.replacement?.toLowerCase().includes(q);
        const matchesNotes = t.notes?.toLowerCase().includes(q);
        if (!matchesTerm && !matchesReplacement && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [terms, kindFilter, severityFilter, searchQuery]);

  function openCreate() {
    setEditingTermId(null);
    setFormTerm("");
    setFormKind("prohibited");
    setFormReplacement("");
    setFormSeverity("major");
    setFormSourceId(sourcesList[0]?.id || "");
    setFormNotes("");
    setErrorMsg(null);
    setIsDrawerOpen(true);
  }

  function openEdit(term: BrandTermRecord) {
    setEditingTermId(term.id);
    setFormTerm(term.term);
    setFormKind(term.kind);
    setFormReplacement(term.replacement || "");
    setFormSeverity(term.severity);
    setFormSourceId(term.source_id || "");
    setFormNotes(term.notes || "");
    setErrorMsg(null);
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      if (editingTermId) {
        // Update
        const res = await updateBrandTermAction(workspaceId, {
          id: editingTermId,
          term: formTerm,
          kind: formKind,
          replacement: formReplacement || null,
          severity: formSeverity,
          source_id: formSourceId || null,
          notes: formNotes || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to update term.");
        } else {
          setSuccessMsg(`Updated terminology rule for "${formTerm}".`);
          setTerms((prev) =>
            prev.map((t) =>
              t.id === editingTermId
                ? {
                    ...t,
                    term: formTerm,
                    kind: formKind,
                    replacement: formReplacement || null,
                    severity: formSeverity,
                    source_id: formSourceId || null,
                    notes: formNotes || null,
                  }
                : t
            )
          );
          setIsDrawerOpen(false);
        }
      } else {
        // Create
        const res = await createBrandTermAction(workspaceId, {
          term: formTerm,
          kind: formKind,
          replacement: formReplacement || null,
          severity: formSeverity,
          source_id: formSourceId || null,
          notes: formNotes || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to create term.");
        } else {
          setSuccessMsg(`Added terminology rule for "${formTerm}".`);
          if (res.data) {
            setTerms((prev) => [...prev, res.data]);
          }
          setIsDrawerOpen(false);
        }
      }
    });
  }

  async function handleDelete(term: BrandTermRecord) {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete term rule "${term.term}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteBrandTermAction(workspaceId, term.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete term.");
      } else {
        setSuccessMsg(`Deleted term rule "${term.term}".`);
        setTerms((prev) => prev.filter((t) => t.id !== term.id));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
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

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search terminology, replacement, or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-sm font-sans text-xs text-ink bg-paper-raised border border-rule placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none stroke-[1.5]" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Kind Filter */}
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="h-9 px-2.5 rounded-sm bg-paper-raised border border-rule font-mono text-xs text-ink focus:border-accent"
          >
            <option value="all">All Kinds ({terms.length})</option>
            <option value="prohibited">Prohibited Terms</option>
            <option value="preferred">Preferred Vocabulary</option>
            <option value="required_phrase">Required Phrases</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 px-2.5 rounded-sm bg-paper-raised border border-rule font-mono text-xs text-ink focus:border-accent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="advisory">Advisory</option>
          </select>

          {isAdmin ? (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
              className="text-xs font-mono tracking-wider uppercase h-9 px-3.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[1.5]" />
              Add Term Rule
            </Button>
          ) : (
            <div className="text-[11px] font-mono text-ink-soft flex items-center gap-1 px-2.5 py-1 bg-paper-sunken rounded-sm border border-rule">
              <Lock className="w-3 h-3 text-ink-soft" />
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-rule rounded-sm bg-paper-raised overflow-x-auto">
        {filteredTerms.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <SpellCheck className="w-8 h-8 text-ink-soft mx-auto stroke-[1.5]" />
            <h3 className="font-serif text-base font-medium text-ink">
              No terminology rules found
            </h3>
            <p className="font-sans text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
              No terminology rules defined yet. Prohibited and preferred terms
              prevent off-brand vocabulary before drafts reach review.
            </p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={openCreate}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Define First Term Rule
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-rule bg-paper-sunken/60 font-mono text-[10px] uppercase text-ink-soft select-none">
                <th className="py-2.5 px-4 font-semibold">Term / Expression</th>
                <th className="py-2.5 px-4 font-semibold">Category</th>
                <th className="py-2.5 px-4 font-semibold">Approved Replacement</th>
                <th className="py-2.5 px-4 font-semibold">Severity</th>
                <th className="py-2.5 px-4 font-semibold">Authority</th>
                <th className="py-2.5 px-4 font-semibold">Usage Guidance</th>
                {isAdmin && <th className="py-2.5 px-4 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-sans">
              {filteredTerms.map((t) => {
                const kindBadgeColor = {
                  prohibited: "bg-oxblood-tint text-oxblood border-oxblood/30",
                  preferred: "bg-moss-tint text-moss border-moss/30",
                  required_phrase: "bg-accent-soft text-accent border-accent/20",
                }[t.kind];

                return (
                  <tr key={t.id} className="hover:bg-paper transition-colors group">
                    <td className="py-3 px-4 font-serif text-sm font-medium text-ink">
                      {t.term}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm border ${kindBadgeColor}`}
                      >
                        {t.kind.replace(/_/g, " ")}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-serif text-ink font-normal">
                      {t.replacement ? (
                        <span className="text-moss font-medium">
                          &ldquo;{t.replacement}&rdquo;
                        </span>
                      ) : (
                        <span className="font-mono text-ink-faint text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <SeverityMark severity={t.severity} />
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {t.source_id ? (
                        <Link
                          href={`/brand/sources/${t.source_id}`}
                          className="text-accent hover:underline font-semibold"
                        >
                          [{t.source_key || "Policy"}]
                        </Link>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-ink-soft text-[11px] max-w-xs truncate">
                      {t.notes || "—"}
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEdit(t)}
                            title="Edit term rule"
                            className="p-1 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-sunken border border-transparent hover:border-rule transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            title="Delete term rule"
                            className="p-1 rounded-sm text-ink-soft hover:text-oxblood hover:bg-oxblood-tint/50 border border-transparent hover:border-oxblood/30 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Admin Drawer (Create/Edit Term) */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingTermId ? "Edit Terminology Rule" : "Add Terminology Rule"}
        subtitle="Enforced deterministically by the regex engine during pre-publication scans."
      >
        <form onSubmit={handleSave} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Term or Phrase
            </label>
            <Input
              type="text"
              required
              value={formTerm}
              onChange={(e) => setFormTerm(e.target.value)}
              placeholder="e.g. cheap, miracle fabric, #1"
              className="font-sans text-xs bg-paper"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Rule Kind
              </label>
              <select
                value={formKind}
                onChange={(e) => setFormKind(e.target.value as TermKind)}
                className="w-full h-8 px-2.5 rounded-sm bg-paper border border-rule font-mono text-xs text-ink focus:border-accent"
              >
                <option value="prohibited">Prohibited (Flags violation)</option>
                <option value="preferred">Preferred (Encourages usage)</option>
                <option value="required_phrase">Required Phrase</option>
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Violation Severity
              </label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value as SeverityLevel)}
                className="w-full h-8 px-2.5 rounded-sm bg-paper border border-rule font-mono text-xs text-ink focus:border-accent"
              >
                <option value="critical">Critical (Blocks approval)</option>
                <option value="major">Major (Requires change)</option>
                <option value="minor">Minor (Editorial suggestion)</option>
                <option value="advisory">Advisory (Informational)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Purpose-Preserving Replacement (Optional)
            </label>
            <Input
              type="text"
              value={formReplacement}
              onChange={(e) => setFormReplacement(e.target.value)}
              placeholder="e.g. accessible, 420D ripstop nylon"
              className="font-sans text-xs bg-paper"
            />
            <p className="text-[10px] text-ink-faint mt-1">
              Presented to the creator as a 1-click diff suggestion.
            </p>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Authoritative Linked Source
            </label>
            <select
              value={formSourceId}
              onChange={(e) => setFormSourceId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-sm bg-paper border border-rule font-mono text-xs text-ink focus:border-accent"
            >
              <option value="">No linked source</option>
              {sourcesList.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.source_key}] {s.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Guidance Note / Explanation
            </label>
            <textarea
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Explain why this term violates brand positioning or legal standards..."
              className="w-full p-2.5 rounded-sm bg-paper border border-rule font-sans text-xs text-ink focus:border-accent focus-visible:outline-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-rule">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending}
            >
              {isPending ? "Saving..." : editingTermId ? "Save Changes" : "Create Term"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}

