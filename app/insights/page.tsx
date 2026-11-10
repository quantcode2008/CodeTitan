"use client";

import * as React from "react";
import { AppShell } from "@/components/brandproof/app-shell";
import { SeverityMark } from "@/components/brandproof/severity-mark";
import { BarChart2, ShieldCheck, History, AlertTriangle, FileCheck2 } from "lucide-react";

export default function InsightsPage() {
  const auditLogs = [
    {
      id: "LOG-001",
      event: "workspace_seeded",
      actor: "Elena Vance (Admin)",
      role: "admin",
      target: "Aster & Pine Workspace",
      timestamp: "2026-11-09 21:00 UTC",
      detail: "Seeded 12 brand sources, 6 terms, and 3 review drafts.",
    },
    {
      id: "LOG-002",
      event: "scan_executed",
      actor: "Deterministic & LLM Engine",
      role: "system",
      target: "SummitX Expedition Pack Draft",
      timestamp: "2026-11-09 21:05 UTC",
      detail: "Triggered 3 findings (1 critical claim, 1 prohibited term, 1 tone drift).",
    },
    {
      id: "LOG-003",
      event: "scan_executed",
      actor: "Deterministic Engine",
      role: "system",
      target: "TrailLite Recycled Shell Jacket Draft",
      timestamp: "2026-11-09 21:10 UTC",
      detail: "Triggered 2 findings (1 stale fact, 1 prohibited term).",
    },
    {
      id: "LOG-004",
      event: "draft_submitted",
      actor: "Liam Patel (Creator)",
      role: "creator",
      target: "Field Care & Waxing Guide Draft",
      timestamp: "2026-11-09 21:15 UTC",
      detail: "Clean automated scan (0 findings). Transitioned to ready_for_review.",
    },
  ];

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Insights & Audit Trail", href: "/insights" },
      ]}
    >
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 font-sans">
        {/* Header */}
        <div className="border-b border-rule pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              Audited Governance Ledger
            </span>
            <h1 className="font-serif text-2xl font-medium text-ink mt-1">
              Governance Insights & Permanent Audit Log
            </h1>
            <p className="font-sans text-xs text-ink-soft mt-1">
              Every automated scan, finding resolution, and human reviewer decision is recorded to an append-only ledger.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-soft">
            <span className="w-2 h-2 rounded-none bg-moss" />
            Append-Only Database Ledger Active
          </div>
        </div>

        {/* Audit Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-1">
            <span className="font-mono text-[10px] uppercase text-ink-faint">
              Active Documents
            </span>
            <p className="font-serif text-2xl font-semibold text-ink">3</p>
            <p className="text-[11px] text-ink-soft font-sans">
              In active governance review
            </p>
          </div>

          <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-1">
            <span className="font-mono text-[10px] uppercase text-oxblood">
              Critical Findings
            </span>
            <p className="font-serif text-2xl font-semibold text-oxblood">2</p>
            <p className="text-[11px] text-ink-soft font-sans">
              Require designated reviewer sign-off
            </p>
          </div>

          <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-1">
            <span className="font-mono text-[10px] uppercase text-ochre">
              Stale Facts Detected
            </span>
            <p className="font-serif text-2xl font-semibold text-ochre">1</p>
            <p className="text-[11px] text-ink-soft font-sans">
              Expired 2024 recycling certification
            </p>
          </div>

          <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-1">
            <span className="font-mono text-[10px] uppercase text-moss">
              Approved Policies
            </span>
            <p className="font-serif text-2xl font-semibold text-moss">12</p>
            <p className="text-[11px] text-ink-soft font-sans">
              Brand pack authoritative sources
            </p>
          </div>
        </div>

        {/* Append-Only Audit Ledger Table */}
        <div className="rounded-sm bg-paper-raised border border-rule overflow-hidden">
          <div className="px-5 py-3 border-b border-rule bg-paper flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-accent stroke-[1.5]" />
              <h3 className="font-serif text-sm font-medium text-ink">
                Immutable Governance Event Ledger (audit_events)
              </h3>
            </div>
            <span className="font-mono text-[11px] text-ink-faint">
              UPDATE &amp; DELETE Strictly Blocked
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper-sunken/60 border-b border-rule text-ink-soft font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-4">Event ID</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Target Entity</th>
                  <th className="py-2.5 px-4">Audit Payload / Rationale</th>
                  <th className="py-2.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule-soft">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-paper/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-ink">
                      {log.id}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-accent font-medium">
                      {log.event}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-ink">
                      {log.actor}
                    </td>
                    <td className="py-2.5 px-4 font-serif text-ink-soft">
                      {log.target}
                    </td>
                    <td className="py-2.5 px-4 font-sans text-xs text-ink-soft max-w-xs truncate">
                      {log.detail}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-ink-faint">
                      {log.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
