import { DeterministicEngine, RuleTerm, RuleFact } from "./deterministic";
import { getLLMProvider, LLMProvider } from "@/lib/llm/provider";
import {
  BrandSourceContext,
  BrandFactContext,
  SeverityLevel,
  EvidenceStatus,
} from "@/lib/llm/schema";

export interface GovernanceFinding {
  id?: string;
  lane: "rule" | "llm";
  category: "tone" | "terminology" | "messaging" | "claim" | "fact" | "accessibility" | "visual" | "other";
  severity: SeverityLevel;
  span_start: number;
  span_end: number;
  span_text: string;
  explanation: string;
  source_id: string | null;
  source_key: string | null;
  evidence_status: EvidenceStatus;
  confidence: number;
  suggestion: string | null;
  status: "open" | "accepted" | "edited" | "dismissed" | "explained";
  needs_human_judgement: boolean;
}

export interface OrchestrationResult {
  review_status: "needs_attention" | "ready_for_review";
  findings: GovernanceFinding[];
  summary: {
    total_findings: number;
    rule_lane_count: number;
    llm_lane_count: number;
    critical_count: number;
    major_count: number;
    minor_count: number;
    advisory_count: number;
    is_adversarial_injection_detected: boolean;
    tone_summary: string;
  };
}

export interface OrchestratorParams {
  draftText: string;
  channel: string;
  intendedMessage?: string;
  campaignContext?: string;
  brandSources: BrandSourceContext[];
  terms: RuleTerm[];
  facts?: RuleFact[];
  referenceDate?: Date;
  llmProvider?: LLMProvider;
}

/**
 * Two-Lane Brand Governance Orchestrator.
 * Combines Lane 1 (Deterministic Rules) and Lane 2 (LLM Tone & Claim Analysis)
 * while enforcing strict Evidence-First provenance and Human Judgement flags.
 */
export class GovernanceOrchestrator {
  private deterministicEngine: DeterministicEngine;

  constructor() {
    this.deterministicEngine = new DeterministicEngine();
  }

  public async auditDraft(params: OrchestratorParams): Promise<OrchestrationResult> {
    const {
      draftText,
      channel,
      intendedMessage,
      campaignContext,
      brandSources,
      terms,
      facts,
      referenceDate,
    } = params;

    // 1. Run Lane 1: Deterministic Engine
    const ruleFindings = this.deterministicEngine.scan({
      text: draftText,
      terms,
      facts,
      referenceDate,
    });

    const mappedRuleFindings: GovernanceFinding[] = ruleFindings.map((rf) => ({
      ...rf,
      source_id: rf.source_id || null,
      source_key: rf.source_key || null,
    }));

    // 2. Run Lane 2: LLM Tone & Claim Analysis
    const provider = params.llmProvider || getLLMProvider();

    const llmFactsContext: BrandFactContext[] | undefined = facts?.map((f) => ({
      key: f.key,
      value: f.value,
      unit: f.unit || null,
      valid_from: f.valid_from || null,
      valid_until: f.valid_until || null,
    }));

    const llmResponse = await provider.analyzeDraft({
      draft_text: draftText,
      channel,
      intended_message: intendedMessage,
      campaign_context: campaignContext,
      brand_sources: brandSources,
      facts: llmFactsContext,
    });

    // 3. Map & Validate LLM findings with Evidence-First rule
    const sourceKeyToIdMap = new Map<string, string>();
    for (const src of brandSources) {
      sourceKeyToIdMap.set(src.source_key.toUpperCase(), src.id);
    }

    const mappedLLMFindings: GovernanceFinding[] = [];

    for (const candidate of llmResponse.findings) {
      // Find character offsets in draft text
      let spanStart = draftText.indexOf(candidate.span_text);
      let spanEnd = spanStart >= 0 ? spanStart + candidate.span_text.length : 0;

      // Fallback if span not found verbatim
      if (spanStart === -1) {
        spanStart = 0;
        spanEnd = Math.min(candidate.span_text.length, draftText.length);
      }

      // Check for overlap with Lane 1 deterministic findings
      const hasOverlap = mappedRuleFindings.some((rf) => {
        return (
          (spanStart >= rf.span_start && spanStart < rf.span_end) ||
          (spanEnd > rf.span_start && spanEnd <= rf.span_end)
        );
      });

      // Deterministic rules take precedence over overlapping LLM recommendations
      if (hasOverlap) {
        continue;
      }

      // Enforce Principle 3: Evidence-First
      let evidenceStatus: EvidenceStatus = candidate.evidence_status;
      let matchedSourceId: string | null = null;
      let verifiedSourceKey: string | null = null;

      if (candidate.source_key) {
        const normalizedKey = candidate.source_key.toUpperCase();
        if (sourceKeyToIdMap.has(normalizedKey)) {
          matchedSourceId = sourceKeyToIdMap.get(normalizedKey) || null;
          verifiedSourceKey = candidate.source_key;
          evidenceStatus = "verified";
        } else {
          // Source cited by model does not exist in active context -> flag as unverified
          evidenceStatus = "unverified";
          verifiedSourceKey = null;
        }
      } else {
        evidenceStatus = "unverified";
      }

      mappedLLMFindings.push({
        lane: "llm",
        category: candidate.category,
        severity: candidate.severity,
        span_start: spanStart,
        span_end: spanEnd,
        span_text: candidate.span_text,
        explanation: candidate.explanation,
        source_id: matchedSourceId,
        source_key: verifiedSourceKey,
        evidence_status: evidenceStatus,
        confidence: candidate.confidence,
        suggestion: candidate.suggestion || null,
        status: "open",
        needs_human_judgement:
          candidate.needs_human_judgement || evidenceStatus === "unverified",
      });
    }

    // 4. Combine and Sort Findings by offset
    const allFindings = [...mappedRuleFindings, ...mappedLLMFindings].sort(
      (a, b) => a.span_start - b.span_start
    );

    // 5. Enforce Fundamental Law:
    // A clean automated scan NEVER equals approval.
    // If findings exist -> "needs_attention"
    // If 0 findings exist -> "ready_for_review" (awaiting designated human reviewer)
    const reviewStatus =
      allFindings.length > 0 ? "needs_attention" : "ready_for_review";

    // 6. Summary Statistics
    const summary = {
      total_findings: allFindings.length,
      rule_lane_count: allFindings.filter((f) => f.lane === "rule").length,
      llm_lane_count: allFindings.filter((f) => f.lane === "llm").length,
      critical_count: allFindings.filter((f) => f.severity === "critical").length,
      major_count: allFindings.filter((f) => f.severity === "major").length,
      minor_count: allFindings.filter((f) => f.severity === "minor").length,
      advisory_count: allFindings.filter((f) => f.severity === "advisory").length,
      is_adversarial_injection_detected:
        llmResponse.is_adversarial_injection_detected,
      tone_summary: llmResponse.overall_tone_summary,
    };

    return {
      review_status: reviewStatus,
      findings: allFindings,
      summary,
    };
  }
}

