import { LLMAnalysisRequest, LLMAnalysisResponse } from "./schema";
import { GeminiAdapter } from "./gemini-adapter";
import { MockLLMAdapter } from "./mock-adapter";

/**
 * Common LLM Provider Abstraction.
 * Decouples governance business logic from concrete AI vendor SDKs.
 */
export interface LLMProvider {
  name: string;
  analyzeDraft(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse>;
}

/**
 * Factory returning the appropriate LLM provider.
 * Uses GeminiAdapter if GEMINI_API_KEY is configured in environment,
 * otherwise falls back gracefully to calibrated MockLLMAdapter.
 */
export function getLLMProvider(): LLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    return new GeminiAdapter(apiKey);
  }

  return new MockLLMAdapter();
}

