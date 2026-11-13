"use client";

import * as React from "react";
import Link from "next/link";
import {
  FindingsCategoryBreakdown,
  TrippedSourceMetric,
  RecurrenceCategoryMetric,
  UnclearGuidelineMetric,
  ReviewCycleTimeMetric,
  EvidenceCoverageMetric,
  SeverityTrendPoint,
  StaleSourceItem,
} from "@/lib/insights/types";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  BookOpen,
  Edit3,
  HelpCircle,
  TrendingDown,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editorial Metric Callout Card
 */
export function MetricCard({
  label,
  value,
  subtext,
  statusText,
  variant = "default",
  isLowN = false,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  statusText?: string;
  variant?: "default" | "moss" | "ochre" | "oxblood";
  isLowN?: boolean;
}) {
  return (
    <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-1.5 font-sans shadow-hairline">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-soft">
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "font-serif text-3xl font-bold tracking-tight",
          variant === "moss" && "text-moss",
          variant === "ochre" && "text-ochre",
          variant === "oxblood" && "text-oxblood",
          variant === "default" && "text-ink",
          isLowN && "text-ink-soft text-xl font-normal font-sans"
        )}
      >
        {value}
      </div>
      {subtext && <p className="text-[11px] text-ink-soft font-sans leading-relaxed">{subtext}</p>}
      {statusText && (
        <div className="font-mono text-[10px] text-ink-soft/80 pt-1 border-t border-rule/50">
          {statusText}
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal Proportional Bar Chart with Direct Labels
 */
export function CategoryBreakdownChart({
  breakdown,
  insightSentence,
}: {
  breakdown: FindingsCategoryBreakdown[];
  insightSentence: string;
}) {
  const maxCount = Math.max(...breakdown.map((b) => b.count), 1);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "claim":
        return "bg-oxblood";
      case "terminology":
        return "bg-ochre";
      case "fact":
        return "bg-slate";
      case "tone":
        return "bg-accent";
      case "visual":
      case "asset":
        return "bg-moss";
      default:
        return "bg-ink-soft";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "claim":
        return "Promotional Claims";
      case "terminology":
        return "Terminology & Phrases";
      case "fact":
        return "Fact Verification";
      case "tone":
        return "Tone of Voice";
      case "visual":
      case "asset":
        return "Brand Assets & Visual";
      default:
        return "Other Governance";
    }
  };

  return (
    <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
            Distribution by Governance Dimension
          </span>
          <h3 className="font-serif text-base font-semibold text-ink">
            Findings by Category & Severity
          </h3>
        </div>
        <span className="font-mono text-[10px] text-ink-soft">Direct Proportional Scaling</span>
      </div>

      {/* Bar Rows with Direct Labels */}
      <div className="space-y-3 pt-1">
        {breakdown.map((item) => {
          const widthPct = Math.max(Math.round((item.count / maxCount) * 100), 2);

          return (
            <div key={item.category} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-medium text-ink">{getCategoryLabel(item.category)}</span>
                <span className="font-mono text-ink-soft">
                  <strong className="text-ink font-semibold">{item.count}</strong> flags ({item.percentage}%)
                </span>
              </div>

              {/* Bar */}
              <div className="h-3 w-full bg-paper rounded-xs overflow-hidden border border-rule/50 flex">
                <div
                  style={{ width: `${widthPct}%` }}
                  className={cn("h-full transition-all duration-300", getCategoryColor(item.category))}
                />
              </div>

              {/* Severity breakdown pill hints */}
              {item.count > 0 && (
                <div className="flex items-center gap-2 font-mono text-[9px] text-ink-soft/80 pl-0.5">
                  {item.criticalCount > 0 && (
                    <span className="text-oxblood font-semibold">{item.criticalCount} Critical</span>
                  )}
                  {item.majorCount > 0 && (
                    <span className="text-ochre">{item.majorCount} Major</span>
                  )}
                  {item.minorCount > 0 && (
                    <span className="text-slate">{item.minorCount} Minor</span>
                  )}
                  {item.advisoryCount > 0 && (
                    <span>{item.advisoryCount} Advisory</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Insight Sentence */}
      <div className="p-2.5 bg-paper rounded-sm border border-rule text-[11px] text-ink font-serif italic">
        &ldquo;{insightSentence}&rdquo;
      </div>
    </div>
  );
}

/**
 * Most Tripped Rules / Sources Chart
 */
export function TrippedRulesChart({
  sources,
  insightSentence,
}: {
  sources: TrippedSourceMetric[];
  insightSentence: string;
}) {
  const maxCitations = Math.max(...sources.map((s) => s.citationCount), 1);

  return (
    <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
            Knowledge Base Friction
          </span>
          <h3 className="font-serif text-base font-semibold text-ink">
            Rules Creators Trip Most
          </h3>
        </div>
        <span className="font-mono text-[10px] text-ink-soft">Top 5 Policies</span>
      </div>

      {sources.length === 0 ? (
        <p className="text-ink-soft italic py-4">No policy citations recorded yet.</p>
      ) : (
        <div className="space-y-3 pt-1">
          {sources.map((source) => {
            const widthPct = Math.max(Math.round((source.citationCount / maxCitations) * 100), 4);

            return (
              <div key={source.sourceKey} className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                    <span className="font-mono font-semibold text-accent px-1 py-0.2 bg-paper border border-rule rounded-xs">
                      {source.sourceKey}
                    </span>
                    <span className="font-medium text-ink truncate">{source.title}</span>
                  </div>
                  <span className="font-mono text-ink-soft">
                    <strong className="text-ink font-semibold">{source.citationCount}</strong> citations ({source.percentage}%)
                  </span>
                </div>

                <div className="h-3 w-full bg-paper rounded-xs overflow-hidden border border-rule/50">
                  <div
                    style={{ width: `${widthPct}%` }}
                    className="h-full bg-accent transition-all duration-300"
                  />
                </div>

                <div className="flex items-center gap-3 font-mono text-[9px] text-ink-soft">
                  <span>Accepted: {source.acceptedCount}</span>
                  <span>·</span>
                  <span>Dismissed: {source.dismissedCount}</span>
                  <span>·</span>
                  <span>Explained: {source.explainedCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insight Sentence */}
      <div className="p-2.5 bg-paper rounded-sm border border-rule text-[11px] text-ink font-serif italic">
        &ldquo;{insightSentence}&rdquo;
      </div>
    </div>
  );
}

/**
 * Small Multiples: Recurrence Rates across Revisions
 */
export function RecurrenceSmallMultiples({
  recurrenceRates,
  overallRate,
  insightSentence,
}: {
  recurrenceRates: RecurrenceCategoryMetric[];
  overallRate: number;
  insightSentence: string;
}) {
  return (
    <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft font-semibold">
            Resolution Stickiness
          </span>
          <h3 className="font-serif text-base font-semibold text-ink">
            Finding Recurrence Across Draft Revisions (v1 ➔ v2)
          </h3>
        </div>
        <div className="font-mono text-[11px] text-ink">
          Overall Recurrence: <strong className="text-accent">{overallRate}%</strong>
        </div>
      </div>

      {/* Small Multiples Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {recurrenceRates.map((r) => (
          <div
            key={r.category}
            className="p-3 bg-paper border border-rule rounded-sm space-y-2 text-center"
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-soft truncate">
              {r.category}
            </div>
            <div
              className={cn(
                "font-serif text-2xl font-bold",
                r.recurrenceRate > 30 ? "text-oxblood" : r.recurrenceRate > 0 ? "text-ochre" : "text-moss"
              )}
            >
              {r.recurrenceRate}%
            </div>
            <div className="font-mono text-[9px] text-ink-soft/80">
              {r.recurrentCount} of {r.initialCount} recurrent
            </div>
          </div>
        ))}
      </div>

      {/* Insight Sentence */}
      <div className="p-2.5 bg-paper rounded-sm border border-rule text-[11px] text-ink font-serif italic">
        &ldquo;{insightSentence}&rdquo;
      </div>
    </div>
  );
}

/**
 * "Possibly Unclear Guidelines" Panel with Admin Action Links
 */
export function UnclearGuidelinesPanel({
  guidelines,
}: {
  guidelines: UnclearGuidelineMetric[];
}) {
  return (
    <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-ochre stroke-[1.75]" />
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ochre font-semibold">
              Policy Clarity Diagnostics
            </span>
            <h3 className="font-serif text-base font-semibold text-ink">
              Possibly Unclear Guidelines
            </h3>
          </div>
        </div>
        <span className="font-mono text-[10px] text-ink-soft">High Override / Dismissal Ratio</span>
      </div>

      {guidelines.length === 0 ? (
        <div className="p-4 bg-paper rounded-sm border border-rule text-center text-ink-soft">
          <ShieldCheck className="w-5 h-5 text-moss mx-auto mb-1 stroke-[1.5]" />
          <p className="text-xs font-medium text-ink">All Brand Guidelines Operating Smoothly</p>
          <p className="text-[11px] mt-0.5">
            No guidelines currently exhibit an unusually high creator dismissal or explanation rate.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {guidelines.map((g) => (
            <div
              key={g.sourceKey}
              className="p-3.5 bg-paper border border-rule rounded-sm space-y-2 shadow-hairline"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-accent bg-paper-sunken px-1.5 py-0.5 rounded-sm border border-rule">
                    {g.sourceKey}
                  </span>
                  <span className="font-serif font-semibold text-ink text-sm">{g.title}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-ochre font-semibold bg-ochre/10 border border-ochre/30 px-1.5 py-0.5 rounded-sm">
                    {g.overrideRate}% Override Rate
                  </span>
                  <span className="text-ink-soft">({g.overrideCount} of {g.totalCitations} dismissed/explained)</span>
                </div>
              </div>

              {/* Plain language suggestion for admin */}
              <p className="text-[11px] text-ink leading-relaxed font-sans bg-paper-raised p-2.5 rounded-sm border border-rule">
                <strong className="text-accent font-semibold">Recommendation for Brand Admin:</strong>{" "}
                {g.suggestion}
              </p>

              <div className="flex items-center justify-between pt-1 font-mono text-[11px]">
                <span className="text-ink-soft text-[10px]">Source ID: {g.sourceId.slice(0, 8)}...</span>
                <Link
                  href={`/brand/sources/${g.sourceId}`}
                  className="text-accent hover:underline flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Brand Source Policy</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Stale Sources Panel (Past Freshness Date)
 */
export function StaleSourcesPanel({ sources }: { sources: StaleSourceItem[] }) {
  return (
    <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-4 font-sans text-xs">
      <div className="flex items-center justify-between border-b border-rule pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-oxblood stroke-[1.75]" />
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-oxblood font-semibold">
              Freshness Auditing
            </span>
            <h3 className="font-serif text-base font-semibold text-ink">
              Stale Sources Past Review Date
            </h3>
          </div>
        </div>
        <span className="font-mono text-[10px] text-ink-soft">{sources.length} Overdue</span>
      </div>

      {sources.length === 0 ? (
        <div className="p-4 bg-paper rounded-sm border border-rule text-center text-ink-soft">
          <ShieldCheck className="w-5 h-5 text-moss mx-auto mb-1 stroke-[1.5]" />
          <p className="text-xs font-medium text-ink">All Knowledge Base Policies Fresh</p>
          <p className="text-[11px] mt-0.5">
            Every active brand guideline and claim sheet is within its validity horizon.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="p-3 bg-paper border border-rule rounded-sm flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5 truncate">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-accent font-semibold px-1 py-0.2 bg-paper-sunken border border-rule rounded-xs">
                    {s.sourceKey}
                  </span>
                  <span className="font-medium text-ink truncate">{s.title}</span>
                </div>
                <div className="font-mono text-[10px] text-oxblood font-semibold">
                  Expired on {new Date(s.reviewBy).toLocaleDateString()} ({s.daysOverdue} days past review date)
                </div>
              </div>

              <Link
                href={`/brand/sources/${s.id}`}
                className="px-2.5 py-1 bg-paper-raised hover:bg-paper border border-rule rounded-sm font-mono text-[11px] text-ink flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>Review Policy</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

