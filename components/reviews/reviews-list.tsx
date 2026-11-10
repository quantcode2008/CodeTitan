"use client";

import * as React from "react";
import Link from "next/link";
import { ReviewStatus, ContentChannel, SeverityLevel } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  Clock,
  ArrowRight,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";

export interface ReviewItemSummary {
  id: string; // content_item_id
  title: string;
  channel: ContentChannel;
  contentType: string;
  revisionVersion: number;
  reviewId?: string;
  status: ReviewStatus;
  updatedAt: string;
  openFindingsCount: {
    critical: number;
    major: number;
    minor: number;
    advisory: number;
    total: number;
  };
}

export interface ReviewsListProps {
  items: ReviewItemSummary[];
  currentRole: string;
}

export function ReviewsList({ items, currentRole }: ReviewsListProps) {
  const [filter, setFilter] = React.useState<"all" | "attention" | "ready" | "draft">("all");

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (filter === "attention") return item.status === "needs_attention";
      if (filter === "ready") return item.status === "ready_for_review";
      if (filter === "draft") return item.status === "draft";
      return true;
    });
  }, [items, filter]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
              filter === "all"
                ? "bg-ink text-paper font-medium"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            All Submissions ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("attention")}
            className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
              filter === "attention"
                ? "bg-ink text-paper font-medium"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Needs Attention ({items.filter((i) => i.status === "needs_attention").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("ready")}
            className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
              filter === "ready"
                ? "bg-ink text-paper font-medium"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Ready for Review ({items.filter((i) => i.status === "ready_for_review").length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("draft")}
            className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
              filter === "draft"
                ? "bg-ink text-paper font-medium"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Drafts ({items.filter((i) => i.status === "draft").length})
          </button>
        </div>

        <Link href="/reviews/new">
          <Button variant="primary" size="sm" className="font-sans text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Submission
          </Button>
        </Link>
      </div>

      {/* Submissions Table / List */}
      <div className="bg-paper-raised border border-rule rounded-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-8 h-8 text-ink-soft mx-auto stroke-[1.5]" />
            <h3 className="font-serif text-base font-medium text-ink">
              No submissions found
            </h3>
            <p className="font-sans text-xs text-ink-soft max-w-sm mx-auto">
              {filter === "all"
                ? "No draft copy submitted yet. Use the submission slip to run your first proofreader governance scan."
                : `No drafts currently in "${filter.replace("_", " ")}" status.`}
            </p>
            {filter === "all" && (
              <div className="pt-2">
                <Link href="/reviews/new">
                  <Button variant="primary" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Submit First Draft
                  </Button>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-rule font-sans text-xs">
            {filteredItems.map((item) => {
              const statusConfig = getStatusConfig(item.status);
              const { critical, major, minor, advisory, total } = item.openFindingsCount;

              return (
                <div
                  key={item.id}
                  className="p-4.5 hover:bg-paper transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Metadata & Title */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      <span className="px-1.5 py-0.5 rounded-sm bg-paper border border-rule uppercase text-ink-soft">
                        {item.channel}
                      </span>
                      <span className="text-ink-soft">v{item.revisionVersion}</span>
                      <span className="text-rule">•</span>
                      <span className="text-ink-soft flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.updatedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h2 className="font-serif text-base font-medium text-ink truncate">
                      {item.title}
                    </h2>
                  </div>

                  {/* Right: Status & Severity Badges & Action */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0">
                    {/* Severity Pills (if findings exist) */}
                    {total > 0 ? (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        {critical > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-oxblood-tint text-oxblood border border-oxblood/30 font-semibold"
                            title={`${critical} critical findings`}
                          >
                            <AlertOctagon className="w-3 h-3" />
                            {critical} Critical
                          </span>
                        )}
                        {major > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-ochre-tint text-ochre border border-ochre/30 font-medium"
                            title={`${major} major findings`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {major} Major
                          </span>
                        )}
                        {minor + advisory > 0 && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-paper-sunken text-ink-soft border border-rule font-medium"
                            title={`${minor + advisory} minor/advisory findings`}
                          >
                            <Info className="w-3 h-3" />
                            {minor + advisory} Minor
                          </span>
                        )}
                      </div>
                    ) : item.status === "ready_for_review" ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-sm bg-moss-tint text-moss border border-moss/30 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Scan Clean (0 Findings)
                      </span>
                    ) : null}

                    {/* Overall Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-2 py-1 rounded-sm border font-medium ${statusConfig.className}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                      {statusConfig.label}
                    </span>

                    {/* Action Button */}
                    <Link
                      href="/reviews/new"
                      className="inline-flex items-center justify-center font-sans text-xs h-8 px-3 rounded-sm border border-rule bg-paper-raised hover:bg-paper text-ink transition-colors"
                    >
                      Inspect <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusConfig(status: ReviewStatus): {
  label: string;
  className: string;
  dotClass: string;
} {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        className: "bg-paper-sunken text-ink-soft border-rule",
        dotClass: "bg-ink-soft/60",
      };
    case "needs_attention":
      return {
        label: "Needs Attention",
        className: "bg-oxblood/10 text-oxblood border-oxblood/30",
        dotClass: "bg-oxblood",
      };
    case "ready_for_review":
      return {
        label: "Ready for Review",
        className: "bg-slate/10 text-slate border-slate/30",
        dotClass: "bg-slate",
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-moss/10 text-moss border-moss/30",
        dotClass: "bg-moss",
      };
    case "changes_requested":
      return {
        label: "Changes Requested",
        className: "bg-ochre/10 text-ochre border-ochre/30",
        dotClass: "bg-ochre",
      };
    case "rejected":
      return {
        label: "Rejected",
        className: "bg-oxblood/10 text-oxblood border-oxblood/30",
        dotClass: "bg-oxblood",
      };
    default:
      return {
        label: status,
        className: "bg-paper text-ink border-rule",
        dotClass: "bg-ink-soft",
      };
  }
}
