import {
  FindingCategory,
  SeverityLevel,
  EvidenceStatus,
  FindingStatus,
  FindingLane,
  ReviewStatus,
} from "@/lib/database.types";

export interface RetrievedContext {
  source_id: string;
  source_key: string;
  title: string;
  excerpt: string;
  type?: string;
  current_version?: number;
}

export interface RuleFinding {
  lane?: FindingLane;
  category: FindingCategory;
  severity: SeverityLevel;
  span_start: number;
  span_end: number;
  span_text: string;
  explanation: string;
  source_id?: string | null;
  source_key?: string | null;
  evidence_status: EvidenceStatus;
  confidence: number;
  suggestion: string | null;
  requires_designated_reviewer?: boolean;
}

export interface LLMFindingRaw {
  span_text: string;
  category: FindingCategory;
  severity: SeverityLevel;
  explanation: string;
  source_key?: string | null;
  confidence: number;
  suggestion?: string | null;
  evidence_status: EvidenceStatus;
}

export interface ReviewFinding {
  id?: string;
  review_id?: string;
  lane: FindingLane;
  category: FindingCategory;
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
  status: FindingStatus;
  resolution_note?: string | null;
  requires_designated_reviewer: boolean;
}

export interface ReviewRunSummary {
  total: number;
  rule_count: number;
  llm_count: number;
  critical_count: number;
  major_count: number;
  minor_count: number;
  advisory_count: number;
  requires_designated_reviewer: boolean;
  ai_available: boolean;
  adversarial_injection_detected: boolean;
}

export interface ReviewRunResult {
  success: boolean;
  review_id: string;
  revision_id: string;
  content_item_id: string;
  status: ReviewStatus;
  findings: ReviewFinding[];
  summary: ReviewRunSummary;
  retrieved_sources: RetrievedContext[];
  source_versions_snapshot: Record<string, number>;
  timing_ms: number;
  error?: string;
}

