"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { WorkspaceRole } from "@/lib/auth/types";
import {
  createBrandFactAction,
  updateBrandFactAction,
  deleteBrandFactAction,
} from "@/lib/actions/brand";
import {
  Plus,
  Search,
  ShieldAlert,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export interface BrandFactRecord {
  id: string;
  workspace_id: string;
  key: string;
  value: string;
  unit: string | null;
  valid_from: string | null;
  valid_until: string | null;
  source_id: string | null;
  source_key?: string | null;
  created_at: string;
}

export interface FactsTableEditorProps {
  workspaceId: string;
  initialFacts: BrandFactRecord[];
  sourcesList: Array<{ id: string; source_key: string; title: string }>;
  currentRole: WorkspaceRole;
}

function isExpired(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

export function FactsTableEditor({
  workspaceId,
  initialFacts,
  sourcesList,
  currentRole,
}: FactsTableEditorProps) {
  const isAdmin = currentRole === "admin";

  const [facts, setFacts] = React.useState<BrandFactRecord[]>(initialFacts);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "expired">("all");

  // Form State
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingFactId, setEditingFactId] = React.useState<string | null>(null);

  const [formKey, setFormKey] = React.useState("");
  const [formValue, setFormValue] = React.useState("");
  const [formUnit, setFormUnit] = React.useState("");
  const [formValidFrom, setFormValidFrom] = React.useState("");
  const [formValidUntil, setFormValidUntil] = React.useState("");
  const [formSourceId, setFormSourceId] = React.useState("");

  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const filteredFacts = React.useMemo(() => {
    return facts.filter((f) => {
      const expired = isExpired(f.valid_until);
      if (statusFilter === "active" && expired) return false;
      if (statusFilter === "expired" && !expired) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesKey = f.key.toLowerCase().includes(q);
        const matchesVal = f.value.toLowerCase().includes(q);
        const matchesUnit = f.unit?.toLowerCase().includes(q);
        if (!matchesKey && !matchesVal && !matchesUnit) return false;
      }
      return true;
    });
  }, [facts, statusFilter, searchQuery]);

  function openCreate() {
    setEditingFactId(null);
    setFormKey("");
    setFormValue("");
    setFormUnit("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormSourceId(sourcesList[0]?.id || "");
    setErrorMsg(null);
    setIsDrawerOpen(true);
  }

  function openEdit(fact: BrandFactRecord) {
    setEditingFactId(fact.id);
    setFormKey(fact.key);
    setFormValue(fact.value);
    setFormUnit(fact.unit || "");
    setFormValidFrom(fact.valid_from || "");
    setFormValidUntil(fact.valid_until || "");
    setFormSourceId(fact.source_id || "");
    setErrorMsg(null);
    setIsDrawerOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      if (editingFactId) {
        const res = await updateBrandFactAction(workspaceId, {
          id: editingFactId,
          key: formKey,
          value: formValue,
          unit: formUnit || null,
          valid_from: formValidFrom || null,
          valid_until: formValidUntil || null,
          source_id: formSourceId || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to update fact.");
        } else {
          setSuccessMsg(`Updated certified fact "${formKey}".`);
          setFacts((prev) =>
            prev.map((f) =>
              f.id === editingFactId
                ? {
                  ...f,
                  key: formKey,
                  value: formValue,
                  unit: formUnit || null,
                  valid_from: formValidFrom || null,
                  valid_until: formValidUntil || null,
                  source_id: formSourceId || null,
                }
                : f
            )
          );
          setIsDrawerOpen(false);
        }
      } else {
        const res = await createBrandFactAction(workspaceId, {
          key: formKey,
          value: formValue,
          unit: formUnit || null,
          valid_from: formValidFrom || null,
          valid_until: formValidUntil || null,
          source_id: formSourceId || null,
        });

        if (!res.success) {
          setErrorMsg(res.error || "Failed to add fact.");
        } else {
          setSuccessMsg(`Added certified fact "${formKey}".`);
          if (res.data) {
            setFacts((prev) => [...prev, res.data]);
          }
          setIsDrawerOpen(false);
        }
      }
    });
  }

  async function handleDelete(fact: BrandFactRecord) {
    if (!isAdmin) return;
    if (!confirm(`Are you sure you want to delete fact "${fact.key}"?`)) {
      return;
    }

    startTransition(async () => {
      const res = await deleteBrandFactAction(workspaceId, fact.id);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete fact.");
      } else {
        setSuccessMsg(`Deleted fact "${fact.key}".`);
        setFacts((prev) => prev.filter((f) => f.id !== fact.id));
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
            placeholder="Search fact key, value, or unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-sm font-sans text-xs text-ink bg-paper-raised border border-rule placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none stroke-[1.5]" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 px-2.5 rounded-sm bg-paper-raised border border-rule font-mono text-xs text-ink focus:border-accent"
          >
            <option value="all">All Facts ({facts.length})</option>
            <option value="active">Active Only</option>
            <option value="expired">Expired Only</option>
          </select>

          {isAdmin ? (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreate}
              className="text-xs font-mono tracking-wider uppercase h-9 px-3.5"
            >
              <Plus className="w-3.5 h-3.5 mr-1 stroke-[1.5]" />
              Add Fact
            </Button>
          ) : (
            <div className="text-[11px] font-mono text-ink-soft flex items-center gap-1 px-2.5 py-1 bg-paper-sunken rounded-sm border border-rule">
              <Lock className="w-3 h-3 text-ink-soft" />
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Facts Table */}
      <div className="border border-rule rounded-sm bg-paper-raised overflow-x-auto">
        {filteredFacts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-ink-soft mx-auto stroke-[1.5]" />
            <h3 className="font-serif text-base font-medium text-ink">
              No certified facts found
            </h3>
            <p className="font-sans text-xs text-ink-soft max-w-md mx-auto leading-relaxed">
              No certified facts recorded yet. Fact checking flags outdated
              statistics and unverified claims in creator drafts.
            </p>
            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                onClick={openCreate}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Fact
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-rule bg-paper-sunken/60 font-mono text-[10px] uppercase text-ink-soft select-none">
                <th className="py-2.5 px-4 font-semibold">Certified Metric / Fact Key</th>
                <th className="py-2.5 px-4 font-semibold">Certified Value</th>
                <th className="py-2.5 px-4 font-semibold">Validity State</th>
                <th className="py-2.5 px-4 font-semibold">Time Window</th>
                <th className="py-2.5 px-4 font-semibold">Authority</th>
                {isAdmin && <th className="py-2.5 px-4 text-right font-semibold">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-sans">
              {filteredFacts.map((f) => {
                const expired = isExpired(f.valid_until);

                return (
                  <tr key={f.id} className="hover:bg-paper transition-colors group">
                    <td className="py-3 px-4 font-medium text-ink font-serif text-sm">
                      {f.key}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs font-bold text-ink">
                      {f.value}
                      {f.unit && <span className="ml-0.5 text-ink-soft font-normal">{f.unit}</span>}
                    </td>

                    <td className="py-3 px-4">
                      {expired ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-sm bg-oxblood-tint text-oxblood border border-oxblood/30 font-semibold">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Expired Certification
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase px-1.5 py-0.5 rounded-sm bg-moss-tint text-moss border border-moss/30 font-medium">
                          Active &amp; Current
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-ink-soft">
                      {f.valid_until ? (
                        <span>
                          {f.valid_from ? `${f.valid_from} → ` : "Through "}
                          <strong className={expired ? "text-oxblood font-semibold" : "text-ink"}>
                            {f.valid_until}
                          </strong>
                        </span>
                      ) : (
                        <span className="text-ink-faint">Continuous (Indefinite)</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px]">
                      {f.source_id ? (
                        <Link
                          href={`/brand/sources/${f.source_id}`}
                          className="text-accent hover:underline font-semibold"
                        >
                          [{f.source_key || "Source"}]
                        </Link>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openEdit(f)}
                            title="Edit fact"
                            className="p-1 rounded-sm text-ink-soft hover:text-ink hover:bg-paper-sunken border border-transparent hover:border-rule transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[1.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(f)}
                            title="Delete fact"
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

      {/* Admin Fact Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingFactId ? "Edit Certified Fact" : "Register Certified Brand Fact"}
        subtitle="Used by the governance engine to flag stale statistics and outdated certificates."
      >
        <form onSubmit={handleSave} className="space-y-4 font-sans text-xs">
          <div>
            <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
              Metric / Fact Key
            </label>
            <Input
              type="text"
              required
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              placeholder="e.g. Eco-Nylon 2023 Post-Consumer Recycling Rate"
              className="font-sans text-xs bg-paper"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Certified Value
              </label>
              <Input
                type="text"
                required
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="e.g. 78 or 2014"
                className="font-mono text-xs bg-paper"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Unit of Measure (Optional)
              </label>
              <Input
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="e.g. %, years, km"
                className="font-mono text-xs bg-paper"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Valid From (Optional)
              </label>
              <input
                type="date"
                value={formValidFrom}
                onChange={(e) => setFormValidFrom(e.target.value)}
                className="w-full h-8 px-2 rounded-sm bg-paper border border-rule font-mono text-xs text-ink"
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] text-ink-soft uppercase tracking-wider mb-1">
                Valid Until / Expiration
              </label>
              <input
                type="date"
                value={formValidUntil}
                onChange={(e) => setFormValidUntil(e.target.value)}
                className="w-full h-8 px-2 rounded-sm bg-paper border border-rule font-mono text-xs text-ink"
              />
            </div>
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

          <div className="p-3 bg-paper-sunken border border-rule rounded-sm font-mono text-[11px] text-ink-soft">
            <span className="font-semibold text-accent block uppercase mb-0.5">
              Stale-Stat Governance Protection
            </span>
            <span>
              If a draft cites this statistic after its expiration date, Lane 1 deterministic scan flags a Major violation citing the expired certificate.
            </span>
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
              {isPending ? "Saving..." : editingFactId ? "Save Fact" : "Register Fact"}
            </Button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
