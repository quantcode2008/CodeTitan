"use client";

import * as React from "react";
import { AppShell } from "@/components/brandproof/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Settings, Shield, Key, Bell, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Settings", href: "/settings" },
      ]}
    >
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-rule pb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
            Workspace Configuration
          </span>
          <h1 className="font-serif text-2xl font-medium text-ink mt-1">
            Governance & Workspace Settings
          </h1>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Manage brand knowledge base sources, designated reviewer thresholds, and audit retention.
          </p>
        </div>

        {/* Workspace Identity */}
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <Settings className="w-4 h-4 text-accent stroke-[1.5]" />
            Workspace Profile
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Workspace Name"
              defaultValue="Aster & Pine (Demo)"
            />
            <Input
              label="Slug Identifier"
              defaultValue="aster-pine"
              disabled
              hint="Unique tenant slug used for private storage paths"
            />
          </div>
        </div>

        {/* Governance & Review Policy */}
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <Shield className="w-4 h-4 text-accent stroke-[1.5]" />
            Governance Thresholds
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Critical Severity Routing"
              defaultValue="designated"
              options={[
                { value: "designated", label: "Require Designated Reviewer Sign-off" },
                { value: "any_reviewer", label: "Any Reviewer" },
                { value: "admin_only", label: "Admin Only" },
              ]}
              hint="High-risk claims require designated reviewer approval"
            />
            <Select
              label="Audit Log Retention"
              defaultValue="immutable"
              options={[
                { value: "immutable", label: "Permanent Immutable Ledger (Append-Only)" },
                { value: "7years", label: "7 Years Statutory Regulatory Hold" },
              ]}
              hint="Append-only Postgres ledger protected by DB triggers"
            />
          </div>
        </div>

        {/* Database & LLM Connections */}
        <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rule text-sm font-serif font-medium text-ink">
            <Database className="w-4 h-4 text-accent stroke-[1.5]" />
            Infrastructure Status
          </div>
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 bg-paper rounded-sm border border-rule">
              <div>
                <p className="font-semibold text-ink">Supabase PostgreSQL</p>
                <p className="text-[11px] text-ink-faint">Connected to frwyivmydlskebnjgybl.supabase.co</p>
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-moss-tint text-moss border border-moss/30 font-medium text-[10px]">
                Active (14 Tables, RLS Enabled)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-paper rounded-sm border border-rule">
              <div>
                <p className="font-semibold text-ink">LLM Governance Provider</p>
                <p className="text-[11px] text-ink-faint">Gemini Provider / Calibrated Tone Engine</p>
              </div>
              <span className="px-2 py-0.5 rounded-sm bg-accent-soft text-accent border border-accent/30 font-medium text-[10px]">
                Ready (Prompt-Isolated)
              </span>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary">Discard Changes</Button>
          <Button variant="primary">Save Configuration</Button>
        </div>
      </div>
    </AppShell>
  );
}
