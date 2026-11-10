import { LLMProvider } from "./provider";
import {
  LLMAnalysisRequest,
  LLMAnalysisResponse,
  LLMAnalysisResponseSchema,
} from "./schema";
import {
  buildIsolatedAnalysisPrompt,
  inspectUntrustedDraft,
} from "./prompt-isolation";

/**
 * Concrete LLM Adapter for Google Gemini API.
 * Uses structured JSON output with Zod validation.
 */
export class GeminiAdapter implements LLMProvider {
  public name = "GeminiProvider";
  private apiKey: string;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  public async analyzeDraft(
    request: LLMAnalysisRequest
  ): Promise<LLMAnalysisResponse> {
    // 1. Inspect for adversarial prompt injection
    const inspection = inspectUntrustedDraft(request.draft_text);

    // 2. Build isolated prompt
    const { systemInstruction, userPrompt } = buildIsolatedAnalysisPrompt({
      draftText: inspection.sanitizedText,
      channel: request.channel,
      intendedMessage: request.intended_message,
      campaignContext: request.campaign_context,
      brandSources: request.brand_sources,
      facts: request.facts,
    });

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Gemini API error: HTTP ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const rawText =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      const parsedJson = JSON.parse(rawText);
      const validated = LLMAnalysisResponseSchema.parse(parsedJson);

      // If injection attempt was detected during client pre-scan, append security finding
      if (inspection.hasAdversarialAttempt) {
        validated.is_adversarial_injection_detected = true;
        validated.findings.unshift({
          category: "other",
          severity: "critical",
          span_text: inspection.injectionFlags.join("; "),
          explanation:
            "Adversarial prompt-injection attempt detected in untrusted draft. Document attempted to override governance instructions.",
          source_key: null,
          evidence_status: "unverified",
          confidence: 1.0,
          suggestion: null,
          needs_human_judgement: true,
          reasoning: "Prompt-injection defense trigger",
        });
      }

      return validated;
    } catch (err) {
      console.error("Gemini analysis error, falling back to safe advisory mode:", err);

      // Graceful fallback with advisory finding
      return {
        findings: [
          {
            category: "tone",
            severity: "advisory",
            span_text: request.draft_text.slice(0, 50),
            explanation:
              "LLM analysis encountered a connectivity or parsing exception. Flagged for human reviewer inspection.",
            source_key: null,
            evidence_status: "needs_human_judgement",
            confidence: 0.5,
            suggestion: null,
            needs_human_judgement: true,
            reasoning: String(err),
          },
        ],
        overall_tone_summary: "Automated scan incomplete; human inspection required.",
        is_adversarial_injection_detected: inspection.hasAdversarialAttempt,
      };
    }
  }
}
