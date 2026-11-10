import { BrandSourceType } from "@/lib/database.types";

export interface ParsedHeadingSection {
  title: string;
  body: string;
  type: BrandSourceType;
  suggestedTags: string[];
  headingLevel: number;
}

/**
 * Detects the most appropriate brand source category based on keyword semantics.
 */
export function inferSourceType(title: string, body: string): BrandSourceType {
  const combined = `${title} ${body}`.toLowerCase();

  if (
    combined.includes("claim") ||
    combined.includes("superlative") ||
    combined.includes("guarantee") ||
    combined.includes("ftc") ||
    combined.includes("certification") ||
    combined.includes("laboratory") ||
    combined.includes("comparison")
  ) {
    return "claim_policy";
  }

  if (
    combined.includes("prohibited") ||
    combined.includes("terminology") ||
    combined.includes("lexicon") ||
    combined.includes("vocabulary") ||
    combined.includes("banned term") ||
    combined.includes("naming") ||
    combined.includes("nomenclature")
  ) {
    return "terminology";
  }

  if (
    combined.includes("tone") ||
    combined.includes("voice") ||
    combined.includes("character") ||
    combined.includes("personality") ||
    combined.includes("copywriting style")
  ) {
    return "tone_example";
  }

  if (
    combined.includes("fact") ||
    combined.includes("founded") ||
    combined.includes("statistic") ||
    combined.includes("metric") ||
    combined.includes("headquarters")
  ) {
    return "fact";
  }

  if (
    combined.includes("logo") ||
    combined.includes("asset") ||
    combined.includes("imagery") ||
    combined.includes("photo") ||
    combined.includes("alt-text") ||
    combined.includes("clear-space") ||
    combined.includes("badge")
  ) {
    return "asset_rule";
  }

  return "guideline";
}

/**
 * Extracts relevant tags from heading title and body.
 */
export function extractSuggestedTags(title: string, body: string): string[] {
  const tags = new Set<string>();
  const combined = `${title} ${body}`.toLowerCase();

  const candidates = [
    "claims",
    "legal",
    "compliance",
    "superlatives",
    "terminology",
    "prohibited",
    "preferred",
    "voice",
    "tone",
    "editorial",
    "facts",
    "sustainability",
    "environmental",
    "warranty",
    "disclaimer",
    "pricing",
    "social",
    "imagery",
    "accessibility",
    "logo",
    "assets",
  ];

  for (const candidate of candidates) {
    if (combined.includes(candidate)) {
      tags.add(candidate);
    }
  }

  // Always at least one tag
  if (tags.size === 0) {
    tags.add("guideline");
  }

  return Array.from(tags).slice(0, 5);
}

/**
 * Splits raw markdown or plain text guidelines by headings (#, ##, ###, ####).
 * Trims extraneous whitespace and clean heading titles.
 */
export function splitMarkdownByHeadings(
  markdownText: string,
  defaultType?: BrandSourceType
): ParsedHeadingSection[] {
  if (!markdownText || !markdownText.trim()) {
    return [];
  }

  const lines = markdownText.split(/\r?\n/);
  const sections: ParsedHeadingSection[] = [];

  let currentTitle: string | null = null;
  let currentLevel = 1;
  let currentBodyLines: string[] = [];
  let introLines: string[] = [];

  const headingRegex = /^(#{1,6})\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(headingRegex);

    if (match) {
      // If we already had an active section, finalize it
      if (currentTitle) {
        const body = currentBodyLines.join("\n").trim();
        if (body || currentTitle) {
          sections.push({
            title: currentTitle,
            body: body || "Refer to brand guidelines.",
            type: defaultType || inferSourceType(currentTitle, body),
            suggestedTags: extractSuggestedTags(currentTitle, body),
            headingLevel: currentLevel,
          });
        }
      } else if (introLines.length > 0) {
        // Text existed before the first heading
        const introBody = introLines.join("\n").trim();
        if (introBody) {
          sections.push({
            title: "Brand Governance Overview & Preamble",
            body: introBody,
            type: defaultType || "guideline",
            suggestedTags: ["overview", "guideline"],
            headingLevel: 1,
          });
        }
      }

      // Start new section
      currentLevel = match[1].length;
      // Clean up title (remove numbering like "1. ", "§3. ", leading/trailing markdown)
      currentTitle = match[2]
        .replace(/^(\d+\.|\d+\)|\§\d+\.?)\s*/, "")
        .replace(/\*\*/g, "")
        .trim();
      currentBodyLines = [];
    } else {
      if (currentTitle) {
        currentBodyLines.push(line);
      } else {
        introLines.push(line);
      }
    }
  }

  // Finalize last section
  if (currentTitle) {
    const body = currentBodyLines.join("\n").trim();
    sections.push({
      title: currentTitle,
      body: body || "Refer to brand guidelines.",
      type: defaultType || inferSourceType(currentTitle, body),
      suggestedTags: extractSuggestedTags(currentTitle, body),
      headingLevel: currentLevel,
    });
  } else if (introLines.length > 0 && sections.length === 0) {
    // No headings at all in document; treat entire document as single source
    const body = introLines.join("\n").trim();
    if (body) {
      sections.push({
        title: "Imported Brand Guidelines",
        body,
        type: defaultType || inferSourceType("Imported Brand Guidelines", body),
        suggestedTags: extractSuggestedTags("Imported Brand Guidelines", body),
        headingLevel: 1,
      });
    }
  }

  return sections.filter((s) => s.title.trim().length > 0);
}

