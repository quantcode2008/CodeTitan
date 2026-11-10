import { LLMProvider } from "./provider";
import {
  LLMAnalysisRequest,
  LLMAnalysisResponse,
  LLMFindingCandidate,
  LLMAnalysisResponseSchema,
} from "./schema";
import { inspectUntrustedDraft } from "./prompt-isolation";

/**
 * Calibrated Mock LLM Adapter for testing and offline development.
 * Produces deterministic findings calibrated to the Aster & Pine governance rules.
 */
export class MockLLMAdapter implements LLMProvider {
  public name = "MockLLMProvider";

  public async analyzeDraft(
    request: LLMAnalysisRequest
  ): Promise<LLMAnalysisResponse> {
    const text = request.draft_text;
    const inspection = inspectUntrustedDraft(text);
    const findings: LLMFindingCandidate[] = [];

    // 1. Adversarial prompt injection check
    if (inspection.hasAdversarialAttempt) {
      findings.push({
        category: "other",
        severity: "critical",
        span_text: "Prompt injection marker detected",
        explanation:
          "Adversarial prompt-injection attempt detected in untrusted draft. Document attempted to command the reviewer or bypass governance rules.",
        source_key: null,
        evidence_status: "unverified",
        confidence: 1.0,
        suggestion: null,
        needs_human_judgement: true,
      });
    }

    // 2. Breathless promotional urgency check (Tone)
    const urgencyPatterns = [
      /Order today before supplies vanish forever!/i,
      /act now/i,
      /blows away/i,
      /don't miss out/i,
    ];

    for (const pat of urgencyPatterns) {
      const match = pat.exec(text);
      if (match) {
        findings.push({
          category: "tone",
          severity: "major",
          span_text: match[0],
          explanation:
            "Breathless promotional urgency violates Aster & Pine's quiet, plainspoken tone of voice guidelines (§1).",
          source_key: "S-001",
          evidence_status: "verified",
          confidence: 0.94,
          suggestion: "Now available for autumn alpine ascents.",
          needs_human_judgement: false,
        });
      }
    }

    // 3. Absolute superlative claim check (Claim)
    const superlativePatterns = [
      /undisputed\s+#1/i,
      /world's\s+best/i,
      /guaranteed\s+for\s+eternity/i,
      /unbeatable/i,
    ];

    for (const pat of superlativePatterns) {
      const match = pat.exec(text);
      if (match) {
        findings.push({
          category: "claim",
          severity: "critical",
          span_text: match[0],
          explanation:
            "Absolute superlative claim violates Claims Policy v3.0 (§3). Superlatives require certified third-party testing.",
          source_key: "S-003",
          evidence_status: "verified",
          confidence: 0.97,
          suggestion: "purpose-built expedition pack",
          needs_human_judgement: false,
        });
      }
    }

    // 4. Unsupported external metric check (Unverified)
    const unverifiedStat = /saving teams 12 hours every week/i;
    const statMatch = unverifiedStat.exec(text);
    if (statMatch) {
      findings.push({
        category: "claim",
        severity: "major",
        span_text: statMatch[0],
        explanation:
          "Quantitative productivity claim is cited without supporting certification in the Brand Knowledge Base.",
        source_key: null,
        evidence_status: "unverified",
        confidence: 0.85,
        suggestion: "streamlining governance review cycles according to internal pilots",
        needs_human_judgement: true,
      });
    }

    const response: LLMAnalysisResponse = {
      findings,
      overall_tone_summary:
        findings.length > 0
          ? `Identified ${findings.length} advisory brand governance issues in draft copy.`
          : "Draft tone aligns with calm, plainspoken brand guidelines.",
      is_adversarial_injection_detected: inspection.hasAdversarialAttempt,
    };

    return LLMAnalysisResponseSchema.parse(response);
  }
}

