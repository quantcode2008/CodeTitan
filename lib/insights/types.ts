import { SeverityLevel, FindingCategory, FindingStatus, EvidenceStatus } from "@/lib/database.types";

export interface FindingsCategoryBreakdown {
  category: FindingCategory;
  count: number;
  percentage: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  advisoryCount: number;
}

export interface SeverityTrendPoint {
  periodLabel: string;
  critical: number;
  major: number;
  minor: number;
  advisory: number;
  total: number;
}

export interface TrippedSourceMetric {
  sourceId: string;
  sourceKey: string;
  title: string;
  citationCount: number;
  percentage: number;
  dismissedCount: number;
  explainedCount: number;
  acceptedCount: number;
}

export interface RecurrenceCategoryMetric {
  category: FindingCategory;
  initialCount: number;
  recurrentCount: number;
  recurrenceRate: number; // 0 to 100
}

export interface UnclearGuidelineMetric {
  sourceId: string;
  sourceKey: string;
  title: string;
  totalCitations: number;
  overrideCount: number; // dismissed + explained
  overrideRate: number; // 0 to 100
  needsHumanJudgementCount: number;
  suggestion: string;
}

export interface StaleSourceItem {
  id: string;
  sourceKey: string;
  title: string;
  reviewBy: string;
  daysOverdue: number;
}

export interface ReviewCycleTimeMetric {
  medianHours: number | null;
  medianDays: number | null;
  sampleSize: number; // n
  isAvailable: boolean; // true if sampleSize >= 3
  statusText: string;
}

export interface EvidenceCoverageMetric {
  verifiedHighSeverityCount: number;
  totalHighSeverityCount: number;
  coveragePercentage: number; // 0 to 100
  unverifiedCount: number;
  insightSentence: string;
}

export interface GovernanceInsightsData {
  workspaceId: string;
  workspaceName: string;
  isDemoDataActive: boolean;
  hasDemoData: boolean;
  totalReviewsCount: number;
  totalFindingsCount: number;
  openFindingsCount: number;
  resolvedFindingsCount: number;
  
  // 1. Findings breakdown & trends
  categoryBreakdown: FindingsCategoryBreakdown[];
  severityTrend: SeverityTrendPoint[];
  categoryInsightSentence: string;

  // 2. Tripped rules
  topTrippedSources: TrippedSourceMetric[];
  trippedSourcesInsightSentence: string;

  // 3. Recurrence rates
  recurrenceRates: RecurrenceCategoryMetric[];
  overallRecurrenceRate: number;
  recurrenceInsightSentence: string;

  // 4. Possibly unclear guidelines
  unclearGuidelines: UnclearGuidelineMetric[];

  // 5. Evidence coverage
  evidenceCoverage: EvidenceCoverageMetric;

  // 6. Review cycle time
  cycleTime: ReviewCycleTimeMetric;

  // 7. Unresolved & Stale Sources
  staleSources: StaleSourceItem[];
  staleSourcesCount: number;
}

