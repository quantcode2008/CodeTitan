"use client";

import * as React from "react";
import { GovernanceInsightsData } from "@/lib/insights/types";
import {
  MetricCard,
  CategoryBreakdownChart,
  TrippedRulesChart,
  RecurrenceSmallMultiples,
  UnclearGuidelinesPanel,
  StaleSourcesPanel,
} from "./editorial-charts";
import {
  getGovernanceInsightsAction,
  seedDemoHistoryAction,
  clearDemoHistoryAction,
} from "@/lib/actions/insights";
import {
  BarChart2,
  RefreshCw,
  Database,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Layers,
  Trash2,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface InsightsDashboardProps {
  initialData: GovernanceInsightsData;
  currentUserRole: "admin" | "reviewer" | "creator";
}

export function InsightsDashboard({
  initialData,
  currentUserRole,
}: InsightsDashboardProps) {
  const [data, setData] = React.useState<GovernanceInsightsData>(initialData);
  const [includeDemo, setIncludeDemo] = React.useState<boolean>(initialData.isDemoDataActive);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSeeding, setIsSeeding] = React.useState<boolean>(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  const isAdmin = currentUserRole === "admin";

  const refreshData = async (demoToggle: boolean) => {
    setIsLoading(true);
    setStatusMessage(null);
    const res = await getGovernanceInsightsAction({
      workspaceId: data.workspaceId,
      includeDemo: demoToggle,
    });
    setIsLoading(false);
    if (res.success && res.data) {
      setData(res.data);
    }
  };

  const handleToggleDemo = async (checked: boolean) => {
    setIncludeDemo(checked);
    await refreshData(checked);
  };

  const handleSeedDemoHistory = async () => {
    setIsSeeding(true);
    setStatusMessage("Generating realistic demo review history across past 30 days...");
    const res = await seedDemoHistoryAction(data.workspaceId);
    setIsSeeding(false);

    if (res.success) {
      setStatusMessage("Demo history successfully seeded.");
      setIncludeDemo(true);
      await refreshData(true);
    } else {
      setStatusMessage(res.error || "Failed to seed demo history.");
    }
  };

  const handleClearDemoHistory = async () => {
    setIsSeeding(true);
    setStatusMessage("Clearing demo historical data...");
    const res = await clearDemoHistoryAction(data.workspaceId);
    setIsSeeding(false);

    if (res.success) {
      setStatusMessage("Demo history cleared.");
      await refreshData(false);
    } else {
      setStatusMessage(res.error || "Failed to clear demo history.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8 font-sans text-xs">
      {/* Header & Controls */}
      <div className="bg-paper-raised border border-rule rounded-sm p-5 space-y-4 shadow-hairline">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-accent font-semibold uppercase tracking-wider">
              <BarChart2 className="w-4 h-4 stroke-[1.75]" />
              <span>Real Database Governance Analytics</span>
              <span>·</span>
              <span className="text-ink-soft">{data.workspaceName}</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink mt-1">
              Governance Insights & Policy Analytics
            </h1>
            <p className="text-ink-soft text-xs mt-0.5">
              Metrics calculated directly from live submissions, deterministic rule logs, and reviewer decisions.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Demo Data Toggle */}
            <div className="flex items-center gap-2 p-1.5 bg-paper rounded-sm border border-rule font-mono text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeDemo}
                  onChange={(e) => handleToggleDemo(e.target.checked)}
                  disabled={isLoading || isSeeding}
                  className="rounded-sm border-rule text-accent focus:ring-accent h-3.5 w-3.5 cursor-pointer"
                />
                <span className="text-ink font-medium">Include Demo Data</span>
              </label>

              {data.isDemoDataActive && (
                <span className="px-1.5 py-0.2 rounded-xs bg-ochre/15 border border-ochre/40 text-ochre font-semibold text-[10px]">
                  DEMO ACTIVE
                </span>
              )}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => refreshData(includeDemo)}
              disabled={isLoading || isSeeding}
              className="p-2 border border-rule rounded-sm hover:bg-paper text-ink-soft hover:text-ink cursor-pointer transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
            </button>

            {/* Admin Seed / Clear Demo Buttons */}
            {isAdmin && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={handleSeedDemoHistory}
                  disabled={isSeeding || isLoading}
                  className="px-2.5 py-1 bg-paper hover:bg-paper-sunken border border-rule rounded-sm text-ink flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Generate realistic demo submissions spanning past 30 days"
                >
                  {isSeeding ? (
                    <Loader2 className="w-3 h-3 animate-spin text-accent" />
                  ) : (
                    <PlusCircle className="w-3 h-3 text-accent" />
                  )}
                  <span>Seed Demo History</span>
                </button>

                {data.hasDemoData && (
                  <button
                    type="button"
                    onClick={handleClearDemoHistory}
                    disabled={isSeeding || isLoading}
                    className="p-1 text-ink-soft hover:text-oxblood hover:bg-paper rounded-sm border border-rule transition-colors cursor-pointer"
                    title="Remove seeded demo submissions"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Message if present */}
        {statusMessage && (
          <div className="p-2 bg-paper rounded-sm border border-rule font-mono text-[11px] text-accent">
            {statusMessage}
          </div>
        )}

        {/* Demo Data Banner when active */}
        {data.isDemoDataActive && (
          <div className="p-3 bg-ochre/10 border border-ochre/30 rounded-sm flex items-start gap-2.5 text-[11px] text-ink">
            <span className="font-mono font-bold text-ochre uppercase shrink-0 px-1 py-0.2 bg-ochre/20 rounded-xs border border-ochre/40">
              Demo Benchmark
            </span>
            <p className="leading-relaxed">
              Displaying 4 seeded historical review submissions (dated over the past 30 days) to demonstrate
              longitudinal trend analytics, recurrence rates, and median review cycle times alongside real drafts.
            </p>
          </div>
        )}
      </div>

      {/* TOP METRICS ROW (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Evidence Coverage (Improvement 1) */}
        <MetricCard
          label="Evidence Coverage"
          value={`${data.evidenceCoverage.coveragePercentage}%`}
          variant={data.evidenceCoverage.coveragePercentage >= 80 ? "moss" : "ochre"}
          subtext={`${data.evidenceCoverage.verifiedHighSeverityCount} of ${data.evidenceCoverage.totalHighSeverityCount} critical/major findings backed by verified policy.`}
          statusText="Non-Negotiable Principle 3"
        />

        {/* 2. Review Cycle Time (Median) */}
        <MetricCard
          label="Review Cycle Time (Median)"
          value={data.cycleTime.isAvailable ? `${data.cycleTime.medianHours}h` : "Low Sample"}
          isLowN={!data.cycleTime.isAvailable}
          variant="default"
          subtext={data.cycleTime.statusText}
          statusText={data.cycleTime.isAvailable ? `n = ${data.cycleTime.sampleSize} reviews` : "Requires n ≥ 3"}
        />

        {/* 3. Open Findings in Flight */}
        <MetricCard
          label="Open Governance Flags"
          value={data.openFindingsCount}
          variant={data.openFindingsCount > 0 ? "oxblood" : "moss"}
          subtext={`${data.resolvedFindingsCount} findings accepted or dismissed with audited reasons.`}
          statusText={`${data.totalFindingsCount} total lifetime flags`}
        />

        {/* 4. Freshness Auditing */}
        <MetricCard
          label="Stale Brand Policies"
          value={data.staleSourcesCount}
          variant={data.staleSourcesCount > 0 ? "oxblood" : "moss"}
          subtext={
            data.staleSourcesCount > 0
              ? `${data.staleSourcesCount} policies have passed their freshness review date.`
              : "All brand knowledge base policies are current."
          }
          statusText="30-day freshness horizon"
        />
      </div>

      {/* CHARTS GRID: Category Distribution + Tripped Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Category & Severity Breakdown (7 cols) */}
        <div className="lg:col-span-7">
          <CategoryBreakdownChart
            breakdown={data.categoryBreakdown}
            insightSentence={data.categoryInsightSentence}
          />
        </div>

        {/* Right: Rules Creators Trip Most (5 cols) */}
        <div className="lg:col-span-5">
          <TrippedRulesChart
            sources={data.topTrippedSources}
            insightSentence={data.trippedSourcesInsightSentence}
          />
        </div>
      </div>

      {/* RECURRENCE SECTION (Small Multiples across Revisions) */}
      <RecurrenceSmallMultiples
        recurrenceRates={data.recurrenceRates}
        overallRate={data.overallRecurrenceRate}
        insightSentence={data.recurrenceInsightSentence}
      />

      {/* UNCLEAR GUIDELINES & STALE SOURCES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Unclear Guidelines (7 cols) */}
        <div className="lg:col-span-7">
          <UnclearGuidelinesPanel guidelines={data.unclearGuidelines} />
        </div>

        {/* Stale Sources (5 cols) */}
        <div className="lg:col-span-5">
          <StaleSourcesPanel sources={data.staleSources} />
        </div>
      </div>
    </div>
  );
}

