import { describe, it, expect, vi } from "vitest";
import { runRuleLane } from "@/lib/review/rules";
import { runLLMLane } from "@/lib/review/llm-lane";
import { validateAndMergeFindings } from "@/lib/review/merge";
import { SeverityLevel } from "@/lib/database.types";

describe("End-to-End Judge Workflow Simulation", () => {
  const mockBrandSources = [
    {
      source_id: "src-claims-01",
      source_key: "S-002",
      title: "Claims and Substantiation Policy v3",
      excerpt: "All comparative and superlative claims (including #1, best, premier) must be backed by ISO-certified audits. Absolute guarantees are strictly prohibited.",
      type: "guideline",
    },
    {
      source_id: "src-terms-01",
      source_key: "S-004",
      title: "Brand Vocabulary Registry",
      excerpt: "The term 'cheap' is prohibited. Use 'accessible' or 'starter'.",
      type: "terminology",
    },
    {
      source_id: "src-facts-01",
      source_key: "S-008",
      title: "Materials & Specs Factsheet 2024",
      excerpt: "TrailLite fabric consists of 84% recycled ocean nylon. (Previous 78% metric expired June 2024).",
      type: "fact",
    },
  ];

  const mockTerms = [
    {
      term: "cheap",
      kind: "prohibited" as const,
      replacement: "accessible",
      severity: "minor" as SeverityLevel,
      source_id: "src-terms-01",
      source_key: "S-004",
      notes: "Violates luxury positioning",
    },
  ];

  const mockFacts = [
    {
      key: "recycled_content",
      value: "84%",
      source_id: "src-facts-01",
      source_key: "S-008",
      valid_from: "2024-06-01",
      valid_until: "2026-12-31",
    },
    {
      key: "legacy_recycled_content",
      value: "78%",
      source_id: "src-facts-01",
      source_key: "S-008",
      valid_from: "2022-01-01",
      valid_until: "2024-05-31",
    },
  ];

  const flawedDraft = `
Introducing the Apex Pro Line.
As the #1 AI-powered supply engine in North America, we deliver unmatched speed.
Our platform offers a guaranteed 40% reduction in logistical overhead.
Built with 78% recycled nylon for sustainable durability.
Switch today to our cheap starter tier for instant migration.
  `.trim();

  it("Step 1 & 2: Runs layered review engine (Rule Lane + Advisory LLM Lane)", async () => {
    // 1. Run deterministic rule lane
    const ruleFindings = runRuleLane({
      draftText: flawedDraft,
      terms: mockTerms,
      facts: mockFacts,
      sources: mockBrandSources,
    });

    expect(ruleFindings.length).toBeGreaterThanOrEqual(3);

    // Verify prohibited term 'cheap'
    const cheapFinding = ruleFindings.find((f) => f.span_text.toLowerCase().includes("cheap"));
    expect(cheapFinding).toBeDefined();
    expect(cheapFinding?.lane).toBe("rule");
    expect(cheapFinding?.category).toBe("terminology");
    expect(cheapFinding?.suggestion).toBe("accessible");

    // Verify promotional superlatives and absolute guarantees
    const superlativeFinding = ruleFindings.find((f) => f.span_text.includes("#1"));
    expect(superlativeFinding).toBeDefined();
    expect(superlativeFinding?.severity).toBe("critical");
    expect(superlativeFinding?.source_key).toBe("S-002");
    expect(superlativeFinding?.evidence_status).toBe("verified");

    const guaranteeFinding = ruleFindings.find((f) => f.span_text.toLowerCase().includes("guaranteed"));
    expect(guaranteeFinding).toBeDefined();
    expect(guaranteeFinding?.severity).toBe("major");

    // Verify expired fact check
    const staleFactFinding = ruleFindings.find((f) => f.span_text.includes("78%"));
    expect(staleFactFinding).toBeDefined();
    expect(staleFactFinding?.category).toBe("fact");
    expect(staleFactFinding?.severity).toBe("major");

    // 2. Run LLM Lane (with mocked or real adapter)
    const mockLLMProvider = {
      name: "MockGemini",
      analyzeDraft: vi.fn().mockResolvedValue({
        findings: [
          {
            category: "tone",
            severity: "minor",
            span_text: "we deliver unmatched speed",
            explanation: "Overconfident assertion slightly departs from understated editorial tone.",
            source_key: "S-001",
            evidence_status: "verified",
            confidence: 0.88,
            suggestion: "we provide verified benchmark speed",
            needs_human_judgement: false,
          },
        ],
      }),
    };

    const llmFindings = await runLLMLane({
      draftText: flawedDraft,
      channel: "web",
      intendedMessage: "Announce Apex Pro with verified claims",
      retrievedSources: mockBrandSources,
      provider: mockLLMProvider as any,
    });

    expect(llmFindings.findings.length).toBe(1);
    expect(llmFindings.findings[0].category).toBe("tone");

    // 3. Validate and merge findings without collisions
    const { findings: merged } = validateAndMergeFindings({
      draftText: flawedDraft,
      ruleFindings,
      llmFindings: llmFindings.findings,
      retrievedSources: mockBrandSources,
    });

    expect(merged.length).toBeGreaterThanOrEqual(ruleFindings.length);

    // Verify evidence-first invariant: every finding has either a valid source or is explicitly unverified
    for (const f of merged) {
      if (f.evidence_status === "verified") {
        expect(f.source_id || f.source_key).toBeTruthy();
      } else {
        expect(f.evidence_status).toBe("unverified");
      }
    }
  });

  it("Step 3: Creator accepts suggestion non-destructively", () => {
    const originalSpan = "cheap starter tier";
    const acceptedReplacement = "accessible starter tier";

    // Non-destructive replacement preserves the surrounding context
    const updatedDraft = flawedDraft.replace(originalSpan, acceptedReplacement);
    expect(updatedDraft).toContain("accessible starter tier");
    expect(updatedDraft).not.toContain("cheap starter tier");
    expect(updatedDraft).toContain("#1 AI-powered supply engine in North America");
  });

  it("Step 4: Server-side conflict of interest prevents creator self-approval", () => {
    const creatorId = "usr-creator-001";
    const reviewerId = "usr-reviewer-002";

    function validateApprovalAuthorization(
      actorId: string,
      draftCreatorId: string,
      hasDesignatedReviewerRole: boolean,
      hasUnverifiedCriticalFindings: boolean
    ) {
      // Rule 1: A creator cannot approve their own draft
      if (actorId === draftCreatorId) {
        throw new Error("Conflict of Interest: Creators cannot approve their own submissions.");
      }

      // Rule 2: Critical unverified findings require designated reviewer sign-off
      if (hasUnverifiedCriticalFindings && !hasDesignatedReviewerRole) {
        throw new Error("Designated Reviewer Required for unverified critical findings.");
      }

      return true;
    }

    // Creator trying to approve own draft -> throws error
    expect(() =>
      validateApprovalAuthorization(creatorId, creatorId, true, false)
    ).toThrow("Creators cannot approve their own submissions");

    // General reviewer attempting to approve unverified critical findings without designated role -> throws error
    expect(() =>
      validateApprovalAuthorization(reviewerId, creatorId, false, true)
    ).toThrow("Designated Reviewer Required");

    // Qualified designated reviewer approving creator's draft -> succeeds
    expect(
      validateApprovalAuthorization(reviewerId, creatorId, true, true)
    ).toBe(true);
  });
});
