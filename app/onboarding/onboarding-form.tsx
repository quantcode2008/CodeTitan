"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkspaceAction, joinWorkspaceAction } from "@/lib/actions/workspaces";
import { ArrowRight, AlertCircle, Building2, UserPlus, CheckCircle2 } from "lucide-react";

export function OnboardingForm() {
  const [tab, setTab] = React.useState<"create" | "join">("create");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  // Create fields
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");

  // Join fields
  const [joinSlug, setJoinSlug] = React.useState("");

  function handleNameChange(val: string) {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("description", description);

    startTransition(async () => {
      const res = await createWorkspaceAction(null, formData);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });
  }

  async function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("slug", joinSlug);

    startTransition(async () => {
      const res = await joinWorkspaceAction(null, formData);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Switcher */}
      <div className="flex border-b border-rule" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          onClick={() => {
            setTab("create");
            setErrorMsg(null);
          }}
          className={`pb-2.5 px-4 text-xs font-mono font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer flex items-center gap-1.5 ${
            tab === "create"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 stroke-[1.5]" />
          Create New Workspace
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "join"}
          onClick={() => {
            setTab("join");
            setErrorMsg(null);
          }}
          className={`pb-2.5 px-4 text-xs font-mono font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer flex items-center gap-1.5 ${
            tab === "join"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 stroke-[1.5]" />
          Join Existing
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-sm bg-oxblood-tint/60 border border-oxblood/30 text-oxblood text-xs font-sans flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {tab === "create" ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
              Brand / Workspace Name
            </label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Aster & Pine Outdoor Co."
              className="font-sans text-sm bg-paper"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
              Workspace URL Slug
            </label>
            <div className="flex items-center">
              <span className="px-2.5 py-2 bg-paper-sunken border border-r-0 border-rule text-xs font-mono text-ink-soft rounded-l-sm">
                brandproof.app/
              </span>
              <Input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="aster-and-pine"
                className="font-mono text-xs bg-paper rounded-l-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">
              Unique identifier used in your workspace URLs and API requests.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
              Brand Mission / Scope (Optional)
            </label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Technical mountaineering apparel and trail gear"
              className="font-sans text-sm bg-paper"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="w-full justify-center text-xs tracking-wider uppercase font-mono py-2.5 mt-2"
          >
            {isPending ? "Configuring Workspace..." : "Initialize Workspace as Admin"}
            <ArrowRight className="w-3.5 h-3.5 ml-2 stroke-[1.5]" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
              Workspace Slug or Invite Code
            </label>
            <Input
              type="text"
              required
              value={joinSlug}
              onChange={(e) => setJoinSlug(e.target.value)}
              placeholder="e.g. aster-and-pine"
              className="font-mono text-sm bg-paper"
            />
            <p className="mt-1 text-[11px] text-ink-soft">
              Enter the unique brand slug provided by your workspace admin.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="w-full justify-center text-xs tracking-wider uppercase font-mono py-2.5 mt-2"
          >
            {isPending ? "Connecting to Workspace..." : "Join Workspace as Creator"}
            <ArrowRight className="w-3.5 h-3.5 ml-2 stroke-[1.5]" />
          </Button>

          <div className="p-3 rounded-sm bg-paper-sunken border border-rule text-xs text-ink-soft">
            <span className="font-mono font-semibold text-accent uppercase text-[10px] block mb-1">
              Demo Quick-Join
            </span>
            <span>
              To join the pre-seeded demo brand, enter: <code className="font-mono text-ink font-semibold">aster-and-pine</code>.
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
