import { describe, it, expect } from "vitest";
import {
  calculateEvidenceCoverage,
  calculateReviewCycleTime,
  calculateCategoryBreakdown,
  calculateTrippedSources,
  calculateRecurrenceRates,
  detectUnclearGuidelines,
  detectStaleSources,
  RawFindingItem,
  RawReviewItem,
  RawSourceItem,
  ContentItemRevisionFindings,
} from "@/lib/insights/metrics";

describe("Governance Insights Metrics Engine", () => {
  describe("1. Evidence Coverage (Improvement 1)", () => {
    it("returns 100% baseline when no high-severity findings exist", () => {
      const findings: RawFindingItem[] = [
        { category: "terminology", severity: "minor", status: "open", evidence_status: "unverified" },
        { category: "tone", severity: "advisory", status: "open", evidence_status: "unverified" },
      ];
      const res = calculateEvidenceCoverage(findings);
      expect(res.coveragePercentage).toBe(100);
      expect(res.totalHighSeverityCount).toBe(0);
    });

    it("calculates exact verified percentage for critical and major findings", () => {
      const findings: RawFindingItem[] = [
        { category: "claim", severity: "critical", status: "open", evidence_status: "verified" },
        { category: "claim", severity: "critical", status: "open", evidence_status: "verified" },
        { category: "terminology", severity: "major", status: "open", evidence_status: "verified" },
        { category: "claim", severity: "critical", status: "open", evidence_status: "unverified" }, // 1 unverified
        { category: "tone", severity: "minor", status: "open", evidence_status: "unverified" }, // ignored (minor)
      ];

      const res = calculateEvidenceCoverage(findings);
      expect(res.totalHighSeverityCount).toBe(4);
      expect(res.verifiedHighSeverityCount).toBe(3);
      expect(res.coveragePercentage).toBe(75); // 3 of 4 = 75%
      expect(res.unverifiedCount).toBe(1);
      expect(res.insightSentence).toContain("Evidence coverage is at 75%");
    });
  });

  describe("2. Review Cycle Time (Median with Strict n >= 3 Guard)", () => {
    it("strictly blocks median calculation when sample size n < 3", () => {
      // 0 reviews
      const emptyRes = calculateReviewCycleTime([]);
      expect(emptyRes.isAvailable).toBe(false);
      expect(emptyRes.medianHours).toBeNull();
      expect(emptyRes.sampleSize).toBe(0);
      expect(emptyRes.statusText).toContain("n = 0 / 3 required");

      // 2 reviews (n = 2)
      const twoReviews: RawReviewItem[] = [
        {
          id: "r1",
          status: "approved",
          created_at: "2026-11-01T10:00:00Z",
          decided_at: "2026-11-01T20:00:00Z", // 10h
        },
        {
          id: "r2",
          status: "approved",
          created_at: "2026-11-02T10:00:00Z",
          decided_at: "2026-11-02T22:00:00Z", // 12h
        },
      ];

      const twoRes = calculateReviewCycleTime(twoReviews);
      expect(twoRes.isAvailable).toBe(false);
      expect(twoRes.medianHours).toBeNull();
      expect(twoRes.sampleSize).toBe(2);
      expect(twoRes.statusText).toContain("n = 2 / 3 required");
    });

    it("calculates exact median when sample size n >= 3 and formats display", () => {
      const threeReviews: RawReviewItem[] = [
        {
          id: "r1",
          status: "approved",
          created_at: "2026-11-01T10:00:00Z",
          decided_at: "2026-11-01T16:00:00Z", // 6 hours
        },
        {
          id: "r2",
          status: "changes_requested",
          created_at: "2026-11-02T10:00:00Z",
          decided_at: "2026-11-02T22:00:00Z", // 12 hours
        },
        {
          id: "r3",
          status: "approved",
          created_at: "2026-11-03T10:00:00Z",
          decided_at: "2026-11-04T10:00:00Z", // 24 hours
        },
      ];

      const res = calculateReviewCycleTime(threeReviews);
      expect(res.isAvailable).toBe(true);
      expect(res.sampleSize).toBe(3);
      expect(res.medianHours).toBe(12); // middle of [6, 12, 24]
      expect(res.statusText).toContain("12 hours (median, n = 3 reviews)");
    });
  });

  describe("3. Category Breakdown & Tripped Rules", () => {
    it("identifies top category and generates dynamic insight sentence", () => {
      const findings: RawFindingItem[] = [
        { category: "claim", severity: "critical", status: "open", evidence_status: "verified" },
        { category: "claim", severity: "major", status: "open", evidence_status: "verified" },
        { category: "claim", severity: "major", status: "open", evidence_status: "verified" },
        { category: "terminology", severity: "minor", status: "open", evidence_status: "verified" },
      ];

      const { breakdown, insightSentence } = calculateCategoryBreakdown(findings);
      const claims = breakdown.find((b) => b.category === "claim")!;
      expect(claims.count).toBe(3);
      expect(claims.percentage).toBe(75);
      expect(insightSentence).toContain("Claims findings made up 75% of flags");
    });

    it("ranks most frequently tripped rules with percentage of total citations", () => {
      const sources: RawSourceItem[] = [
        { id: "s1", source_key: "S-001", title: "Brand Terminology" },
        { id: "s2", source_key: "S-002", title: "Claims Substantiation" },
      ];

      const findings: RawFindingItem[] = [
        { category: "claim", severity: "critical", status: "open", evidence_status: "verified", source_key: "S-002" },
        { category: "claim", severity: "major", status: "open", evidence_status: "verified", source_key: "S-002" },
        { category: "terminology", severity: "minor", status: "open", evidence_status: "verified", source_key: "S-001" },
      ];

      const { trippedSources, insightSentence } = calculateTrippedSources(findings, sources);
      expect(trippedSources).toHaveLength(2);
      expect(trippedSources[0].sourceKey).toBe("S-002");
      expect(trippedSources[0].citationCount).toBe(2);
      expect(trippedSources[0].percentage).toBe(67);
      expect(insightSentence).toContain("S-002 (Claims Substantiation) is the most tripped rule");
    });
  });

  describe("4. Recurrence Across Draft Revisions", () => {
    it("measures share of findings that reappear in revision v2", () => {
      const revisionPairs: ContentItemRevisionFindings[] = [
        {
          contentItemId: "item-1",
          v1Findings: [
            { category: "tone", severity: "minor", status: "open", evidence_status: "verified" },
            { category: "tone", severity: "minor", status: "open", evidence_status: "verified" },
            { category: "terminology", severity: "major", status: "open", evidence_status: "verified" },
          ],
          v2Findings: [
            // In v2: tone still has 1 finding, terminology has 0 (fixed)
            { category: "tone", severity: "minor", status: "open", evidence_status: "verified" },
          ],
        },
      ];

      const { recurrenceRates, overallRecurrenceRate, insightSentence } =
        calculateRecurrenceRates(revisionPairs);

      const toneMetric = recurrenceRates.find((r) => r.category === "tone")!;
      const termMetric = recurrenceRates.find((r) => r.category === "terminology")!;

      expect(toneMetric.initialCount).toBe(2);
      expect(toneMetric.recurrentCount).toBe(1);
      expect(toneMetric.recurrenceRate).toBe(50); // 1 of 2 = 50%

      expect(termMetric.initialCount).toBe(1);
      expect(termMetric.recurrentCount).toBe(0);
      expect(termMetric.recurrenceRate).toBe(0); // 0 of 1 = 0%

      expect(overallRecurrenceRate).toBe(33); // 1 of 3 = 33%
      expect(insightSentence).toContain("Tone flags show the highest recurrence across revisions (50%)");
    });
  });

  describe("5. Possibly Unclear Guidelines Detection", () => {
    it("flags guidelines with high dismissal/explanation rate and provides actionable suggestion", () => {
      const sources: RawSourceItem[] = [
        { id: "s1", source_key: "S-004", title: "Seasonal Taglines" },
        { id: "s2", source_key: "S-001", title: "Terminology" },
      ];

      const findings: RawFindingItem[] = [
        // S-004 has 2 citations: 1 dismissed, 1 explained -> 100% override rate!
        { category: "tone", severity: "minor", status: "dismissed", evidence_status: "verified", source_key: "S-004" },
        { category: "tone", severity: "minor", status: "explained", evidence_status: "verified", source_key: "S-004" },
        // S-001 has 2 citations: both accepted -> 0% override
        { category: "terminology", severity: "major", status: "accepted", evidence_status: "verified", source_key: "S-001" },
        { category: "terminology", severity: "major", status: "accepted", evidence_status: "verified", source_key: "S-001" },
      ];

      const unclear = detectUnclearGuidelines(findings, sources);
      expect(unclear).toHaveLength(1);
      expect(unclear[0].sourceKey).toBe("S-004");
      expect(unclear[0].overrideRate).toBe(100);
      expect(unclear[0].suggestion).toContain("Creators frequently explain or dismiss flags on this rule");
      expect(unclear[0].suggestion).toContain("Consider clarifying allowable synonyms");
    });
  });

  describe("6. Stale Sources Detection", () => {
    it("flags sources where review_by date has passed", () => {
      const mockNow = new Date("2026-11-12T00:00:00Z");
      const sources: RawSourceItem[] = [
        { id: "s1", source_key: "S-003", title: "Partner Fact Sheet", review_by: "2026-10-01" }, // Overdue
        { id: "s2", source_key: "S-001", title: "Core Tone", review_by: "2026-12-31" }, // Fresh
        { id: "s3", source_key: "S-002", title: "Claims", review_by: null }, // No date
      ];

      const stale = detectStaleSources(sources, mockNow);
      expect(stale).toHaveLength(1);
      expect(stale[0].sourceKey).toBe("S-003");
      expect(stale[0].daysOverdue).toBeGreaterThan(30);
    });
  });
});
