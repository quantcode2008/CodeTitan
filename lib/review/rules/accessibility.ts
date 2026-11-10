import { RuleFinding } from "../types";

/**
 * 4e. Basic Accessibility Rules.
 * Checks for:
 * 1. Image references missing alt text (![]() or <img ...>)
 * 2. Runs of 4+ consecutive ALL-CAPS words
 * 3. Generic link anchor text like "click here", "read more"
 */
export function scanAccessibilityRule(draftText: string): RuleFinding[] {
  if (!draftText) return [];

  const findings: RuleFinding[] = [];

  // 1. Markdown image references missing alt text: ![](/path/to/img.png)
  const markdownImgRegex = /!\[\s*\]\([^\)]+\)/g;
  let match: RegExpExecArray | null;

  while ((match = markdownImgRegex.exec(draftText)) !== null) {
    const spanText = match[0];
    const spanStart = match.index;
    const spanEnd = spanStart + spanText.length;

    findings.push({
      lane: "rule",
      category: "accessibility",
      severity: "major",
      span_start: spanStart,
      span_end: spanEnd,
      span_text: spanText,
      explanation:
        "Image reference is missing alternative text (alt text). Brand accessibility standards require descriptive alt text for all visual assets.",
      source_id: null,
      source_key: "S-010", // Asset accessibility rule
      evidence_status: "verified",
      confidence: 1.0,
      suggestion: '![Descriptive description of the gear in use](/path)',
    });
  }

  // 2. HTML image tags missing alt or empty alt: <img src="..." />
  const htmlImgMissingAltRegex = /<img(?![^>]*\balt\s*=)[^>]*>|<img[^>]*\balt=["']\s*["'][^>]*>/gi;
  while ((match = htmlImgMissingAltRegex.exec(draftText)) !== null) {
    const spanText = match[0];
    const spanStart = match.index;
    const spanEnd = spanStart + spanText.length;

    findings.push({
      lane: "rule",
      category: "accessibility",
      severity: "major",
      span_start: spanStart,
      span_end: spanEnd,
      span_text: spanText,
      explanation:
        "HTML image element is missing an alt attribute. Provide meaningful alternative text for screen readers.",
      source_id: null,
      source_key: "S-010",
      evidence_status: "verified",
      confidence: 1.0,
      suggestion: '<img alt="Descriptive label" ... />',
    });
  }

  // 3. ALL-CAPS word runs (4 or more consecutive uppercase words)
  // E.g. "ORDER TODAY BEFORE SUPPLIES VANISH"
  const allCapsRegex = /\b[A-Z0-9]{2,}(?:\s+[A-Z0-9]{2,}){3,}\b/g;
  while ((match = allCapsRegex.exec(draftText)) !== null) {
    const spanText = match[0];
    const spanStart = match.index;
    const spanEnd = spanStart + spanText.length;

    // Convert to sentence case as suggestion
    const lower = spanText.toLowerCase();
    const sentenceCase = lower.charAt(0).toUpperCase() + lower.slice(1);

    findings.push({
      lane: "rule",
      category: "accessibility",
      severity: "minor",
      span_start: spanStart,
      span_end: spanEnd,
      span_text: spanText,
      explanation:
        "Consecutive ALL-CAPS words impair screen-reader pronunciation and reader accessibility. Use standard sentence capitalization.",
      source_id: null,
      source_key: "S-001",
      evidence_status: "verified",
      confidence: 0.95,
      suggestion: sentenceCase,
    });
  }

  // 4. Inaccessible link text like "[click here](...)" or "[read more](...)"
  const genericLinkRegex = /\[(?:click\s+here|read\s+more|here|link|learn\s+more)\]\([^\)]+\)/gi;
  while ((match = genericLinkRegex.exec(draftText)) !== null) {
    const spanText = match[0];
    const spanStart = match.index;
    const spanEnd = spanStart + spanText.length;

    findings.push({
      lane: "rule",
      category: "accessibility",
      severity: "minor",
      span_start: spanStart,
      span_end: spanEnd,
      span_text: spanText,
      explanation:
        "Generic link anchor text fails accessibility guidelines. Link labels must describe their specific destination or document.",
      source_id: null,
      source_key: null,
      evidence_status: "verified",
      confidence: 1.0,
      suggestion: "[View our expedition guide](url)",
    });
  }

  return findings;
}

