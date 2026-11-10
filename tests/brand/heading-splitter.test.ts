import { describe, it, expect } from "vitest";
import {
  splitMarkdownByHeadings,
  inferSourceType,
  extractSuggestedTags,
} from "@/lib/brand/heading-splitter";

describe("Brand Guidelines Heading Splitter", () => {
  it("1. Splits a markdown document with multiple H2 headings into discrete sources", () => {
    const markdown = `
# Aster & Pine Brand Operating Guidelines

Introductory text about our editorial mission.

## Tone of Voice & Character
Aster & Pine speaks with the quiet confidence of a seasoned trail guide. Warm, plainspoken, and respectful of the wild.

## Product Nomenclature Lexicon
Official gear line names must be capitalized exactly: RidgeLine Series, TrailLite Alpine.

## Global Claims Policy
Absolute superlatives such as "#1", "world's best", or "guaranteed for eternity" are strictly prohibited unless certified.
    `;

    const sections = splitMarkdownByHeadings(markdown);

    expect(sections.length).toBe(4);

    // First section with H1 title
    expect(sections[0].title).toBe("Aster & Pine Brand Operating Guidelines");
    expect(sections[0].body).toContain("Introductory text about our editorial mission");

    // Section 1
    expect(sections[1].title).toBe("Tone of Voice & Character");
    expect(sections[1].type).toBe("tone_example");
    expect(sections[1].body).toContain("quiet confidence of a seasoned trail guide");

    // Section 2
    expect(sections[2].title).toBe("Product Nomenclature Lexicon");
    expect(sections[2].type).toBe("terminology");
    expect(sections[2].body).toContain("RidgeLine Series");

    // Section 3
    expect(sections[3].title).toBe("Global Claims Policy");
    expect(sections[3].type).toBe("claim_policy");
    expect(sections[3].body).toContain("guaranteed for eternity");
  });

  it("2. Cleans up heading prefixes (numbers, section signs, bolding)", () => {
    const markdown = `
## §1. Prohibited Terminology Dictionary
Never use "cheap" or "miracle fabric" in customer communications.

### 2) Environmental Claims & FTC Green Guide Standards
Recycled textile percentages must be backed by current GRS certificates.
    `;

    const sections = splitMarkdownByHeadings(markdown);
    expect(sections.length).toBe(2);
    expect(sections[0].title).toBe("Prohibited Terminology Dictionary");
    expect(sections[1].title).toBe("Environmental Claims & FTC Green Guide Standards");
  });

  it("3. Handles documents without headings by treating entire body as single source", () => {
    const rawText = "Always use high-resolution photography with rich alternative text explaining gear utility.";
    const sections = splitMarkdownByHeadings(rawText);

    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe("Imported Brand Guidelines");
    expect(sections[0].body).toBe(rawText);
    expect(sections[0].type).toBe("asset_rule"); // detected from photography/alt-text
  });

  it("4. Correctly infers types from semantic keywords", () => {
    expect(inferSourceType("Logo Clear-Space and Asset Badging", "Provide 50% margin around mark.")).toBe("asset_rule");
    expect(inferSourceType("Warranty Claim Disclaimers", "Must state 25-year promise covers defects.")).toBe("claim_policy");
    expect(inferSourceType("Certified Brand Fact Sheet 2026", "Founded in Bend, Oregon in 2014.")).toBe("fact");
    expect(inferSourceType("Prohibited Vocabulary", "Banned terms list.")).toBe("terminology");
    expect(inferSourceType("Copywriting Voice Guide", "Tone must be calm.")).toBe("tone_example");
    expect(inferSourceType("General Operational Guidelines", "Review every quarter.")).toBe("guideline");
  });

  it("5. Suggests relevant tags from title and body content", () => {
    const tags = extractSuggestedTags("Environmental Claims Policy", "Covers recycled textile certification and FTC green rules.");
    expect(tags).toContain("claims");
    expect(tags).toContain("environmental");
  });

  it("6. Handles empty input gracefully", () => {
    expect(splitMarkdownByHeadings("")).toEqual([]);
    expect(splitMarkdownByHeadings("   \n\n  ")).toEqual([]);
  });
});
