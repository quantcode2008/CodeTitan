import { describe, it, expect } from "vitest";
import { GovernanceOrchestrator } from "@/lib/engine/orchestrator";
import { MockLLMAdapter } from "@/lib/llm/mock-adapter";
import { BrandSourceContext } from "@/lib/llm/schema";
import { RuleTerm, RuleFact } from "@/lib/engine/deterministic";

describe("Two-Lane Governance Orchestrator", () => {
  const orchestrator = new GovernanceOrchestrator();
  const mockLLM = new MockLLMAdapter();

  const brandSources: BrandSourceContext[] = [
    {
      id: "c0000000-0000-0000-0000-000000000001",
      source_key: "S-001",
      title: "Tone of Voice Guide",
      body: "Quiet confidence, warm, plainspoken. Avoid breathless promotional urgency.",
      type: "tone_example",
    },
    {
      id: "c0000000-0000-0000-0000-000000000003",
      source_key: "S-003",
      title: "Global Claims Policy v3.0",
      body: "Absolute superlatives like #1 and world's best are prohibited without verified testing.",
      type: "claim_policy",
    },
    {
      id: "c0000000-0000-0000-0000-000000000004",
      source_key: "S-004",
      title: "Warranty Policy",
      body: "Must include disclaimer: Covers manufacturer defects under normal trail usage.",
      type: "guideline",
    },
    {
      id: "c0000000-0000-0000-0000-000000000006",
      source_key: "S-006",
      title: "Certified Fact Sheet 2026",
      body: "Eco-Nylon 78% post-consumer certification expired Dec 31, 2024.",
      type: "fact",
    },
    {
      id: "c0000000-0000-0000-0000-000000000008",
      source_key: "S-008",
      title: "Prohibited Terminology",
      body: "Banned: cheap, revolutionary, miracle fabric.",
      type: "terminology",
    },
  ];

  const terms: RuleTerm[] = [
    {
      term: "cheap",
      kind: "prohibited",
      replacement: "accessible",
      severity: "major",
      source_key: "S-008",
    },
    {
      term: "miracle fabric",
      kind: "prohibited",
      replacement: "weather-sealed technical textile",
      severity: "critical",
      source_key: "S-008",
    },
    {
      term: "Covers manufacturer defects under normal trail usage",
      kind: "required_phrase",
      severity: "critical",
      source_key: "S-004",
    },
  ];

  const facts: RuleFact[] = [
    {
      key: "recycled_nylon_percentage",
      value: "78",
      unit: "percent",
      valid_until: "2024-12-31", // Expired
      source_key: "S-006",
    },
  ];

  it("orchestrates Draft 1 (SummitX Pack): identifies critical claim, prohibited term, and tone drift", async () => {
    const draftText =
      "The all-new SummitX is the undisputed #1 expedition pack on the market guaranteed for eternity. Engineered with miracle fabric, order today before supplies vanish forever!";

    const result = await orchestrator.auditDraft({
      draftText,
      channel: "web",
      brandSources,
      terms,
      facts,
      llmProvider: mockLLM,
    });

    expect(result.review_status).toBe("needs_attention");
    expect(result.findings.length).toBeGreaterThanOrEqual(3);

    // Verify Lane attribution
    const ruleFindings = result.findings.filter((f) => f.lane === "rule");
    const llmFindings = result.findings.filter((f) => f.lane === "llm");

    expect(ruleFindings.length).toBeGreaterThan(0);
    expect(llmFindings.length).toBeGreaterThan(0);

    // Prohibited term "miracle fabric" must be detected by rule lane
    const miracleFinding = ruleFindings.find((f) => f.span_text === "miracle fabric");
    expect(miracleFinding).toBeDefined();
    expect(miracleFinding?.severity).toBe("critical");
    expect(miracleFinding?.source_key).toBe("S-008");

    // Tone finding "Order today before supplies vanish forever!" must be detected by LLM lane
    const toneFinding = llmFindings.find((f) => f.category === "tone");
    expect(toneFinding).toBeDefined();
    expect(toneFinding?.severity).toBe("major");
    expect(toneFinding?.source_key).toBe("S-001");
  });

  it("orchestrates Draft 2 (TrailLite Jacket): flags stale statistic and prohibited term", async () => {
    const draftText =
      "The TrailLite Alpine jacket delivers cheap alpine performance, crafted with 78% certified recycled ocean nylon.";

    const result = await orchestrator.auditDraft({
      draftText,
      channel: "web",
      brandSources,
      terms,
      facts,
      referenceDate: new Date("2026-11-09T00:00:00Z"),
      llmProvider: mockLLM,
    });

    expect(result.review_status).toBe("needs_attention");

    // Check prohibited term "cheap"
    const cheapFinding = result.findings.find((f) => f.span_text === "cheap");
    expect(cheapFinding).toBeDefined();
    expect(cheapFinding?.lane).toBe("rule");

    // Check stale stat "78%"
    const staleStatFinding = result.findings.find((f) => f.category === "fact");
    expect(staleStatFinding).toBeDefined();
    expect(staleStatFinding?.span_text).toBe("78%");
    expect(staleStatFinding?.explanation).toContain("STALE STATISTIC");
  });

  it("enforces Fundamental Law on clean Draft 3: scan never equals approval, transitions to ready_for_review", async () => {
    const cleanDraft =
      "Good gear should endure for generations. With routine care and occasional wax reapplication, your pack will repel Pacific Northwest rains season after season. Every stitch is backed by our 25-Year Gear Promise. Covers manufacturer defects under normal trail usage.";

    const result = await orchestrator.auditDraft({
      draftText: cleanDraft,
      channel: "web",
      brandSources,
      terms,
      facts,
      llmProvider: mockLLM,
    });

    expect(result.findings).toHaveLength(0);
    // NON-NEGOTIABLE LAW: A clean scan NEVER equals approved!
    expect(result.review_status).toBe("ready_for_review");
    expect(result.summary.total_findings).toBe(0);
  });

  it("enforces Evidence-First rule: unverified claim without matching source is flagged unverified", async () => {
    const draftWithUnverifiedClaim =
      "This pack is reportedly saving teams 12 hours every week in routine packing time.";

    const result = await orchestrator.auditDraft({
      draftText: draftWithUnverifiedClaim,
      channel: "web",
      brandSources,
      terms,
      facts,
      llmProvider: mockLLM,
    });

    const unverifiedFinding = result.findings.find(
      (f) => f.evidence_status === "unverified"
    );
    expect(unverifiedFinding).toBeDefined();
    expect(unverifiedFinding?.source_id).toBeNull();
    expect(unverifiedFinding?.needs_human_judgement).toBe(true);
  });
});
