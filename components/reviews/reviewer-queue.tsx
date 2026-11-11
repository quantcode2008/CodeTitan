"use client";

import * as React from "react";
import Link from "next/link";
import { ReviewStatus, SeverityLevel } from "@/lib/database.types";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Filter,
  User,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lock,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QueueItem {
  id: string; // content_item_id
  reviewId: string;
  title: string;
  channel: string;
  contentType: string;
  status: ReviewStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  openCounts: {
    critical: number;
    major: number;
    minor: number;
    advisory: number;
    total: number;
  };
  requiresDesignatedReviewer: boolean;
  highestSeverity: SeverityLevel | "none";
}

export interface ReviewerQueueProps {
  items: QueueItem[];
  currentUserRole: "admin" | "reviewer" | "creator";
  isDesignatedReviewer: boolean;
  currentUserId: string;
}

export function ReviewerQueue({
  items,
  currentUserRole,
  isDesignatedReviewer,
  currentUserId,
}: ReviewerQueueProps) {
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("ready_for_review");
  const [designatedOnly, setDesignatedOnly] = React.useState<boolean>(false);

  const isAdmin = currentUserRole === "admin";
  const canDecideHighRisk = isAdmin || isDesignatedReviewer;

  // Filter & Prioritise Items
  const filteredAndSortedItems = React.useMemo(() => {
    return items
      .filter((item) => {
        if (channelFilter !== "all" && item.channel !== channelFilter) return false;
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        if (designatedOnly && !item.requiresDesignatedReviewer) return false;
        return true;
      })
      .sort((a, b) => {
        // Priority rank: Critical (4) > Major (3) > Minor (2) > Advisory (1) > None (0)
        const rank = (sev: SeverityLevel | "none") => {
          if (sev === "critical") return 4;
          if (sev === "major") return 3;
          if (sev === "minor") return 2;
          if (sev === "advisory") return 1;
          return 0;
        };

        const rankDiff = rank(b.highestSeverity) - rank(a.highestSeverity);
        if (rankDiff !== 0) return rankDiff;

        // Secondary sort: Age in queue (older pending items first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [items, channelFilter, statusFilter, designatedOnly]);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Queue Header & Filters */}
      <div className="bg-paper-raised border border-rule rounded-sm p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <Layers className="w-5 h-5 text-accent stroke-[1.75]" />
              Human Governance Review Queue
            </h1>
            <p className="text-ink-soft text-xs mt-0.5">
              Prioritised editorial review backlog ordered by risk severity and queue age.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule text-ink-soft">
              {filteredAndSortedItems.length} items in view
            </span>
            {isDesignatedReviewer && (
              <span className="px-2 py-0.5 rounded-sm bg-oxblood/10 border border-oxblood/30 text-oxblood font-medium">
                Designated Reviewer
              </span>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-rule font-mono text-[11px] text-ink-soft">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              <span>Channel:</span>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-paper border border-rule rounded-sm px-1.5 py-0.5 text-ink cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Channels</option>
                <option value="web">Web</option>
                <option value="social">Social</option>
                <option value="email">Email</option>
                <option value="press">Press</option>
                <option value="ad">Ad</option>
                <option value="other">Other</option>
              </select>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={designatedOnly}
                onChange={(e) => setDesignatedOnly(e.target.checked)}
                className="rounded-sm border-rule text-accent focus:ring-accent h-3.5 w-3.5"
              />
              <span>Designated Reviewer Only</span>
            </label>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1">
            {[
              { id: "ready_for_review", label: "Ready for Review" },
              { id: "needs_attention", label: "Needs Attention" },
              { id: "changes_requested", label: "Changes Requested" },
              { id: "approved", label: "Approved" },
              { id: "all", label: "All Items" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-2 py-0.5 rounded-sm border cursor-pointer transition-colors",
                  statusFilter === tab.id
                    ? "bg-accent/10 border-accent text-accent font-semibold"
                    : "border-rule text-ink-soft hover:text-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Queue List Table / Rows */}
      <div className="bg-paper-raised border border-rule rounded-sm divide-y divide-rule overflow-hidden shadow-hairline">
        {filteredAndSortedItems.length === 0 ? (
          <div className="p-12 text-center text-ink-soft space-y-2">
            <ShieldCheck className="w-8 h-8 text-moss/60 mx-auto stroke-[1.2]" />
            <h3 className="font-serif text-base font-semibold text-ink">
              Review Queue is Clear
            </h3>
            <p className="text-xs max-w-sm mx-auto">
              No submissions match the current filter criteria. New submissions will appear here once submitted by creators.
            </p>
          </div>
        ) : (
          filteredAndSortedItems.map((item) => {
            const isCreatorOfDraft = item.creator.id === currentUserId;
            const requiresDesignated = item.requiresDesignatedReviewer;
            const isActionable =
              (!requiresDesignated || canDecideHighRisk) && (!isCreatorOfDraft || isAdmin);

            return (
              <div
                key={item.id}
                className="p-4 hover:bg-paper transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Metadata & Title */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span className="uppercase px-1.5 py-0.2 rounded-sm bg-paper-sunken border border-rule text-ink-soft">
                      {item.channel}
                    </span>
                    <span className="text-ink-soft">v{item.version}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-ink-soft">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {requiresDesignated && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-sm bg-oxblood/10 border border-oxblood/30 text-oxblood font-semibold">
                        <ShieldAlert className="w-3 h-3" />
                        Designated Reviewer Required
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/reviews/${item.id}`}
                    className="font-serif text-base font-bold text-ink hover:text-accent transition-colors block truncate"
                  >
                    {item.title}
                  </Link>

                  <div className="flex items-center gap-2 text-ink-soft text-[11px]">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-ink-soft/70" />
                      Creator: {item.creator.fullName}
                    </span>
                    {isCreatorOfDraft && (
                      <span className="font-mono text-[10px] text-ochre bg-ochre/10 px-1 rounded-sm border border-ochre/30">
                        (Your submission)
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: Open Findings Breakdown Pills */}
                <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                  {item.openCounts.critical > 0 && (
                    <span className="px-2 py-0.5 rounded-sm bg-oxblood/10 border border-oxblood/30 text-oxblood font-semibold">
                      {item.openCounts.critical} Critical
                    </span>
                  )}
                  {item.openCounts.major > 0 && (
                    <span className="px-2 py-0.5 rounded-sm bg-ochre/10 border border-ochre/30 text-ochre font-semibold">
                      {item.openCounts.major} Major
                    </span>
                  )}
                  {item.openCounts.minor > 0 && (
                    <span className="px-2 py-0.5 rounded-sm bg-slate/10 border border-slate/30 text-slate">
                      {item.openCounts.minor} Minor
                    </span>
                  )}
                  {item.openCounts.total === 0 && (
                    <span className="px-2 py-0.5 rounded-sm bg-moss/10 border border-moss/30 text-moss font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      0 Open Findings
                    </span>
                  )}
                </div>

                {/* Right: Status & Action CTA */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "font-mono text-[11px] px-2 py-0.5 rounded-sm uppercase tracking-wide border",
                      item.status === "approved" && "bg-moss/10 border-moss/30 text-moss font-semibold",
                      item.status === "changes_requested" && "bg-ochre/10 border-ochre/30 text-ochre font-semibold",
                      item.status === "rejected" && "bg-oxblood/10 border-oxblood/30 text-oxblood font-semibold",
                      item.status === "ready_for_review" && "bg-accent/10 border-accent/30 text-accent font-semibold",
                      item.status === "needs_attention" && "bg-ochre/5 border-ochre/20 text-ochre"
                    )}
                  >
                    {item.status.replace(/_/g, " ")}
                  </span>

                  <Link
                    href={`/reviews/${item.id}`}
                    className={cn(
                      "px-3.5 py-1.5 rounded-sm text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                      isActionable
                        ? "bg-accent hover:bg-accent/90 text-paper shadow-hairline"
                        : "bg-paper-sunken border border-rule text-ink-soft hover:text-ink"
                    )}
                  >
                    {!isActionable && <Lock className="w-3 h-3 text-ink-soft" />}
                    <span>{isActionable ? "Inspect & Decide" : "Inspect Draft"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

