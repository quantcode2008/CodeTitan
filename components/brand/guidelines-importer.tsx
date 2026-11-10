"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceRole } from "@/lib/auth/types";
import { BrandSourceType } from "@/lib/database.types";
import {
  splitMarkdownByHeadings,
  ParsedHeadingSection,
} from "@/lib/brand/heading-splitter";
import { batchImportSourcesAction } from "@/lib/actions/brand";
import {
  UploadCloud,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
  Sparkles,
  Lock,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface GuidelinesImporterProps {
  workspaceId: string;
  currentRole: WorkspaceRole;
  nextAvailableKeyNumber: number; // e.g. 13 for S-013
}

interface EditableSection extends ParsedHeadingSection {
  id: string;
  tagsString: string;
  excluded: boolean;
}

const SAMPLE_MARKDOWN = `# Aster & Pine Brand Operating Guidelines

## Mission & Brand Purpose
Aster & Pine engineers heirloom-grade timepieces with traceable Nordic titanium and zero-carbon mechanical calibers. Our purpose is to stand against disposable luxury and build objects that outlast their owners.

## Prohibited Lexicon & Buzzwords
Never use the phrase "eco-friendly" or "green alternative". These phrases constitute vague corporate jargon. Use instead "certified carbon-neutral" or "zero-landfill manufactured". Never refer to our timepieces as "cheap", "discount", or "entry-level".

## Certified Claims Policy
Every claim regarding water resistance must explicitly reference ISO 22810 laboratory testing. We never make unsubstantiated assertions of being "the world's most durable". If claiming titanium purity, specify Grade 5 aerospace alloy.

## Tone of Voice & Copywriting
Our voice is quiet, resolute, and understated. We avoid exclamation points, hyperbolic superlatives, and breathless marketing claims. Write with the cadence of an experienced watchmaker: deliberate, patient, and factual.

## Certified Brand Facts
Aster & Pine was founded in Stockholm in 2018. All mechanical calibers feature a 72-hour power reserve. Every timepiece is individually certified to -2/+4 seconds per day precision standard.
`;

export function GuidelinesImporter({
  workspaceId,
  currentRole,
  nextAvailableKeyNumber,
}: GuidelinesImporterProps) {
  const router = useRouter();
  const isAdmin = currentRole === "admin";

  const [activeTab, setActiveTab] = React.useState<"paste" | "upload">("paste");
  const [rawText, setRawText] = React.useState("");
  const [sections, setSections] = React.useState<EditableSection[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [importedResult, setImportedResult] = React.useState<{
    count: number;
    keys: string[];
  } | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleParse(textToParse: string) {
    if (!textToParse.trim()) {
      setErrorMsg("Please enter or upload markdown guideline text.");
      return;
    }
    setErrorMsg(null);
    const parsed = splitMarkdownByHeadings(textToParse);
    if (parsed.length === 0) {
      setErrorMsg("No sections could be extracted. Ensure the text contains headings (# or ##) or text content.");
      return;
    }

    const initialSections: EditableSection[] = parsed.map((p, index) => ({
      ...p,
      id: `sec-${Date.now()}-${index}`,
      tagsString: p.suggestedTags.join(", "),
      excluded: false,
    }));

    setSections(initialSections);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content);
      handleParse(content);
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file. Please ensure it is a valid UTF-8 text or markdown file.");
    };
    reader.readAsText(file);
  }

  function handleLoadSample() {
    setRawText(SAMPLE_MARKDOWN);
    handleParse(SAMPLE_MARKDOWN);
  }

  function updateSection(id: string, updates: Partial<EditableSection>) {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function addEmptySection() {
    const newSection: EditableSection = {
      id: `sec-${Date.now()}-${sections.length}`,
      title: "New Brand Policy",
      body: "",
      type: "guideline",
      suggestedTags: ["guideline"],
      headingLevel: 2,
      tagsString: "guideline",
      excluded: false,
    };
    setSections((prev) => [...prev, newSection]);
  }

  const activeSections = sections.filter((s) => !s.excluded);

  async function handleConfirmImport() {
    if (!isAdmin) return;
    if (activeSections.length === 0) {
      setErrorMsg("No sections selected for import.");
      return;
    }

    setErrorMsg(null);

    const payload = {
      sources: activeSections.map((s) => ({
        type: s.type,
        title: s.title.trim(),
        body: s.body.trim(),
        tags: s.tagsString
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      })),
    };

    startTransition(async () => {
      const res = await batchImportSourcesAction(workspaceId, payload);
      if (!res.success) {
        setErrorMsg(res.error || "Batch import failed.");
      } else {
        setImportedResult(res.data || { count: activeSections.length, keys: [] });
      }
    });
  }

  if (importedResult) {
    return (
      <div className="bg-paper-raised border border-rule p-8 rounded-sm text-center max-w-xl mx-auto space-y-5">
        <div className="w-12 h-12 bg-moss/10 text-moss rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-serif text-2xl font-medium text-ink">
            Import Completed Successfully
          </h2>
          <p className="font-sans text-xs text-ink-soft mt-1">
            Created {importedResult.count} new immutable brand sources with initial version snapshots and full audit trail.
          </p>
        </div>

        {importedResult.keys.length > 0 && (
          <div className="p-3 bg-paper border border-rule rounded-sm font-mono text-xs text-ink-soft flex flex-wrap justify-center gap-1.5">
            {importedResult.keys.map((k) => (
              <span key={k} className="px-1.5 py-0.5 bg-paper-raised border border-rule text-ink font-semibold">
                {k}
              </span>
            ))}
          </div>
        )}

        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/brand/sources"
            className="inline-flex items-center justify-center font-sans text-xs font-medium bg-accent hover:bg-accent/90 text-paper h-8 px-4 rounded-sm transition-colors"
          >
            View All Brand Sources <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setImportedResult(null);
              setSections([]);
              setRawText("");
            }}
            className="border-rule text-ink font-sans text-xs"
          >
            Import Another Document
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Role Notice */}
      {!isAdmin && (
        <div className="p-4 bg-ochre/10 border border-ochre/30 text-ink text-xs rounded-sm flex items-start gap-3">
          <Lock className="w-4 h-4 text-ochre shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">Read-Only Workspace Access:</span> You can test the heading splitter and preview guideline parsing, but only workspace administrators can commit brand sources to the knowledge base.
          </div>
        </div>
      )}

      {/* Input Stage */}
      <div className="bg-paper-raised border border-rule p-6 rounded-sm space-y-4">
        <div className="flex items-center justify-between border-b border-rule pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
                activeTab === "paste"
                  ? "bg-ink text-paper font-medium"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Paste Markdown Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
                activeTab === "upload"
                  ? "bg-ink text-paper font-medium"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              Upload .md / .txt File
            </button>
          </div>

          <Button
            type="button"
            variant="quiet"
            size="sm"
            onClick={handleLoadSample}
            className="text-accent hover:text-accent hover:bg-accent/5 font-sans text-xs h-7"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Load Sample Guidelines
          </Button>
        </div>

        {activeTab === "paste" ? (
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="# Brand Guidelines&#10;&#10;## Brand Purpose&#10;Paste your existing markdown brand documentation here. Headings will be automatically split into individual brand policies..."
              rows={9}
              className="w-full p-3 font-mono text-xs bg-paper border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
            />
          </div>
        ) : (
          <div className="border border-dashed border-rule p-8 rounded-sm text-center bg-paper/50 hover:bg-paper transition-colors">
            <UploadCloud className="w-8 h-8 text-ink-soft mx-auto mb-2" />
            <p className="font-sans text-xs text-ink font-medium">
              Select a markdown (.md) or text (.txt) guideline file
            </p>
            <p className="font-sans text-[11px] text-ink-soft mt-0.5 mb-4">
              Files are processed locally and split into sections by heading
            </p>
            <input
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              onChange={handleFileUpload}
              className="text-xs font-sans text-ink-soft file:mr-4 file:py-1 file:px-3 file:rounded-sm file:border file:border-rule file:text-xs file:font-sans file:bg-paper-raised hover:file:bg-paper cursor-pointer"
            />
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-oxblood/10 border border-oxblood/30 text-oxblood text-xs rounded-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <span className="font-sans text-xs text-ink-soft">
            {sections.length > 0
              ? `${sections.length} sections parsed`
              : "Ready to parse document structure"}
          </span>
          <Button
            type="button"
            onClick={() => handleParse(rawText)}
            disabled={!rawText.trim()}
            className="bg-accent hover:bg-accent/90 text-paper font-sans text-xs h-8"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Split Document by Headings
          </Button>
        </div>
      </div>

      {/* Preview & Edit Stage */}
      {sections.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-medium text-ink">
                Parsed Sections Preview
              </h2>
              <p className="font-sans text-xs text-ink-soft">
                Review, classify, and edit each section before committing. Keys will be assigned sequentially starting at{" "}
                <span className="font-mono text-ink font-semibold">
                  S-{String(nextAvailableKeyNumber).padStart(3, "0")}
                </span>
                .
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addEmptySection}
                className="border-rule text-ink font-sans text-xs h-8"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Section
              </Button>
              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={!isAdmin || isPending || activeSections.length === 0}
                className="bg-accent hover:bg-accent/90 text-paper font-sans text-xs h-8"
              >
                {isPending ? (
                  "Importing..."
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 mr-1.5" /> Confirm &amp; Import{" "}
                    {activeSections.length} Sources
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {sections.map((section, idx) => {
              const allocatedKeyNum = nextAvailableKeyNumber + idx;
              const previewKey = `S-${String(allocatedKeyNum).padStart(3, "0")}`;

              return (
                <div
                  key={section.id}
                  className={`bg-paper-raised border transition-all rounded-sm p-4 space-y-3 ${
                    section.excluded
                      ? "opacity-50 border-rule/50 bg-paper/40"
                      : "border-rule hover:border-ink-soft/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 bg-paper border border-rule text-accent font-semibold rounded-sm">
                        [{previewKey}]
                      </span>
                      <span className="font-mono text-[11px] text-ink-soft">
                        Level {section.headingLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        onClick={() =>
                          updateSection(section.id, { excluded: !section.excluded })
                        }
                        className="text-xs font-sans h-7 text-ink-soft hover:text-ink"
                      >
                        {section.excluded ? "Restore" : "Skip"}
                      </Button>
                      <Button
                        type="button"
                        variant="quiet"
                        size="sm"
                        onClick={() => removeSection(section.id)}
                        className="text-xs font-sans h-7 text-oxblood hover:bg-oxblood/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block font-sans text-[11px] font-medium text-ink-soft uppercase tracking-wider mb-1">
                        Source Title
                      </label>
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          updateSection(section.id, { title: e.target.value })
                        }
                        disabled={section.excluded}
                        className="bg-paper border-rule font-serif text-sm h-8"
                      />
                    </div>

                    <div>
                      <label className="block font-sans text-[11px] font-medium text-ink-soft uppercase tracking-wider mb-1">
                        Category Classification
                      </label>
                      <select
                        value={section.type}
                        onChange={(e) =>
                          updateSection(section.id, {
                            type: e.target.value as BrandSourceType,
                          })
                        }
                        disabled={section.excluded}
                        className="w-full h-8 px-2.5 font-sans text-xs bg-paper border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="guideline">General Guideline</option>
                        <option value="fact">Brand Fact</option>
                        <option value="claim_policy">Claim Policy</option>
                        <option value="terminology">Terminology</option>
                        <option value="tone_example">Tone Example</option>
                        <option value="asset_rule">Asset Rule</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-sans text-[11px] font-medium text-ink-soft uppercase tracking-wider mb-1">
                      Guideline Body / Authority Text
                    </label>
                    <textarea
                      value={section.body}
                      onChange={(e) =>
                        updateSection(section.id, { body: e.target.value })
                      }
                      disabled={section.excluded}
                      rows={3}
                      className="w-full p-2.5 font-serif text-xs bg-paper border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block font-sans text-[11px] font-medium text-ink-soft uppercase tracking-wider mb-1">
                      Tags (Comma-separated)
                    </label>
                    <Input
                      value={section.tagsString}
                      onChange={(e) =>
                        updateSection(section.id, { tagsString: e.target.value })
                      }
                      disabled={section.excluded}
                      placeholder="claims, legal, warranty"
                      className="bg-paper border-rule font-mono text-xs h-7"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={!isAdmin || isPending || activeSections.length === 0}
              className="bg-accent hover:bg-accent/90 text-paper font-sans text-xs h-9 px-6"
            >
              {isPending ? (
                "Importing Sources..."
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-1.5" /> Confirm &amp; Import All{" "}
                  {activeSections.length} Brand Sources
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
