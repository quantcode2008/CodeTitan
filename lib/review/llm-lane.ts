import { z } from "zod";
import { getLLMProvider, LLMProvider } from "@/lib/llm/provider";
import { inspectUntrustedDraft } from "@/lib/llm/prompt-isolation";
import { LLMFindingRaw, RetrievedContext } from "./types";
import { FindingCategorySchema, SeverityLevelSchema, EvidenceStatusSchema } from "@/lib/llm/schema";

export const LLMLaneFindingSchema = z.object({
  span_text: z.string().min(1, "span_text cannot be empty"),
  category: FindingCategorySchema,
  severity: SeverityLevelSchema,
  explanation: z.string().min(1, "explanation cannot be empty"),
  source_key: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.9),
  suggestion: z.string().nullable().optional(),
  evidence_status: EvidenceStatusSchema,
});

export const LLMLaneResponseSchema = z.object({
  findings: z.array(LLMLaneFindingSchema),
  overall_tone_summary: z.string().optional(),
});

export interface LLMLaneParams {
  draftText: string;
  channel: string;
  intendedMessage?: string | null;
  retrievedSources: RetrievedContext[];
  provider?: LLMProvider;
}

export interface LLMLaneResult {
  ai_available: boolean;
  findings: LLMFindingRaw[];
  adversarial_injection_detected: boolean;
  injection_flags?: string[];
  overall_tone_summary?: string;
  error?: string;
}

/**
 * 5. LLM LANE
 * Runs LLM Tone & Meaning Analysis using Provider Abstraction (Gemini / Mock).
 * Enforces Prompt Isolation, single retry on invalid JSON, and graceful degradation.
 */
export async function runLLMLane(params: LLMLaneParams): Promise<LLMLaneResult> {
  const { draftText, channel, intendedMessage, retrievedSources } = params;

  // 1. Inspect untrusted draft for prompt injection attacks
  const inspection = inspectUntrustedDraft(draftText);

  const provider = params.provider || getLLMProvider();

  // Format retrieved sources into strict context blocks
  const formattedSources = retrievedSources.map((s) => ({
    id: s.source_id,
    source_key: s.source_key,
    title: s.title,
    body: s.excerpt,
    type: s.type || "guideline",
  }));

  // Helper to attempt analysis with retry
  async function attemptCall(): Promise<LLMLaneResult> {
    const response = await provider.analyzeDraft({
      draft_text: inspection.sanitizedText,
      channel,
      intended_message: intendedMessage || undefined,
      brand_sources: formattedSources,
    });

    const parsed = LLMLaneResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid LLM response structure: ${parsed.error.message}`);
    }

    const rawFindings: LLMFindingRaw[] = parsed.data.findings.map((f) => ({
      span_text: f.span_text,
      category: f.category,
      severity: f.severity,
      explanation: f.explanation,
      source_key: f.source_key || null,
      confidence: f.confidence,
      suggestion: f.suggestion || null,
      evidence_status: f.evidence_status,
    }));

    return {
      ai_available: true,
      findings: rawFindings,
      adversarial_injection_detected: inspection.hasAdversarialAttempt,
      injection_flags: inspection.injectionFlags,
      overall_tone_summary: parsed.data.overall_tone_summary,
    };
  }

  try {
    // Attempt 1
    return await attemptCall();
  } catch (errFirst) {
    console.warn("LLM Lane Attempt 1 failed, retrying once:", errFirst);
    try {
      // Attempt 2 (Retry once on invalid JSON / transient error)
      return await attemptCall();
    } catch (errSecond: any) {
      console.warn("LLM Lane Attempt 2 failed. Gracefully degrading to rule-only mode:", errSecond);
      // Degrade gracefully: return ai_available = false so pipeline continues with rule findings
      return {
        ai_available: false,
        findings: [],
        adversarial_injection_detected: inspection.hasAdversarialAttempt,
        injection_flags: inspection.injectionFlags,
        error: errSecond?.message || "AI analysis unavailable",
      };
    }
  }
}

