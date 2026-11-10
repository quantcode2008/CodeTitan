import { RuleFinding } from "../types";
import { SeverityLevel } from "@/lib/database.types";

export interface TermRuleDefinition {
  id?: string;
  term: string;
  kind: "prohibited" | "preferred" | "required_phrase";
  replacement?: string | null;
  severity?: SeverityLevel;
  source_id?: string | null;
  source_key?: string | null;
  notes?: string | null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 4a. Prohibited & Preferred Terms Rule.
 * Scans draft text using case-insensitive, word-boundary regexes against brand_terms.
 */
export function scanTermsRule(
  draftText: string,
  terms: TermRuleDefinition[]
): RuleFinding[] {
  if (!draftText || !terms || terms.length === 0) return [];

  const findings: RuleFinding[] = [];

  for (const termRule of terms) {
    if (termRule.kind === "prohibited") {
      // Case-insensitive, word-boundary regex
      const pattern = new RegExp(`\\b${escapeRegex(termRule.term.trim())}\\b`, "gi");
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(draftText)) !== null) {
        const spanText = match[0];
        const spanStart = match.index;
        const spanEnd = spanStart + spanText.length;

        findings.push({
          lane: "rule",
          category: "terminology",
          severity: termRule.severity || "major",
          span_start: spanStart,
          span_end: spanEnd,
          span_text: spanText,
          explanation:
            termRule.notes ||
            `The term "${spanText}" is prohibited under brand governance policy.`,
          source_id: termRule.source_id || null,
          source_key: termRule.source_key || null,
          evidence_status: "verified",
          confidence: 1.0,
          suggestion: termRule.replacement || null,
        });
      }
    }
  }

  return findings;
}
