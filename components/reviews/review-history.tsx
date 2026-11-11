"use client";

import * as React from "react";
import Link from "next/link";
import { DiffView } from "@/components/brandproof/diff-view";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Send,
  RefreshCw,
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ArrowLeft,
  Columns2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AuditEventItem {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string | null;
  actor: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  payload: Record<string, any>;
  createdAt: string;
}

export interface RevisionSnapshot {
  id: string;
  version: number;
  body: string;
  sourceVersionsSnapshot: Record<string, number>;
  createdAt: string;
  creatorName?: string;
}

export interface ReviewHistoryProps {
  contentItemId: string;
  draftTitle: string;
  channel: string;
  revisions: RevisionSnapshot[];
  events: AuditEventItem[];
}

export function ReviewHistory({
  contentItemId,
  draftTitle,
  channel,
  revisions,
  events,
}: ReviewHistoryProps) {
  // Revisions selector for Diff
  const [revAIndex, setRevAIndex] = React.useState<number>(0);
  const [revBIndex, setRevBIndex] = React.useState<number>(
    revisions.length > 1 ? revisions.length - 1 : 0
  );

  const revA = revisions[revAIndex] || revisions[0];
  const revB = revisions[revBIndex] || revisions[0];

  const getEventBadge = (eventType: string, payload: any) => {
    switch (eventType) {
      case "decision_made":
        if (payload.decision === "approved") {
          return {
            icon: CheckCircle2,
            color: "text-moss bg-moss/10 border-moss/30",
            label: "Approved by Reviewer",
          };
        }
        if (payload.decision === "changes_requested") {
          return {
            icon: AlertTriangle,
            color: "text-ochre bg-ochre/10 border-ochre/30",
            label: "Changes Requested",
          };
        }
        return {
          icon: XCircle,
          color: "text-oxblood bg-oxblood/10 border-oxblood/30",
          label: "Draft Rejected",
        };

      case "review_submitted_for_human_review":
      case "submitted_for_review":
        return {
          icon: Send,
          color: "text-accent bg-accent/10 border-accent/30",
          label: "Submitted for Human Review",
        };

      case "review_run":
        return {
          icon: RefreshCw,
          color: "text-ink-soft bg-paper-sunken border-rule",
          label: "Governance Scan Executed",
        };

      case "finding_accepted":
        return {
          icon: CheckCircle2,
          color: "text-moss bg-moss/10 border-moss/30",
          label: "Suggestion Accepted",
        };

      case "finding_edited":
        return {
          icon: CheckCircle2,
          color: "text-ochre bg-ochre/10 border-ochre/30",
          label: "Suggestion Edited & Applied",
        };

      case "finding_dismissed":
        return {
          icon: XCircle,
          color: "text-ochre bg-ochre/10 border-ochre/30",
          label: "Finding Dismissed with Reason",
        };

      case "finding_explained":
        return {
          icon: MessageSquare,
          color: "text-accent bg-accent/10 border-accent/30",
          label: "Finding Explained by Creator",
        };

      case "comment_added":
        return {
          icon: MessageSquare,
          color: "text-slate bg-slate/10 border-slate/30",
          label: "Editorial Comment Added",
        };

      case "source_version_changed":
        return {
          icon: BookOpen,
          color: "text-accent bg-accent/10 border-accent/30",
          label: "Brand Source Version Updated",
        };

      default:
        return {
          icon: History,
          color: "text-ink-soft bg-paper-sunken border-rule",
          label: eventType.replace(/_/g, " "),
        };
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Top Header */}
      <div className="bg-paper-raised border border-rule rounded-sm p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/reviews/${contentItemId}`}
              className="p-1.5 rounded-sm border border-rule hover:bg-paper text-ink-soft hover:text-ink transition-colors cursor-pointer"
              title="Return to Review Desk"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-ink-soft">
                <span className="uppercase px-1.5 py-0.2 rounded-sm bg-paper-sunken border border-rule">
                  {channel}
                </span>
                <span>Audit & Revision Provenance</span>
              </div>
              <h1 className="font-serif text-lg font-bold text-ink">{draftTitle}</h1>
            </div>
          </div>

          <Link
            href={`/reviews/${contentItemId}`}
            className="px-3.5 py-1.5 bg-accent hover:bg-accent/90 text-paper rounded-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
          >
            <span>Back to Review Desk</span>
          </Link>
        </div>
      </div>

      {/* Grid: Left Column Timeline, Right Column Revision Diff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* TIMELINE COLUMN (7 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-paper-raised border border-rule rounded-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-accent stroke-[1.75]" />
                <span className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
                  Immutable Audit Ledger ({events.length} Events)
                </span>
              </div>
              <span className="font-mono text-[10px] text-ink-soft">Append-Only</span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-rule">
              {events.length === 0 ? (
                <p className="text-ink-soft italic">No audit events recorded yet.</p>
              ) : (
                events.map((evt) => {
                  const badge = getEventBadge(evt.eventType, evt.payload);
                  const Icon = badge.icon;

                  return (
                    <div key={evt.id} className="relative group">
                      {/* Timeline Node dot */}
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-paper border border-rule flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                      </div>

                      {/* Event Card */}
                      <div className="bg-paper border border-rule rounded-sm p-3 space-y-1.5 shadow-hairline">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-mono text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-sm border",
                              badge.color
                            )}
                          >
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                          <span className="font-mono text-[10px] text-ink-soft flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(evt.createdAt).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Actor */}
                        <div className="text-[11px] text-ink-soft flex items-center gap-1.5">
                          <User className="w-3 h-3 text-ink-soft/70" />
                          <span>Action by: <strong className="text-ink">{evt.actor.fullName}</strong></span>
                        </div>

                        {/* Payload details if present */}
                        {evt.payload.reason && (
                          <div className="p-2 bg-paper-sunken border border-rule rounded-sm text-[11px] italic font-serif text-ink">
                            &ldquo;{evt.payload.reason}&rdquo;
                          </div>
                        )}
                        {evt.payload.resolution_note && (
                          <div className="p-2 bg-paper-sunken border border-rule rounded-sm text-[11px] italic font-serif text-ink">
                            Note: &ldquo;{evt.payload.resolution_note}&rdquo;
                          </div>
                        )}
                        {evt.payload.span_text && (
                          <div className="font-mono text-[10px] text-ink-soft">
                            Target text: &ldquo;{evt.payload.span_text}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* REVISION SELECTOR & DIFF COLUMN (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-paper-raised border border-rule rounded-sm p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-rule">
              <div className="flex items-center gap-2">
                <Columns2 className="w-4 h-4 text-accent stroke-[1.75]" />
                <span className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
                  Revision-to-Revision Comparison
                </span>
              </div>
              <span className="font-mono text-[10px] text-ink-soft">
                {revisions.length} Snapshots
              </span>
            </div>

            {/* Revision Selectors */}
            <div className="grid grid-cols-2 gap-3 p-2.5 bg-paper border border-rule rounded-sm font-mono text-[11px]">
              <div>
                <label className="block text-ink-soft mb-1">Baseline Revision (A)</label>
                <select
                  value={revAIndex}
                  onChange={(e) => setRevAIndex(Number(e.target.value))}
                  className="w-full bg-paper-raised border border-rule rounded-sm p-1.5 text-ink focus:outline-hidden"
                >
                  {revisions.map((r, i) => (
                    <option key={r.id} value={i}>
                      v{r.version} ({new Date(r.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-ink-soft mb-1">Target Revision (B)</label>
                <select
                  value={revBIndex}
                  onChange={(e) => setRevBIndex(Number(e.target.value))}
                  className="w-full bg-paper-raised border border-rule rounded-sm p-1.5 text-ink focus:outline-hidden"
                >
                  {revisions.map((r, i) => (
                    <option key={r.id} value={i}>
                      v{r.version} ({new Date(r.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diff View */}
            <div className="space-y-1">
              <div className="text-[11px] font-mono text-ink-soft">
                Comparing Revision v{revA.version} with Revision v{revB.version}:
              </div>
              <DiffView originalText={revA.body} revisedText={revB.body} />
            </div>

            {/* Source Versions in Scope */}
            {revB.sourceVersionsSnapshot && Object.keys(revB.sourceVersionsSnapshot).length > 0 && (
              <div className="pt-3 border-t border-rule space-y-2">
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-soft uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-accent" />
                  <span>Brand Pack Policies in Scope (Snapshot)</span>
                </div>
                <div className="bg-paper p-2.5 border border-rule rounded-sm space-y-1 font-mono text-[11px]">
                  {Object.entries(revB.sourceVersionsSnapshot).map(([sourceKey, ver]) => (
                    <div key={sourceKey} className="flex justify-between items-center text-ink">
                      <span>{sourceKey}</span>
                      <span className="text-ink-soft">Version {ver}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

