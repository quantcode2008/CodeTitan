import { RuleFinding } from "../types";
import { SeverityLevel } from "@/lib/database.types";

export interface DisclaimerRuleDefinition {
  triggerRegex?: RegExp;
  triggerKeywords?: string[];
  requiredPhrase: string;
  source_id?: string | null;
  source_key?: string | null;
  severity?: SeverityLevel;
  explanation?: string;
}

const DEFAULT_DISCLAIMER_RULES: DisclaimerRuleDefinition[] = [
  {
    triggerRegex: /\b(warranty|guaranteed|guarantee|25-year\s+gear\s+promise|gear\s+promise|lifetime\s+replacement)\b/i,
    requiredPhrase: "Covers manufacturer defects under normal trail usage.",
    source_key: "S-004",
    severity: "major",
    explanation:
      'Any promotional reference to the warranty or Gear Promise must explicitly include the approved disclaimer: "Covers manufacturer defects under normal trail usage."',
  },
];

/**
 * 4b. Required Disclaimers Rule.
 * If text contains a trigger (e.g. "warranty") and the mandated required phrase is absent,
 * produces a finding highlighting the trigger span.
 */
export function scanDisclaimersRule(
  draftText: string,
  customRules?: DisclaimerRuleDefinition[]
): RuleFinding[] {
  if (!draftText) return [];

  const findings: RuleFinding[] = [];
  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_DISCLAIMER_RULES;

  for (const rule of rules) {
    const regex = rule.triggerRegex || /\b(warranty|guarantee)\b/i;
    let match: RegExpExecArray | null;

    // Check if the required disclaimer phrase is already present anywhere in the text
    const hasRequiredPhrase = draftText
      .toLowerCase()
      .includes(rule.requiredPhrase.toLowerCase().trim());

    if (!hasRequiredPhrase) {
      // Find all trigger spans to highlight where the disclaimer is missing
      const triggerPattern = new RegExp(regex.source, "gi");
      while ((match = triggerPattern.exec(draftText)) !== null) {
        const spanText = match[0];
        const spanStart = match.index;
        const spanEnd = spanStart + spanText.length;

        findings.push({
          lane: "rule",
          category: "claim",
          severity: rule.severity || "major",
          span_start: spanStart,
          span_end: spanEnd,
          span_text: spanText,
          explanation:
            rule.explanation ||
            `Statements referencing "${spanText}" require the approved disclaimer: "${rule.requiredPhrase}"`,
          source_id: rule.source_id || null,
          source_key: rule.source_key || "S-004",
          evidence_status: "verified",
          confidence: 1.0,
          suggestion: `Include required disclaimer: "${rule.requiredPhrase}"`,
        });
      }
    }
  }

  return findings;
}

