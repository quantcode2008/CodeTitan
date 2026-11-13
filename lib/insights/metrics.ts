import {
  FindingsCategoryBreakdown,
  TrippedSourceMetric,
  RecurrenceCategoryMetric,
  UnclearGuidelineMetric,
  ReviewCycleTimeMetric,
  EvidenceCoverageMetric,
  SeverityTrendPoint,
  StaleSourceItem,
} from "./types";
import { FindingCategory, SeverityLevel } from "@/lib/database.types";

export interface RawFindingItem {
  id?: string;
  category: FindingCategory;
  severity: SeverityLevel;
  status: string;
  evidence_status: string;
  source_id?: string | null;
  source_key?: string | null;
  created_at?: string;
}

export interface RawReviewItem {
  id: string;
  created_at: string;
  decided_at: string | null;
  status: string;
}

export interface RawSourceItem {
  id: string;
  source_key: string;
  title: string;
  review_by?: string | null;
}

export interface ContentItemRevisionFindings {
  contentItemId: string;
  v1Findings: RawFindingItem[];
  v2Findings: RawFindingItem[];
}

/**
 * Calculates Evidence Coverage: % of high-severity findings (critical + major) with a verified source.
 */
export function calculateEvidenceCoverage(findings: RawFindingItem[]): EvidenceCoverageMetric {
  const highSeverityFindings = findings.filter(
    (f) => f.severity === "critical" || f.severity === "major"
  );

  const total = highSeverityFindings.length;
  if (total === 0) {
    return {
      verifiedHighSeverityCount: 0,
      totalHighSeverityCount: 0,
      coveragePercentage: 100,
      unverifiedCount: 0,
      insightSentence: "No high-severity flags recorded. Baseline evidence coverage is at 100%.",
    };
  }

  const verified = highSeverityFindings.filter((f) => f.evidence_status === "verified").length;
  const unverified = total - verified;
  const coveragePercentage = Math.round((verified / total) * 100);

  const insightSentence =
    coveragePercentage >= 80
      ? `${coveragePercentage}% of critical and major findings cite verified brand pack authorities; unverified claims are isolated for human judgement.`
      : `Evidence coverage is at ${coveragePercentage}%. ${unverified} high-risk findings lack an approved brand pack citation and require manual human verification.`;

  return {
    verifiedHighSeverityCount: verified,
    totalHighSeverityCount: total,
    coveragePercentage,
    unverifiedCount: unverified,
    insightSentence,
  };
}

/**
 * Calculates Median Review Cycle Time from submission to decision.
 * Strictly adheres to requirement: only shown when n >= 3, always showing n.
 */
export function calculateReviewCycleTime(reviews: RawReviewItem[]): ReviewCycleTimeMetric {
  // Only completed reviews with decided_at
  const decidedReviews = reviews.filter((r) => r.decided_at && ["approved", "changes_requested", "rejected"].includes(r.status));
  const sampleSize = decidedReviews.length;

  if (sampleSize < 3) {
    return {
      medianHours: null,
      medianDays: null,
      sampleSize,
      isAvailable: false,
      statusText:
        sampleSize === 0
          ? "No decided reviews yet to compute cycle time (n = 0 / 3 required)."
          : `Not enough decided reviews yet to calculate median cycle time (n = ${sampleSize} / 3 required).`,
    };
  }

  // Calculate durations in hours
  const durationsHours = decidedReviews
    .map((r) => {
      const created = new Date(r.created_at).getTime();
      const decided = new Date(r.decided_at!).getTime();
      const diffMs = Math.max(0, decided - created);
      return diffMs / (1000 * 60 * 60);
    })
    .sort((a, b) => a - b);

  // Compute median
  const mid = Math.floor(durationsHours.length / 2);
  const medianHours =
    durationsHours.length % 2 !== 0
      ? durationsHours[mid]
      : (durationsHours[mid - 1] + durationsHours[mid]) / 2;

  const medianDays = Number((medianHours / 24).toFixed(1));
  const roundedHours = Number(medianHours.toFixed(1));

  let timeDisplay = `${roundedHours} hours`;
  if (roundedHours >= 48) {
    timeDisplay = `${medianDays} days`;
  }

  return {
    medianHours: roundedHours,
    medianDays,
    sampleSize,
    isAvailable: true,
    statusText: `${timeDisplay} (median, n = ${sampleSize} reviews)`,
  };
}

/**
 * Computes Findings Breakdown by category and severity.
 */
export function calculateCategoryBreakdown(findings: RawFindingItem[]): {
  breakdown: FindingsCategoryBreakdown[];
  insightSentence: string;
} {
  const categories: FindingCategory[] = ["claim", "terminology", "fact", "tone", "messaging", "visual", "other"];
  const total = findings.length;

  if (total === 0) {
    return {
      breakdown: categories.map((cat) => ({
        category: cat,
        count: 0,
        percentage: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        advisoryCount: 0,
      })),
      insightSentence: "No governance findings recorded yet.",
    };
  }

  const breakdown: FindingsCategoryBreakdown[] = categories
    .map((cat) => {
      const catFindings = findings.filter((f) => f.category === cat);
      const count = catFindings.length;
      return {
        category: cat,
        count,
        percentage: Math.round((count / total) * 100),
        criticalCount: catFindings.filter((f) => f.severity === "critical").length,
        majorCount: catFindings.filter((f) => f.severity === "major").length,
        minorCount: catFindings.filter((f) => f.severity === "minor").length,
        advisoryCount: catFindings.filter((f) => f.severity === "advisory").length,
      };
    })
    .sort((a, b) => b.count - a.count);

  const topCategory = breakdown[0];
  let insightSentence = "Findings are evenly distributed across governance categories.";

  if (topCategory && topCategory.count > 0) {
    const categoryName =
      topCategory.category === "claim"
        ? "Claims"
        : topCategory.category === "terminology"
        ? "Terminology"
        : topCategory.category === "fact"
        ? "Fact verification"
        : topCategory.category === "tone"
        ? "Tone of voice"
        : topCategory.category === "visual"
        ? "Visual assets"
        : "General compliance";

    insightSentence = `${categoryName} findings made up ${topCategory.percentage}% of flags across submissions.`;
  }

  return { breakdown, insightSentence };
}

/**
 * Computes Most Frequently Tripped Sources/Rules.
 */
export function calculateTrippedSources(
  findings: RawFindingItem[],
  sources: RawSourceItem[]
): {
  trippedSources: TrippedSourceMetric[];
  insightSentence: string;
} {
  const sourcesMap = new Map(sources.map((s) => [s.id, s]));
  const sourcesByKeyMap = new Map(sources.map((s) => [s.source_key, s]));

  const sourceCounts = new Map<
    string,
    {
      sourceId: string;
      sourceKey: string;
      title: string;
      total: number;
      dismissed: number;
      explained: number;
      accepted: number;
    }
  >();

  let totalCitations = 0;

  for (const f of findings) {
    const sId = f.source_id;
    const sKey = f.source_key;
    const resolvedSource = (sId ? sourcesMap.get(sId) : null) || (sKey ? sourcesByKeyMap.get(sKey) : null);

    const key = sKey || resolvedSource?.source_key;
    if (!key) continue;

    totalCitations++;
    const id = sId || resolvedSource?.id || key;
    const title = resolvedSource?.title || `Policy ${key}`;

    const existing = sourceCounts.get(key) || {
      sourceId: id,
      sourceKey: key,
      title,
      total: 0,
      dismissed: 0,
      explained: 0,
      accepted: 0,
    };

    existing.total++;
    if (f.status === "dismissed") existing.dismissed++;
    if (f.status === "explained") existing.explained++;
    if (f.status === "accepted" || f.status === "edited") existing.accepted++;

    sourceCounts.set(key, existing);
  }

  if (totalCitations === 0) {
    return {
      trippedSources: [],
      insightSentence: "No brand pack policies have been triggered yet.",
    };
  }

  const trippedSources: TrippedSourceMetric[] = Array.from(sourceCounts.values())
    .map((item) => ({
      sourceId: item.sourceId,
      sourceKey: item.sourceKey,
      title: item.title,
      citationCount: item.total,
      percentage: Math.round((item.total / totalCitations) * 100),
      dismissedCount: item.dismissed,
      explainedCount: item.explained,
      acceptedCount: item.accepted,
    }))
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, 5);

  const top = trippedSources[0];
  const insightSentence = top
    ? `${top.sourceKey} (${top.title}) is the most tripped rule, accounting for ${top.percentage}% of all policy citations.`
    : "Rule citations are uniformly distributed across the knowledge base.";

  return { trippedSources, insightSentence };
}

/**
 * Computes Recurrence: share of findings that reappear after a revision, by category.
 */
export function calculateRecurrenceRates(revisionPairs: ContentItemRevisionFindings[]): {
  recurrenceRates: RecurrenceCategoryMetric[];
  overallRecurrenceRate: number;
  insightSentence: string;
} {
  const categories: FindingCategory[] = ["terminology", "claim", "fact", "tone", "messaging", "visual", "other"];
  const categoryStats = new Map<FindingCategory, { v1Count: number; recurrentCount: number }>();

  for (const cat of categories) {
    categoryStats.set(cat, { v1Count: 0, recurrentCount: 0 });
  }

  let totalV1 = 0;
  let totalRecurrent = 0;

  for (const pair of revisionPairs) {
    const v1Cats = pair.v1Findings.map((f) => f.category);
    const v2Cats = pair.v2Findings.map((f) => f.category);

    for (const cat of categories) {
      const v1ForCat = v1Cats.filter((c) => c === cat).length;
      const v2ForCat = v2Cats.filter((c) => c === cat).length;

      const recurrentForCat = Math.min(v1ForCat, v2ForCat);

      const stats = categoryStats.get(cat)!;
      stats.v1Count += v1ForCat;
      stats.recurrentCount += recurrentForCat;

      totalV1 += v1ForCat;
      totalRecurrent += recurrentForCat;
    }
  }

  const recurrenceRates: RecurrenceCategoryMetric[] = categories.map((cat) => {
    const stats = categoryStats.get(cat)!;
    const recurrenceRate = stats.v1Count > 0 ? Math.round((stats.recurrentCount / stats.v1Count) * 100) : 0;
    return {
      category: cat,
      initialCount: stats.v1Count,
      recurrentCount: stats.recurrentCount,
      recurrenceRate,
    };
  });

  const overallRecurrenceRate = totalV1 > 0 ? Math.round((totalRecurrent / totalV1) * 100) : 0;

  // Find category with highest recurrence
  const sorted = [...recurrenceRates].sort((a, b) => b.recurrenceRate - a.recurrenceRate);
  const highest = sorted[0];

  let insightSentence = "No revised drafts available yet to measure recurrence.";
  if (totalV1 > 0) {
    if (highest && highest.recurrenceRate > 0) {
      insightSentence = `${capitalize(highest.category)} flags show the highest recurrence across revisions (${highest.recurrenceRate}%), indicating creators need clearer replacement guidance.`;
    } else {
      insightSentence = `Revision recurrence rate is low (${overallRecurrenceRate}%), showing creator acceptance of initial suggestions.`;
    }
  }

  return { recurrenceRates, overallRecurrenceRate, insightSentence };
}

/**
 * Identifies "Possibly Unclear Guidelines":
 * Sources that are cited often AND have a high dismissal or "explained" rate,
 * or findings with unverified status / needs_human_judgement.
 */
export function detectUnclearGuidelines(
  findings: RawFindingItem[],
  sources: RawSourceItem[]
): UnclearGuidelineMetric[] {
  const sourcesMap = new Map(sources.map((s) => [s.id, s]));
  const sourcesByKeyMap = new Map(sources.map((s) => [s.source_key, s]));

  const sourceActivity = new Map<
    string,
    {
      sourceId: string;
      sourceKey: string;
      title: string;
      citations: number;
      dismissed: number;
      explained: number;
      needsHumanJudgement: number;
    }
  >();

  for (const f of findings) {
    const sId = f.source_id;
    const sKey = f.source_key;
    const s = (sId ? sourcesMap.get(sId) : null) || (sKey ? sourcesByKeyMap.get(sKey) : null);

    const key = sKey || s?.source_key;
    if (!key) continue;

    const id = sId || s?.id || key;
    const title = s?.title || `Policy ${key}`;

    const act = sourceActivity.get(key) || {
      sourceId: id,
      sourceKey: key,
      title,
      citations: 0,
      dismissed: 0,
      explained: 0,
      needsHumanJudgement: 0,
    };

    act.citations++;
    if (f.status === "dismissed") act.dismissed++;
    if (f.status === "explained") act.explained++;
    if (f.evidence_status === "unverified") act.needsHumanJudgement++;

    sourceActivity.set(key, act);
  }

  const unclear: UnclearGuidelineMetric[] = [];

  for (const act of sourceActivity.values()) {
    // Condition: at least 2 citations and (override rate >= 35% or 2+ unverified / human judgement flags)
    const overrideCount = act.dismissed + act.explained;
    const overrideRate = act.citations > 0 ? Math.round((overrideCount / act.citations) * 100) : 0;

    if (act.citations >= 2 && (overrideRate >= 35 || act.needsHumanJudgement >= 2)) {
      let suggestion = `Creators frequently explain or dismiss flags on this rule (${overrideRate}% override rate). The wording may be overly restrictive or ambiguous. Consider clarifying allowable synonyms.`;

      if (act.needsHumanJudgement >= 2) {
        suggestion = `High proportion of unverified citations (${act.needsHumanJudgement} claims). Knowledge base policy needs explicit substantiating evidence or approved exceptions added.`;
      }

      unclear.push({
        sourceId: act.sourceId,
        sourceKey: act.sourceKey,
        title: act.title,
        totalCitations: act.citations,
        overrideCount,
        overrideRate,
        needsHumanJudgementCount: act.needsHumanJudgement,
        suggestion,
      });
    }
  }

  return unclear.sort((a, b) => b.overrideRate - a.overrideRate);
}

/**
 * Identifies Stale Sources (past review_by date).
 */
export function detectStaleSources(sources: RawSourceItem[], now: Date = new Date()): StaleSourceItem[] {
  const stale: StaleSourceItem[] = [];
  const todayMs = now.getTime();

  for (const s of sources) {
    if (!s.review_by) continue;

    const reviewDate = new Date(s.review_by);
    if (isNaN(reviewDate.getTime())) continue;

    if (reviewDate.getTime() < todayMs) {
      const daysOverdue = Math.ceil((todayMs - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      stale.push({
        id: s.id,
        sourceKey: s.source_key,
        title: s.title,
        reviewBy: s.review_by,
        daysOverdue,
      });
    }
  }

  return stale.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

