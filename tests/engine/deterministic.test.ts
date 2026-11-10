import { describe, it, expect } from "vitest";
import { DeterministicEngine, RuleTerm, RuleFact } from "@/lib/engine/deterministic";

describe("Deterministic Governance Engine (Lane 1)", () => {
  const engine = new DeterministicEngine();

  const mockTerms: RuleTerm[] = [
    {
      term: "cheap",
      kind: "prohibited",
      replacement: "accessible",
      severity: "major",
      source_key: "S-008",
      notes: "Undermines premium craft positioning.",
    },
    {
      term: "revolutionary",
      kind: "prohibited",
      replacement: "purpose-built",
      severity: "major",
      source_key: "S-008",
      notes: "Empty marketing hyperbole violates calm tone.",
    },
    {
      term: "miracle fabric",
      kind: "prohibited",
      replacement: "weather-sealed technical textile",
      severity: "critical",
      source_key: "S-008",
      notes: "Presents unscientific claim liability.",
    },
    {
      term: "Covers manufacturer defects under normal trail usage",
      kind: "required_phrase",
      severity: "critical",
      source_key: "S-004",
      notes: "Mandatory warranty disclaimer.",
    },
  ];

  it("detects prohibited terms with exact span boundaries and suggestions", () => {
    const draft = "The TrailLite Alpine jacket delivers cheap weather protection.";
    const findings = engine.scanTerminology(draft, mockTerms);

    expect(findings).toHaveLength(1);
    expect(findings[0].span_text).toBe("cheap");
    expect(findings[0].span_start).toBe(37);
    expect(findings[0].span_end).toBe(42);
    expect(findings[0].severity).toBe("major");
    expect(findings[0].suggestion).toBe("accessible");
    expect(findings[0].lane).toBe("rule");
    expect(findings[0].evidence_status).toBe("verified");
    expect(findings[0].confidence).toBe(1.0);
  });

  it("enforces whole-word boundary matching to prevent false positives", () => {
    // "cheapskate" contains "cheap" as substring, but shouldn't match whole-word rule
    const draft = "An alpine trekker is not a cheapskate.";
    const findings = engine.scanTerminology(draft, mockTerms);

    expect(findings).toHaveLength(0);
  });

  it("detects stale certified statistics with expired validity date", () => {
    const expiredFacts: RuleFact[] = [
      {
        key: "recycled_nylon_percentage",
        value: "78",
        unit: "percent",
        valid_from: "2023-01-01",
        valid_until: "2024-12-31", // EXPIRED
        source_key: "S-006",
      },
    ];

    const draft = "Crafted with 78% certified recycled ocean nylon.";
    // Simulated current date in 2026
    const currentDate = new Date("2026-11-09T00:00:00Z");
    const findings = engine.scanFacts(draft, expiredFacts, currentDate);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("fact");
    expect(findings[0].severity).toBe("major");
    expect(findings[0].span_text).toBe("78%");
    expect(findings[0].explanation).toContain("STALE STATISTIC");
    expect(findings[0].explanation).toContain("expired on 2024-12-31");
  });

  it("flags missing mandatory disclaimer when warranty is referenced without required phrase", () => {
    const draft = "Every stitch is backed by our 25-Year Gear Promise.";
    const findings = engine.scanRequiredDisclaimers(draft, mockTerms);

    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("claim");
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].explanation).toContain("Missing mandatory disclaimer");
    expect(findings[0].suggestion).toContain("Covers manufacturer defects under normal trail usage");
  });

  it("passes cleanly when mandatory warranty disclaimer is present", () => {
    const draft =
      "Every stitch is backed by our 25-Year Gear Promise. Covers manufacturer defects under normal trail usage.";
    const findings = engine.scanRequiredDisclaimers(draft, mockTerms);

    expect(findings).toHaveLength(0);
  });
});
