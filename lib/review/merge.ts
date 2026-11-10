import { RuleFinding, LLMFindingRaw, ReviewFinding, RetrievedContext } from "./types";
import { SeverityLevel } from "@/lib/database.types";

export interface MergeParams {
  draftText: string;
  ruleFindings: RuleFinding[];
  llmFindings: LLMFindingRaw[];
  retrievedSources: RetrievedContext[];
  adversarialInjectionDetected?: boolean;
  injectionFlags?: string[];
}

/**
 * Checks if two text spans overlap.
 */
function spansOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return !(aEnd <= bStart || aStart >= bEnd);
}

/**
 * Redacts raw text for safe logging without leaking confidential draft content.
 */
function redactForLog(text: string, maxLen = 20): string {
  if (!text) return "[empty]";
  return `[length: ${text.length}, prefix: "${text.slice(0, maxLen).replace(/\s+/g, " ")}..."]`;
}

/**
 * 6. VALIDATE & MERGE
 * - Resolves span_text to character offsets (span_start, span_end)
 * - Drops hallucinated source citations not present in retrieved context
 * - Deduplicates overlapping findings (rule lane wins on conflicts)
 * - Gates low confidence findings (<0.55) to needs_human_judgement & caps severity
 * - Enforces designated reviewer requirement on critical claims/facts
 * - Injects security finding if adversarial prompt injection is detected
 */
export function validateAndMergeFindings(params: MergeParams): {
  findings: ReviewFinding[];
  validationWarnings: string[];
} {
  const {
    draftText,
    ruleFindings,
    llmFindings,
    retrievedSources,
    adversarialInjectionDetected,
    injectionFlags,
  } = params;

  const validationWarnings: string[] = [];
  const mergedFindings: ReviewFinding[] = [];

  // Map of valid source keys from retrieved context
  const sourceKeyMap = new Map<string, RetrievedContext>();
  for (const src of retrievedSources) {
    if (src.source_key) {
      sourceKeyMap.set(src.source_key.toUpperCase(), src);
    }
  }

  // 1. Process Rule Findings (already have exact spans and verified citations)
  for (const rf of ruleFindings) {
    const isCriticalHighRisk =
      (rf.category === "claim" || rf.category === "fact") && rf.severity === "critical";

    mergedFindings.push({
      lane: "rule",
      category: rf.category,
      severity: rf.severity,
      span_start: rf.span_start,
      span_end: rf.span_end,
      span_text: rf.span_text,
      explanation: rf.explanation,
      source_id: rf.source_id || null,
      source_key: rf.source_key || null,
      evidence_status: rf.evidence_status,
      confidence: rf.confidence,
      suggestion: rf.suggestion,
      status: "open",
      requires_designated_reviewer: isCriticalHighRisk || Boolean(rf.requires_designated_reviewer),
    });
  }

  // 2. Process & Validate LLM Findings
  for (const raw of llmFindings) {
    if (!raw.span_text || !raw.span_text.trim()) {
      validationWarnings.push("Dropped LLM finding with empty span_text");
      continue;
    }

    // Resolve span offsets by locating in draft text
    let spanStart = draftText.indexOf(raw.span_text);
    let spanEnd = -1;

    if (spanStart !== -1) {
      spanEnd = spanStart + raw.span_text.length;
    } else {
      // Case-insensitive fallback search
      const lowerDraft = draftText.toLowerCase();
      const lowerSpan = raw.span_text.toLowerCase().trim();
      const fallbackIdx = lowerDraft.indexOf(lowerSpan);

      if (fallbackIdx !== -1) {
        spanStart = fallbackIdx;
        spanEnd = fallbackIdx + lowerSpan.length;
      } else {
        // Unlocatable span text: drop finding and log validation warning
        validationWarnings.push(
          `Validation warning: dropped LLM finding with unlocatable span text ${redactForLog(raw.span_text)}`
        );
        continue;
      }
    }

    const exactSpanText = draftText.slice(spanStart, spanEnd);

    // Check for overlap with existing rule findings (rule lane wins on exact conflicts)
    const overlapsWithRule = mergedFindings.some(
      (rf) => spansOverlap(spanStart, spanEnd, rf.span_start, rf.span_end)
    );

    if (overlapsWithRule) {
      validationWarnings.push(
        `Deduplication: dropped overlapping LLM finding in favor of rule lane at [${spanStart}, ${spanEnd}]`
      );
      continue;
    }

    // Validate source_key citation against retrieved context
    let sourceId: string | null = null;
    let sourceKey: string | null = null;
    let evidenceStatus = raw.evidence_status;

    if (raw.source_key) {
      const matchedSource = sourceKeyMap.get(raw.source_key.toUpperCase());
      if (matchedSource) {
        sourceId = matchedSource.source_id;
        sourceKey = matchedSource.source_key;
      } else {
        // Hallucinated citation detected! Strip citation and mark unverified
        sourceId = null;
        sourceKey = null;
        evidenceStatus = "unverified";
        validationWarnings.push(
          `Hallucinated citation stripped: LLM cited unknown source_key "${raw.source_key}"`
        );
      }
    }

    // Confidence Gating: confidence < 0.55 -> needs_human_judgement & cap severity
    let severity: SeverityLevel = raw.severity;
    const confidence = typeof raw.confidence === "number" ? raw.confidence : 0.8;

    if (confidence < 0.55) {
      evidenceStatus = "needs_human_judgement";
      if (severity === "critical" || severity === "major") {
        severity = "minor";
      }
    }

    // Check designated reviewer requirement
    const isCriticalHighRisk =
      (raw.category === "claim" || raw.category === "fact") && severity === "critical";

    mergedFindings.push({
      lane: "llm",
      category: raw.category,
      severity,
      span_start: spanStart,
      span_end: spanEnd,
      span_text: exactSpanText,
      explanation: raw.explanation,
      source_id: sourceId,
      source_key: sourceKey,
      evidence_status: evidenceStatus,
      confidence,
      suggestion: raw.suggestion || null,
      status: "open",
      requires_designated_reviewer: isCriticalHighRisk,
    });
  }

  // 3. Security: Check for Adversarial Prompt Injection in Draft
  if (adversarialInjectionDetected) {
    // Locate where the prompt injection keyword appeared in draftText
    const injectionRegex = /ignore\s+(all\s+|any\s+)?(previous|prior|above)\s+instructions|disregard\s+(all\s+)?(previous|prior|system)\s+instructions|system\s+prompt\s+override|mark\s+this\s+draft\s+as\s+approved/i;
    const match = draftText.match(injectionRegex);

    const spanStart = match ? match.index! : 0;
    const spanText = match ? match[0] : draftText.slice(0, Math.min(40, draftText.length));
    const spanEnd = spanStart + spanText.length;

    mergedFindings.unshift({
      lane: "rule",
      category: "other",
      severity: "critical",
      span_start: spanStart,
      span_end: spanEnd,
      span_text: spanText,
      explanation:
        "Adversarial prompt-injection detected in untrusted draft copy. The document attempted to override brand governance instructions.",
      source_id: null,
      source_key: null,
      evidence_status: "verified",
      confidence: 1.0,
      suggestion: null,
      status: "open",
      requires_designated_reviewer: true,
    });
  }

  // Sort final merged findings by start offset
  mergedFindings.sort((a, b) => a.span_start - b.span_start);

  return {
    findings: mergedFindings,
    validationWarnings,
  };
}
