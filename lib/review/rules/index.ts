import { RuleFinding, RetrievedContext } from "../types";
import { scanTermsRule, TermRuleDefinition } from "./terms";
import { scanDisclaimersRule, DisclaimerRuleDefinition } from "./disclaimers";
import { scanClaimsRule } from "./claims";
import { scanFactsRule, FactRuleDefinition } from "./facts";
import { scanAccessibilityRule } from "./accessibility";

export interface RuleLaneParams {
  draftText: string;
  terms?: TermRuleDefinition[];
  facts?: FactRuleDefinition[];
  disclaimers?: DisclaimerRuleDefinition[];
  sources?: RetrievedContext[];
  referenceDate?: Date;
}

/**
 * Executes all deterministic rule lane scanners (4a - 4e).
 * Strictly verifies span integrity: asserts text.slice(span_start, span_end) === span_text.
 */
export function runRuleLane(params: RuleLaneParams): RuleFinding[] {
  const {
    draftText,
    terms = [],
    facts = [],
    disclaimers,
    sources = [],
    referenceDate = new Date(),
  } = params;

  if (!draftText || !draftText.trim()) {
    return [];
  }

  const allFindings: RuleFinding[] = [
    // 4a. Prohibited / Preferred Terms
    ...scanTermsRule(draftText, terms),

    // 4b. Required Disclaimers
    ...scanDisclaimersRule(draftText, disclaimers),

    // 4c. Promotional Claims & Superlatives
    ...scanClaimsRule(draftText, sources),

    // 4d. Fact Matching & Stale Statistics
    ...scanFactsRule(draftText, facts, referenceDate),

    // 4e. Accessibility Checks
    ...scanAccessibilityRule(draftText),
  ];

  // Strictly assert and verify exact span integrity for every finding
  const verifiedFindings: RuleFinding[] = [];

  for (const finding of allFindings) {
    const actualSlice = draftText.slice(finding.span_start, finding.span_end);

    if (actualSlice !== finding.span_text) {
      throw new Error(
        `Span integrity violation: Expected "${finding.span_text}" but slice was "${actualSlice}" at [${finding.span_start}, ${finding.span_end}]`
      );
    }

    // High-risk claim/fact checks trigger designated reviewer requirement
    const isHighRisk =
      (finding.category === "claim" || finding.category === "fact") &&
      finding.severity === "critical";

    verifiedFindings.push({
      ...finding,
      lane: "rule",
      requires_designated_reviewer: isHighRisk || Boolean(finding.requires_designated_reviewer),
    });
  }

  // Sort by document offset
  return verifiedFindings.sort((a, b) => a.span_start - b.span_start);
}
