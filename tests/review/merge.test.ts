import { describe, it, expect } from "vitest";
import { validateAndMergeFindings } from "@/lib/review/merge";
import { RuleFinding, LLMFindingRaw, RetrievedContext } from "@/lib/review/types";

describe("Validate & Merge Engine (Step 6)", () => {
  const mockSources: RetrievedContext[] = [
    {
      source_id: "s-01",
      source_key: "S-001",
      title: "Tone Guide",
      excerpt: "Quiet and plainspoken tone.",
    },
    {
      source_id: "s-03",
      source_key: "S-003",
      title: "Claims Policy",
      excerpt: "Claims require evidence.",
    },
  ];

  it("strips hallucinated source_key citations and marks evidence_status unverified", () => {
    const draftText = "We offer the absolute most revolutionary gear available.";
    const llmFindings: LLMFindingRaw[] = [
      {
        span_text: "absolute most revolutionary gear",
        category: "claim",
        severity: "major",
        explanation: "Unsubstantiated absolute claim.",
        source_key: "S-999_HALLUCINATED", // Does NOT exist in retrievedSources!
        confidence: 0.9,
        evidence_status: "verified",
      },
    ];

    const { findings, validationWarnings } = validateAndMergeFindings({
      draftText,
      ruleFindings: [],
      llmFindings,
      retrievedSources: mockSources,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].source_key).toBeNull();
    expect(findings[0].source_id).toBeNull();
    expect(findings[0].evidence_status).toBe("unverified");
    expect(validationWarnings.some((w) => w.includes("Hallucinated citation stripped"))).toBe(true);
  });

  it("resolves span_text to character offsets and verifies exact slice", () => {
    const draftText = "The summit is steep. Order today before supplies vanish forever!";
    const llmFindings: LLMFindingRaw[] = [
      {
        span_text: "Order today before supplies vanish forever!",
        category: "tone",
        severity: "major",
        explanation: "Breathless promotional urgency.",
        source_key: "S-001",
        confidence: 0.92,
        evidence_status: "verified",
      },
    ];

    const { findings } = validateAndMergeFindings({
      draftText,
      ruleFindings: [],
      llmFindings,
      retrievedSources: mockSources,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].span_start).toBe(21);
    expect(findings[0].span_end).toBe(21 + "Order today before supplies vanish forever!".length);
    expect(draftText.slice(findings[0].span_start, findings[0].span_end)).toBe(
      "Order today before supplies vanish forever!"
    );
  });

  it("drops LLM findings with unlocatable span_text", () => {
    const draftText = "Real draft text here.";
    const llmFindings: LLMFindingRaw[] = [
      {
        span_text: "Completely fictitious phantom phrase not in text",
        category: "tone",
        severity: "minor",
        explanation: "Phantom finding.",
        confidence: 0.8,
        evidence_status: "unverified",
      },
    ];

    const { findings, validationWarnings } = validateAndMergeFindings({
      draftText,
      ruleFindings: [],
      llmFindings,
      retrievedSources: mockSources,
    });

    expect(findings).toHaveLength(0);
    expect(validationWarnings.some((w) => w.includes("unlocatable span text"))).toBe(true);
  });

  it("deduplicates overlapping findings where rule lane wins on exact conflicts", () => {
    const draftText = "This jacket is cheap weather protection.";

    // Rule lane detected "cheap" at [15, 20]
    const ruleFindings: RuleFinding[] = [
      {
        lane: "rule",
        category: "terminology",
        severity: "major",
        span_start: 15,
        span_end: 20,
        span_text: "cheap",
        explanation: "The term cheap is prohibited.",
        source_key: "S-008",
        evidence_status: "verified",
        confidence: 1.0,
        suggestion: "accessible",
      },
    ];

    // LLM detected overlapping phrase "cheap weather protection" at [15, 39]
    const llmFindings: LLMFindingRaw[] = [
      {
        span_text: "cheap weather protection",
        category: "tone",
        severity: "minor",
        explanation: "Weak marketing tone.",
        confidence: 0.8,
        evidence_status: "unverified",
      },
    ];

    const { findings, validationWarnings } = validateAndMergeFindings({
      draftText,
      ruleFindings,
      llmFindings,
      retrievedSources: mockSources,
    });

    // Rule finding should survive; conflicting LLM finding should be dropped
    expect(findings).toHaveLength(1);
    expect(findings[0].lane).toBe("rule");
    expect(findings[0].span_text).toBe("cheap");
    expect(validationWarnings.some((w) => w.includes("Deduplication"))).toBe(true);
  });

  it("gates low confidence (<0.55) to needs_human_judgement and caps severity", () => {
    const draftText = "Our design is slightly reminiscent of classic mountaineering.";
    const llmFindings: LLMFindingRaw[] = [
      {
        span_text: "slightly reminiscent",
        category: "tone",
        severity: "critical", // Overzealous LLM assigned critical
        explanation: "Uncertain tone observation.",
        source_key: "S-001",
        confidence: 0.42, // LOW CONFIDENCE!
        evidence_status: "verified",
      },
    ];

    const { findings } = validateAndMergeFindings({
      draftText,
      ruleFindings: [],
      llmFindings,
      retrievedSources: mockSources,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0].evidence_status).toBe("needs_human_judgement");
    expect(findings[0].severity).toBe("minor"); // Capped!
  });

  it("flags requires_designated_reviewer = true for critical claim/fact findings", () => {
    const draftText = "Undisputed #1 titanium watch in the world.";
    const ruleFindings: RuleFinding[] = [
      {
        lane: "rule",
        category: "claim",
        severity: "critical",
        span_start: 0,
        span_end: 14,
        span_text: "Undisputed #1",
        explanation: "Critical claim without certification.",
        evidence_status: "unverified",
        confidence: 1.0,
        suggestion: null,
      },
    ];

    const { findings } = validateAndMergeFindings({
      draftText,
      ruleFindings,
      llmFindings: [],
      retrievedSources: mockSources,
    });

    expect(findings[0].requires_designated_reviewer).toBe(true);
  });
});

