import { RuleFinding, RetrievedContext } from "../types";
import { SeverityLevel } from "@/lib/database.types";

export interface ClaimPatternDefinition {
  regex: RegExp;
  label: string;
  defaultSeverity: SeverityLevel;
  explanation: string;
  defaultSourceKey?: string;
  defaultSuggestion?: string;
}

const CLAIM_PATTERNS: ClaimPatternDefinition[] = [
  {
    regex: /\bundisputed\s+#1\b|#1\s+expedition\s+pack\b|#\s*1\b|\bnumber\s+one\b/i,
    label: "Superlative #1 Claim",
    defaultSeverity: "critical",
    explanation:
      'Absolute ranking claim of being "#1" violates Claims Policy §3. Unsubstantiated superlatives require third-party laboratory certification.',
    defaultSourceKey: "S-003",
    defaultSuggestion: "purpose-built expedition pack certified to rigorous standards",
  },
  {
    regex: /\bguaranteed\s+for\s+(?:eternity|forever|life)\b|\bguaranteed\b/i,
    label: "Absolute Guarantee",
    defaultSeverity: "major",
    explanation:
      'Absolute claims of being "guaranteed" require citing approved warranty terms and laboratory testing.',
    defaultSourceKey: "S-003",
    defaultSuggestion: "backed by our 25-Year Gear Promise",
  },
  {
    regex: /\bworld'?s\s+best\b|\bunbeatable\b|\bindestructible\b|\bnever\s+fails\b/i,
    label: "Unsubstantiated Absolute",
    defaultSeverity: "major",
    explanation:
      "Absolute superlatives such as 'world's best', 'unbeatable', or 'never fails' are prohibited unless certified by third-party testing.",
    defaultSourceKey: "S-003",
    defaultSuggestion: "field-tested for extreme alpine durability",
  },
  {
    regex: /\bdefies\s+gravity\b|\bmiracle\b|\brevolutionary\b/i,
    label: "Exaggerated Hype Superlative",
    defaultSeverity: "major",
    explanation:
      "Exaggerated or hyperbolic promotional statements violate calm, plainspoken brand guidelines.",
    defaultSourceKey: "S-003",
    defaultSuggestion: "engineered for severe weather resistance",
  },
  {
    regex: /\b100%\b|\bdouble\s+your\b|\bproven\b/i,
    label: "Unverified Empirical Claim",
    defaultSeverity: "major",
    explanation:
      "Empirical percentage and proof claims require documented laboratory certification and published test methodology.",
    defaultSourceKey: "S-003",
    defaultSuggestion: "rigorously tested under laboratory conditions",
  },
];

/**
 * 4c. Promotional Claim Patterns Rule.
 * Scans for superlatives and absolute claims ("#1", "best", "guaranteed", "100%", "proven").
 * Sets evidence_status: 'unverified' unless an approved claim source authorizes the exact claim.
 */
export function scanClaimsRule(
  draftText: string,
  sources?: RetrievedContext[]
): RuleFinding[] {
  if (!draftText) return [];

  const findings: RuleFinding[] = [];

  // Find claims policy source if available
  const claimsPolicySource = sources?.find(
    (s) => s.type === "claim_policy" || s.source_key === "S-003" || s.title.toLowerCase().includes("claim")
  );

  const policySourceId = claimsPolicySource?.source_id || null;
  const policySourceKey = claimsPolicySource?.source_key || "S-003";

  for (const pattern of CLAIM_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, "gi");
    let match: RegExpExecArray | null;

    while ((match = regex.exec(draftText)) !== null) {
      const spanText = match[0];
      const spanStart = match.index;
      const spanEnd = spanStart + spanText.length;

      // Check if an approved source explicitly authorizes this exact statement
      const isApprovedInSources = Boolean(
        sources?.some((s) =>
          s.excerpt.toLowerCase().includes(spanText.toLowerCase()) &&
          (s.type === "claim_policy" || s.type === "fact" || s.type === "guideline")
        )
      );

      const isCritical = pattern.defaultSeverity === "critical";

      findings.push({
        lane: "rule",
        category: "claim",
        severity: pattern.defaultSeverity,
        span_start: spanStart,
        span_end: spanEnd,
        span_text: spanText,
        explanation: pattern.explanation,
        source_id: policySourceId,
        source_key: policySourceKey,
        evidence_status: isApprovedInSources ? "verified" : "unverified",
        confidence: 0.95,
        suggestion: pattern.defaultSuggestion || null,
        requires_designated_reviewer: isCritical,
      });
    }
  }

  return findings;
}

