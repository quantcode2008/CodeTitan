import { RuleFinding } from "../types";
import { SeverityLevel } from "@/lib/database.types";

export interface FactRuleDefinition {
  id?: string;
  key: string;
  value: string;
  unit?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  source_id?: string | null;
  source_key?: string | null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 4d. Fact Matching & Stale-Statistic Rule.
 * Compares draft metrics, percentages, and years against certified brand_facts.
 * Flags:
 * 1. Expired facts where valid_until < referenceDate (e.g. expired 78% recycling certificate)
 * 2. Conflicting facts (e.g. citing incorrect founded year or warranty period)
 */
export function scanFactsRule(
  draftText: string,
  facts: FactRuleDefinition[],
  referenceDate: Date = new Date()
): RuleFinding[] {
  if (!draftText || !facts || facts.length === 0) return [];

  const findings: RuleFinding[] = [];

  for (const fact of facts) {
    const isExpired = fact.valid_until && new Date(fact.valid_until) < referenceDate;

    // Build search patterns for this fact
    // 1. Exact value with unit e.g. "78%", "78% certified recycled ocean nylon"
    const valWithUnit = fact.unit ? `${fact.value}${fact.unit}` : fact.value;
    const valWithSpacedUnit = fact.unit ? `${fact.value}\\s*${escapeRegex(fact.unit)}` : escapeRegex(fact.value);

    if (isExpired) {
      // Look for broader context surrounding the expired statistic in the draft
      // e.g. "78% certified recycled ocean nylon" or "78%"
      const expiredRegex = new RegExp(
        `\\b${valWithSpacedUnit}(?:\\s+[a-zA-Z0-9-]+){0,5}\\b`,
        "gi"
      );

      let match: RegExpExecArray | null;
      while ((match = expiredRegex.exec(draftText)) !== null) {
        const spanText = match[0];
        const spanStart = match.index;
        const spanEnd = spanStart + spanText.length;

        findings.push({
          lane: "rule",
          category: "fact",
          severity: "major",
          span_start: spanStart,
          span_end: spanEnd,
          span_text: spanText,
          explanation: `STALE STATISTIC: The certified statistic for "${fact.key}" (${valWithUnit}) expired on ${fact.valid_until}. Citing expired certifications may violate compliance guidelines until new certification is completed.`,
          source_id: fact.source_id || null,
          source_key: fact.source_key || "S-006",
          evidence_status: "verified",
          confidence: 0.98,
          suggestion: "recycled materials certified under current environmental charter",
        });
      }
    } else {
      // For active facts: check for contradictory numbers
      // E.g., if fact.key is "founded_year" and value is "2018", check for "founded in (year)" or "established in (year)"
      if (fact.key.toLowerCase().includes("founded") || fact.key.toLowerCase().includes("established")) {
        const yearRegex = /\b(?:founded|established|started)\s+(?:in\s+)?(\d{4})\b/gi;
        let match: RegExpExecArray | null;
        while ((match = yearRegex.exec(draftText)) !== null) {
          const yearFound = match[1];
          if (yearFound !== fact.value) {
            findings.push({
              lane: "rule",
              category: "fact",
              severity: "major",
              span_start: match.index,
              span_end: match.index + match[0].length,
              span_text: match[0],
              explanation: `Fact mismatch: Official brand records certify founding year as ${fact.value}, but text cites ${yearFound}.`,
              source_id: fact.source_id || null,
              source_key: fact.source_key || null,
              evidence_status: "verified",
              confidence: 0.95,
              suggestion: `founded in ${fact.value}`,
            });
          }
        }
      }

      // If fact.key is "warranty", check for conflicting warranty durations (e.g. 10-Year vs 25-Year)
      if (fact.key.toLowerCase().includes("warranty") && fact.value) {
        const warrantyRegex = /\b(\d+)[-\s]year\s+(?:warranty|gear\s+promise)\b/gi;
        let match: RegExpExecArray | null;
        while ((match = warrantyRegex.exec(draftText)) !== null) {
          const duration = match[1];
          if (duration !== fact.value) {
            findings.push({
              lane: "rule",
              category: "fact",
              severity: "major",
              span_start: match.index,
              span_end: match.index + match[0].length,
              span_text: match[0],
              explanation: `Fact mismatch: Official warranty duration is ${fact.value} years, but text cites ${duration} years.`,
              source_id: fact.source_id || null,
              source_key: fact.source_key || null,
              evidence_status: "verified",
              confidence: 0.95,
              suggestion: `${fact.value}-Year Gear Promise`,
            });
          }
        }
      }
    }
  }

  return findings;
}
