import { z } from "zod";

export const FindingCategorySchema = z.enum([
  "tone",
  "terminology",
  "messaging",
  "claim",
  "fact",
  "accessibility",
  "visual",
  "other",
]);

export const SeverityLevelSchema = z.enum([
  "critical",
  "major",
  "minor",
  "advisory",
]);

export const EvidenceStatusSchema = z.enum([
  "verified",
  "unverified",
  "needs_human_judgement",
]);

export const LLMFindingCandidateSchema = z.object({
  category: FindingCategorySchema,
  severity: SeverityLevelSchema,
  span_text: z.string().min(1, "Span text cannot be empty"),
  explanation: z.string().min(1, "Explanation cannot be empty"),
  source_key: z.string().nullable().optional(),
  evidence_status: EvidenceStatusSchema,
  confidence: z.number().min(0).max(1).default(0.9),
  suggestion: z.string().nullable().optional(),
  needs_human_judgement: z.boolean().default(false),
  reasoning: z.string().optional(),
});

export const LLMAnalysisResponseSchema = z.object({
  findings: z.array(LLMFindingCandidateSchema),
  overall_tone_summary: z.string().default("Tone evaluation complete."),
  is_adversarial_injection_detected: z.boolean().default(false),
});

export type FindingCategory = z.infer<typeof FindingCategorySchema>;
export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>;
export type LLMFindingCandidate = z.infer<typeof LLMFindingCandidateSchema>;
export type LLMAnalysisResponse = z.infer<typeof LLMAnalysisResponseSchema>;

export interface BrandSourceContext {
  id: string;
  source_key: string;
  title: string;
  body: string;
  type: string;
}

export interface BrandFactContext {
  key: string;
  value: string;
  unit: string | null;
  valid_from: string | null;
  valid_until: string | null;
}

export interface BrandTermContext {
  id: string;
  term: string;
  kind: "prohibited" | "preferred" | "required_phrase";
  replacement: string | null;
  severity: SeverityLevel;
  source_key?: string;
  notes?: string | null;
}

export interface LLMAnalysisRequest {
  draft_text: string;
  channel: string;
  intended_message?: string;
  campaign_context?: string;
  brand_sources: BrandSourceContext[];
  facts?: BrandFactContext[];
}

