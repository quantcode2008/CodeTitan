import { describe, it, expect } from "vitest";
import { scanTermsRule } from "@/lib/review/rules/terms";
import { scanDisclaimersRule } from "@/lib/review/rules/disclaimers";
import { scanClaimsRule } from "@/lib/review/rules/claims";
import { scanFactsRule } from "@/lib/review/rules/facts";
import { scanAccessibilityRule } from "@/lib/review/rules/accessibility";
import { runRuleLane } from "@/lib/review/rules";
import { RetrievedContext } from "@/lib/review/types";

describe("Rule Lane Scanners (4a - 4e)", () => {
  // ---------------------------------------------------------------------------
  // 4a. Prohibited / Preferred Terms
  // ---------------------------------------------------------------------------
  describe("4a. Prohibited Terms Rule", () => {
    const terms = [
      {
        term: "cheap",
        kind: "prohibited" as const,
        replacement: "accessible",
        severity: "major" as const,
        source_key: "S-008",
      },
      {
        term: "miracle fabric",
        kind: "prohibited" as const,
        replacement: "420D ripstop nylon",
        severity: "critical" as const,
        source_key: "S-008",
      },
    ];

    it("detects prohibited terms case-insensitively with exact spans", () => {
      const text = "This jacket offers CHEAP weather protection with miracle fabric.";
      const findings = scanTermsRule(text, terms);

      expect(findings).toHaveLength(2);
      expect(findings[0].span_text).toBe("CHEAP");
      expect(findings[0].span_start).toBe(19);
      expect(findings[0].span_end).toBe(24);
      expect(text.slice(findings[0].span_start, findings[0].span_end)).toBe("CHEAP");
      expect(findings[0].suggestion).toBe("accessible");

      expect(findings[1].span_text).toBe("miracle fabric");
      expect(findings[1].severity).toBe("critical");
      expect(text.slice(findings[1].span_start, findings[1].span_end)).toBe("miracle fabric");
    });

    it("respects word boundaries and ignores partial substrings", () => {
      const text = "He was cheapened by the experience in a miraculous way.";
      const findings = scanTermsRule(text, terms);
      expect(findings).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4b. Required Disclaimers
  // ---------------------------------------------------------------------------
  describe("4b. Required Disclaimers Rule", () => {
    it("flags missing disclaimer when warranty trigger is present", () => {
      const text = "Every stitch is backed by our 25-Year Gear Promise.";
      const findings = scanDisclaimersRule(text);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].category).toBe("claim");
      expect(findings[0].explanation).toContain("Covers manufacturer defects under normal trail usage.");
      expect(text.slice(findings[0].span_start, findings[0].span_end)).toBe(findings[0].span_text);
    });

    it("passes when the required disclaimer is present", () => {
      const text =
        "Backed by our 25-Year Gear Promise. Covers manufacturer defects under normal trail usage.";
      const findings = scanDisclaimersRule(text);
      expect(findings).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4c. Promotional Claims & Superlatives
  // ---------------------------------------------------------------------------
  describe("4c. Promotional Claims Rule", () => {
    const mockSources: RetrievedContext[] = [
      {
        source_id: "s-03",
        source_key: "S-003",
        title: "Claims Policy",
        excerpt: "Superlatives like #1 require laboratory testing.",
        type: "claim_policy",
      },
    ];

    it("flags unverified superlatives and absolute claims", () => {
      const text = "The SummitX is the undisputed #1 expedition pack, guaranteed for eternity.";
      const findings = scanClaimsRule(text, mockSources);

      expect(findings.length).toBeGreaterThanOrEqual(2);
      const numberOneFinding = findings.find((f) => f.span_text.includes("#1"));
      expect(numberOneFinding).toBeDefined();
      expect(numberOneFinding?.evidence_status).toBe("unverified");
      expect(numberOneFinding?.severity).toBe("critical");
      expect(numberOneFinding?.requires_designated_reviewer).toBe(true);

      const guaranteeFinding = findings.find((f) => f.span_text.toLowerCase().includes("guaranteed"));
      expect(guaranteeFinding).toBeDefined();
    });

    it("passes plainspoken non-superlative statements", () => {
      const text = "Designed for multi-day alpine expeditions in wet climates.";
      const findings = scanClaimsRule(text, mockSources);
      expect(findings).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 4d. Fact Matching & Stale Statistics
  // ---------------------------------------------------------------------------
  describe("4d. Fact Matching Rule", () => {
    const facts = [
      {
        key: "recycled_ocean_nylon_percent",
        value: "78",
        unit: "%",
        valid_until: "2024-12-31", // Expired in the past!
        source_key: "S-006",
      },
      {
        key: "founded_year",
        value: "2018",
        unit: null,
        valid_until: null,
        source_key: "S-005",
      },
    ];

    it("flags expired certified statistics as STALE STATISTIC", () => {
      const text = "Crafted with 78% certified recycled ocean nylon for mountain durability.";
      const referenceDate = new Date("2026-11-10");
      const findings = scanFactsRule(text, facts, referenceDate);

      expect(findings).toHaveLength(1);
      expect(findings[0].category).toBe("fact");
      expect(findings[0].explanation).toContain("STALE STATISTIC");
      expect(findings[0].explanation).toContain("2024-12-31");
      expect(text.slice(findings[0].span_start, findings[0].span_end)).toBe(findings[0].span_text);
    });

    it("flags fact mismatch when founding year conflicts with certified facts", () => {
      const text = "Aster & Pine was founded in 2012 by mountaineers.";
      const referenceDate = new Date("2026-11-10");
      const findings = scanFactsRule(text, facts, referenceDate);

      expect(findings).toHaveLength(1);
      expect(findings[0].explanation).toContain("Official brand records certify founding year as 2018");
      expect(findings[0].suggestion).toContain("2018");
    });
  });

  // ---------------------------------------------------------------------------
  // 4e. Accessibility
  // ---------------------------------------------------------------------------
  describe("4e. Accessibility Rule", () => {
    it("flags markdown and HTML images missing alt text", () => {
      const text = "Check out our new pack: ![](https://assets.com/pack.jpg) and <img src=\"test.png\" />";
      const findings = scanAccessibilityRule(text);

      expect(findings).toHaveLength(2);
      expect(findings[0].category).toBe("accessibility");
      expect(findings[0].severity).toBe("major");
      expect(findings[1].category).toBe("accessibility");
    });

    it("flags ALL-CAPS word runs of 4 or more words", () => {
      const text = "Hurry and ORDER TODAY BEFORE SUPPLIES VANISH forever.";
      const findings = scanAccessibilityRule(text);

      expect(findings.some((f) => f.span_text === "ORDER TODAY BEFORE SUPPLIES VANISH")).toBe(true);
    });

    it("flags generic non-descriptive link labels", () => {
      const text = "To see our warranty policy, [click here](https://asterandpine.com/warranty).";
      const findings = scanAccessibilityRule(text);

      expect(findings.some((f) => f.span_text.includes("[click here]"))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Span Integrity Enforcement
  // ---------------------------------------------------------------------------
  describe("Span Integrity", () => {
    it("verifies that every finding's span matches text.slice(start, end)", () => {
      const text =
        "The SummitX is the undisputed #1 pack with cheap miracle fabric! ORDER TODAY BEFORE SUPPLIES VANISH or [click here](url).";

      const findings = runRuleLane({
        draftText: text,
        terms: [
          { term: "cheap", kind: "prohibited", replacement: "accessible", severity: "major" },
          { term: "miracle fabric", kind: "prohibited", replacement: "ripstop", severity: "critical" },
        ],
      });

      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(text.slice(f.span_start, f.span_end)).toBe(f.span_text);
      }
    });
  });
});
