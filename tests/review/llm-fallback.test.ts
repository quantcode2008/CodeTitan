import { describe, it, expect, vi } from "vitest";
import { runLLMLane } from "@/lib/review/llm-lane";
import { LLMProvider } from "@/lib/llm/provider";

describe("LLM Lane Resilience & Fallback", () => {
  it("retries once when provider throws a transient error and succeeds", async () => {
    let callCount = 0;

    const flakyProvider: LLMProvider = {
      name: "FlakyMockProvider",
      analyzeDraft: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("HTTP 503 Service Unavailable");
        }
        return {
          findings: [
            {
              span_text: "Order now before supplies vanish",
              category: "tone",
              severity: "major",
              explanation: "Urgent marketing tone.",
              confidence: 0.9,
              evidence_status: "verified",
              source_key: "S-001",
            },
          ],
          overall_tone_summary: "Tone analysis recovered after retry.",
        };
      }),
    };

    const result = await runLLMLane({
      draftText: "Please Order now before supplies vanish quickly.",
      channel: "web",
      retrievedSources: [],
      provider: flakyProvider,
    });

    expect(callCount).toBe(2);
    expect(result.ai_available).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].span_text).toBe("Order now before supplies vanish");
  });

  it("gracefully degrades when LLM continues to fail, marking ai_available = false", async () => {
    let callCount = 0;

    const failingProvider: LLMProvider = {
      name: "FailingMockProvider",
      analyzeDraft: vi.fn().mockImplementation(async () => {
        callCount++;
        throw new Error("API Key Quota Exceeded or Network Down");
      }),
    };

    const result = await runLLMLane({
      draftText: "Some draft text to review.",
      channel: "web",
      retrievedSources: [],
      provider: failingProvider,
    });

    // Attempted once + retried once = 2 calls
    expect(callCount).toBe(2);
    expect(result.ai_available).toBe(false);
    expect(result.findings).toHaveLength(0);
    expect(result.error).toContain("API Key Quota Exceeded");
  });
});

