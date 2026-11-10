import { SeverityLevel } from "@/lib/llm/schema";

export interface DeterministicFinding {
  id?: string;
  lane: "rule";
  category: "terminology" | "claim" | "fact" | "messaging" | "other";
  severity: SeverityLevel;
  span_start: number;
  span_end: number;
  span_text: string;
  explanation: string;
  source_id?: string | null;
  source_key: string | null;
  evidence_status: "verified";
  confidence: number;
  suggestion: string | null;
  status: "open";
  needs_human_judgement: boolean;
}

export interface RuleTerm {
  id?: string;
  term: string;
  kind: "prohibited" | "preferred" | "required_phrase";
  replacement?: string | null;
  severity: SeverityLevel;
  source_id?: string | null;
  source_key?: string | null;
  notes?: string | null;
}

export interface RuleFact {
  id?: string;
  key: string;
  value: string;
  unit?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  source_id?: string | null;
  source_key?: string | null;
}

/**
 * Escapes string characters for use in regular expressions.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Deterministic Governance Engine (Lane 1).
 * 
 * Auditable, exact, zero-hallucination rule scanner.
 * Scans for:
 * 1. Prohibited terms and unapproved superlatives (e.g. "cheap", "revolutionary", "miracle fabric")
 * 2. Stale statistics and expired certified facts (e.g. recycling certificates expired in 2024)
 * 3. Mandatory required phrases & disclaimers (e.g. warranty defects disclaimer)
 */
export class DeterministicEngine {
  /**
   * Scans document text against registered terminology rules.
   */
  public scanTerminology(
    text: string,
    terms: RuleTerm[]
  ): DeterministicFinding[] {
    const findings: DeterministicFinding[] = [];

    for (const rule of terms) {
      if (rule.kind === "prohibited") {
        // Match whole word/phrase boundaries, case-insensitively
        const regex = new RegExp(`\\b${escapeRegex(rule.term)}\\b`, "gi");
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
          findings.push({
            lane: "rule",
            category: "terminology",
            severity: rule.severity,
            span_start: match.index,
            span_end: match.index + match[0].length,
            span_text: match[0],
            explanation:
              rule.notes ||
              `The term "${rule.term}" is prohibited under brand governance policy.`,
            source_id: rule.source_id || null,
            source_key: rule.source_key || "S-008",
            evidence_status: "verified",
            confidence: 1.0,
            suggestion: rule.replacement || null,
            status: "open",
            needs_human_judgement: false,
          });
        }
      }
    }

    return findings;
  }

  /**
   * Scans text for certified facts and checks for expired/stale statistics.
   */
  public scanFacts(
    text: string,
    facts: RuleFact[],
    currentDate: Date = new Date()
  ): DeterministicFinding[] {
    const findings: DeterministicFinding[] = [];

    for (const fact of facts) {
      if (!fact.valid_until) continue;

      const expiration = new Date(fact.valid_until);
      const isExpired = expiration < currentDate;

      if (isExpired) {
        // Construct search patterns: prioritize unit-bearing pattern (e.g. "78%") before bare number
        const patterns = [
          fact.unit === "percent" ? `\\b${escapeRegex(fact.value)}%` : null,
          fact.unit === "percent" ? `\\b${escapeRegex(fact.value)}\\s*percent\\b` : null,
          `\\b${escapeRegex(fact.value)}\\b`,
        ].filter(Boolean) as string[];

        const matchedSpans = new Set<string>();

        for (const pat of patterns) {
          const regex = new RegExp(pat, "gi");
          let match: RegExpExecArray | null;

          while ((match = regex.exec(text)) !== null) {
            const spanKey = `${match.index}-${match.index + match[0].length}`;
            // If already matched by a longer specific pattern (e.g. "78%"), skip shorter overlap
            const overlapsExisting = Array.from(matchedSpans).some((key) => {
              const [s, e] = key.split("-").map(Number);
              return match!.index >= s && match!.index + match![0].length <= e;
            });

            if (!overlapsExisting) {
              matchedSpans.add(spanKey);
              findings.push({
                lane: "rule",
                category: "fact",
                severity: "major",
                span_start: match.index,
                span_end: match.index + match[0].length,
                span_text: match[0],
                explanation: `STALE STATISTIC: Metric "${fact.key}" (${fact.value}${fact.unit ? " " + fact.unit : ""}) expired on ${fact.valid_until}. Citing expired certifications is prohibited under regulatory compliance guidelines.`,
                source_id: fact.source_id || null,
                source_key: fact.source_key || "S-006",
                evidence_status: "verified",
                confidence: 0.98,
                suggestion: "current certified metric pending recertification audit",
                status: "open",
                needs_human_judgement: false,
              });
            }
          }
        }
      }
    }

    return findings;
  }

  /**
   * Verifies required disclaimers.
   * If the draft makes warranty or guarantee claims, ensures the mandatory disclaimer is present.
   */
  public scanRequiredDisclaimers(
    text: string,
    requiredTerms: RuleTerm[]
  ): DeterministicFinding[] {
    const findings: DeterministicFinding[] = [];

    // Check if draft references warranty or lifetime promise
    const warrantyTriggers = /\b(warranty|guarantee|25-year|promise|lifetime)\b/i;
    const hasWarrantyMention = warrantyTriggers.test(text);

    if (hasWarrantyMention) {
      for (const req of requiredTerms.filter((t) => t.kind === "required_phrase")) {
        const containsRequired = text
          .toLowerCase()
          .includes(req.term.toLowerCase());

        if (!containsRequired) {
          // Find first trigger position for span anchor
          const match = warrantyTriggers.exec(text);
          const startIndex = match ? match.index : 0;
          const endIndex = match ? startIndex + match[0].length : 0;

          findings.push({
            lane: "rule",
            category: "claim",
            severity: req.severity || "critical",
            span_start: startIndex,
            span_end: endIndex,
            span_text: match ? match[0] : "warranty",
            explanation: `Missing mandatory disclaimer: Promotional warranty references must explicitly state: "${req.term}".`,
            source_id: req.source_id || null,
            source_key: req.source_key || "S-004",
            evidence_status: "verified",
            confidence: 1.0,
            suggestion: `${match ? match[0] : "Warranty"} (${req.term})`,
            status: "open",
            needs_human_judgement: false,
          });
        }
      }
    }

    return findings;
  }

  /**
   * Executes complete Lane 1 deterministic scan.
   */
  public scan(params: {
    text: string;
    terms: RuleTerm[];
    facts?: RuleFact[];
    referenceDate?: Date;
  }): DeterministicFinding[] {
    const termFindings = this.scanTerminology(params.text, params.terms);
    const factFindings = params.facts
      ? this.scanFacts(params.text, params.facts, params.referenceDate)
      : [];
    const disclaimerFindings = this.scanRequiredDisclaimers(
      params.text,
      params.terms
    );

    return [...termFindings, ...factFindings, ...disclaimerFindings].sort(
      (a, b) => a.span_start - b.span_start
    );
  }
}
