"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentChannel, ContentType } from "@/lib/database.types";
import {
  createContentSubmissionAction,
  parseUploadedDocumentAction,
} from "@/lib/actions/content";
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";

export interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
}

export interface SubmissionSlipProps {
  workspaces: WorkspaceOption[];
  defaultWorkspaceId: string;
}

type SubmissionMode = "paste" | "upload";

const CHANNELS: Array<{ value: ContentChannel; label: string }> = [
  { value: "web", label: "Web / Product Page" },
  { value: "social", label: "Social Media" },
  { value: "email", label: "Email Newsletter" },
  { value: "press", label: "Press Release" },
  { value: "ad", label: "Paid Advertisement" },
  { value: "other", label: "Other Channel" },
];

const SAMPLE_COPY = {
  title: "SummitX Expedition Pack - Autumn Campaign Announcement",
  channel: "web" as ContentChannel,
  intendedMessage: "Introduce the 65L SummitX technical mountain expedition backpack with sustainable titanium frame.",
  campaignContext: "Fall 2026 Global Outdoor Campaign",
  draftText: "The all-new SummitX is the undisputed #1 expedition pack on the market guaranteed for eternity. Engineered with revolutionary miracle fabric that defies gravity and sub-zero squalls, this pack blows away competing packs. Order today before supplies vanish forever!",
};

export function SubmissionSlip({
  workspaces,
  defaultWorkspaceId,
}: SubmissionSlipProps) {
  const router = useRouter();

  // Form State
  const [workspaceId, setWorkspaceId] = React.useState(defaultWorkspaceId);
  const [title, setTitle] = React.useState("");
  const [channel, setChannel] = React.useState<ContentChannel>("web");
  const [contentType, setContentType] = React.useState<ContentType>("text");
  const [intendedMessage, setIntendedMessage] = React.useState("");
  const [campaignContext, setCampaignContext] = React.useState("");
  const [mode, setMode] = React.useState<SubmissionMode>("paste");

  // Draft copy & file
  const [draftText, setDraftText] = React.useState("");
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [uploadNote, setUploadNote] = React.useState<string | null>(null);

  // Status & Progress State
  const [isParsingDoc, setIsParsingDoc] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isPdfWarning, setIsPdfWarning] = React.useState(false);

  // Review Runner Streaming State
  const [isReviewRunning, setIsReviewRunning] = React.useState(false);
  const [activeStage, setActiveStage] = React.useState<string>("Initializing review...");
  const [completedStages, setCompletedStages] = React.useState<string[]>([]);
  const [reviewSuccessResult, setReviewSuccessResult] = React.useState<any | null>(null);

  // Word count calculation
  const wordCount = React.useMemo(() => {
    return draftText.trim() ? draftText.trim().split(/\s+/).length : 0;
  }, [draftText]);

  // Load sample draft for convenient evaluation
  function handleLoadSample() {
    setTitle(SAMPLE_COPY.title);
    setChannel(SAMPLE_COPY.channel);
    setIntendedMessage(SAMPLE_COPY.intendedMessage);
    setCampaignContext(SAMPLE_COPY.campaignContext);
    setDraftText(SAMPLE_COPY.draftText);
    setErrorMsg(null);
    setIsPdfWarning(false);
    setUploadNote(null);
  }

  // Handle document upload (.txt, .md, .docx)
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsPdfWarning(false);
    setUploadNote(null);

    // Immediate client check for PDF
    if (file.name.toLowerCase().endsWith(".pdf")) {
      setIsPdfWarning(true);
      setErrorMsg(
        "PDF extraction is not supported yet. Please upload a .txt, .md, or .docx file, or paste your draft text directly into the editor."
      );
      return;
    }

    setIsParsingDoc(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await parseUploadedDocumentAction(formData);
      if (!res.success) {
        if (res.isUnsupportedPdf) {
          setIsPdfWarning(true);
        }
        setErrorMsg(res.error || "Failed to extract text from document.");
      } else {
        setUploadedFile(file);
        setDraftText(res.text || "");
        setContentType("document");
        if (!title.trim()) {
          const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
          setTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }
        setUploadNote(
          `Extracted ${res.wordCount} words from "${file.name}" (${res.format?.toUpperCase()}). Review and edit below.`
        );
      }
    } catch (err: any) {
      setErrorMsg(`Upload failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsParsingDoc(false);
    }
  }

  // Handle Save / Submit
  async function handleSubmit(runImmediateReview: boolean) {
    if (!title.trim()) {
      setErrorMsg("Please provide a title for this submission.");
      return;
    }
    if (!intendedMessage.trim()) {
      setErrorMsg(
        "Please provide an intended message (one sentence explaining what this copy conveys)."
      );
      return;
    }
    if (!draftText.trim()) {
      setErrorMsg("Draft text cannot be empty. Paste your copy or upload a document.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("workspaceId", workspaceId);
    formData.append("title", title);
    formData.append("channel", channel);
    formData.append("contentType", contentType);
    formData.append("intendedMessage", intendedMessage);
    if (campaignContext) formData.append("campaignContext", campaignContext);
    formData.append("draftText", draftText);
    if (uploadedFile) {
      formData.append("originalFile", uploadedFile);
    }

    const res = await createContentSubmissionAction(formData);

    if (!res.success || !res.contentItemId || !res.revisionId) {
      setErrorMsg(res.error || "Failed to submit draft.");
      setIsSubmitting(false);
      return;
    }

    if (!runImmediateReview) {
      // Saved as draft; redirect to review list
      router.push("/reviews");
      return;
    }

    // Run review with genuine streaming progress
    setIsReviewRunning(true);
    setCompletedStages([]);
    setActiveStage("Starting review engine...");

    try {
      const streamRes = await fetch("/api/reviews/run/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId: res.contentItemId,
          revisionId: res.revisionId,
        }),
      });

      if (!streamRes.ok || !streamRes.body) {
        throw new Error(`Review execution error: HTTP ${streamRes.status}`);
      }

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              const eventData = JSON.parse(jsonStr);
              if (eventData.label) {
                setActiveStage(eventData.label);
                setCompletedStages((prev) =>
                  prev.includes(eventData.label) ? prev : [...prev, eventData.label]
                );
              }
              if (eventData.stage === "complete" && eventData.result) {
                setReviewSuccessResult(eventData.result);
              }
            }
          }
        }
      }

      // Review finished! Redirect to reviews after short pause
      setTimeout(() => {
        router.push("/reviews");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(`Review failed: ${err.message}`);
      setIsReviewRunning(false);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative space-y-6">
      {/* Streaming Progress Overlay */}
      {isReviewRunning && (
        <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-paper-raised border border-rule w-full max-w-md p-6 rounded-sm shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-rule pb-4">
              <Loader2 className="w-5 h-5 text-accent animate-spin" />
              <div>
                <h3 className="font-serif text-lg font-medium text-ink">
                  Layered Governance Review
                </h3>
                <p className="font-sans text-xs text-ink-soft">
                  Running two-lane scan against Aster &amp; Pine brand pack
                </p>
              </div>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-paper border border-rule rounded-sm font-mono text-[11px] text-accent">
                {activeStage}
              </div>

              <div className="space-y-2">
                {[
                  "Retrieving sources from brand knowledge base...",
                  "Checking deterministic governance rules...",
                  "Analysing context and tone...",
                  "Validating evidence and citations...",
                  "Recording review findings and provenance snapshot...",
                ].map((stepLabel) => {
                  const isDone = completedStages.includes(stepLabel);
                  return (
                    <div
                      key={stepLabel}
                      className="flex items-center gap-2.5 text-ink-soft"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-moss shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-rule shrink-0" />
                      )}
                      <span className={isDone ? "text-ink font-medium" : ""}>
                        {stepLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {reviewSuccessResult && (
              <div className="p-3 bg-moss/10 border border-moss/30 text-moss text-xs rounded-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Scan complete! Found {reviewSuccessResult.findings.length} findings (Status: {reviewSuccessResult.status}). Redirecting...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Submission Slip Container */}
      <div className="bg-paper-raised border border-rule rounded-sm p-6 md:p-8 space-y-6">
        {/* Slip Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule pb-4">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-accent font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-accent inline-block" />
              <span>Submission Slip // Intake No. {new Date().getFullYear()}-DRAFT</span>
            </div>
            <h1 className="font-serif text-2xl font-medium text-ink mt-1">
              Submit Draft for Governance Scan
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={handleLoadSample}
              className="text-xs text-accent hover:bg-accent/5 font-sans h-8"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Load Sample Copy (SummitX Pack)
            </Button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Workspace Selection */}
          {workspaces.length > 1 ? (
            <div>
              <label className="block font-sans text-xs font-medium text-ink-soft uppercase tracking-wider mb-1.5">
                Target Workspace
              </label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full h-9 px-3 font-sans text-xs bg-paper border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block font-sans text-xs font-medium text-ink-soft uppercase tracking-wider mb-1.5">
                Target Workspace
              </label>
              <div className="h-9 px-3 flex items-center font-sans text-xs bg-paper border border-rule text-ink rounded-sm">
                {workspaces[0]?.name || "Aster & Pine (Demo)"}
              </div>
            </div>
          )}

          {/* Channel */}
          <div>
            <label className="block font-sans text-xs font-medium text-ink-soft uppercase tracking-wider mb-1.5">
              Publication Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as ContentChannel)}
              className="w-full h-9 px-3 font-sans text-xs bg-paper border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {CHANNELS.map((ch) => (
                <option key={ch.value} value={ch.value}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submission Title */}
          <div className="md:col-span-2">
            <label className="block font-sans text-xs font-medium text-ink-soft uppercase tracking-wider mb-1.5">
              Document / Draft Title <span className="text-oxblood">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SummitX Alpine Shell - Launch Announcement"
              className="bg-paper border-rule font-serif text-sm h-9"
            />
          </div>

          {/* Intended Message */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-sans text-xs font-medium text-ink-soft uppercase tracking-wider">
                Intended Message <span className="text-oxblood">*</span>
              </label>
              <span className="font-mono text-[10px] text-ink-soft">
                One sentence summary
              </span>
            </div>
            <Input
              value={intendedMessage}
              onChange={(e) => setIntendedMessage(e.target.value)}
              placeholder="e.g. Introduce the 65L SummitX expedition pack engineered with lightweight titanium frame for sub-zero alpine ascents."
              className="bg-paper border-rule font-sans text-xs h-9"
            />
          </div>

          {/* Campaign Context (Optional) */}
          <div className="md:col-span-2">
            <label className="block font-sans text-xs font-medium text-ink-soft uppercase tracking-wider mb-1.5">
              Campaign Context / Tag <span className="font-normal text-ink-soft">(Optional)</span>
            </label>
            <Input
              value={campaignContext}
              onChange={(e) => setCampaignContext(e.target.value)}
              placeholder="e.g. Fall 2026 Core Line Catalog // Technical Apparel"
              className="bg-paper border-rule font-sans text-xs h-9"
            />
          </div>
        </div>

        {/* Draft Text Entry vs Document Upload Switcher */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-rule pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode("paste")}
                className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
                  mode === "paste"
                    ? "bg-ink text-paper font-medium"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Direct Text Entry (Guaranteed)
              </button>
              <button
                type="button"
                onClick={() => setMode("upload")}
                className={`px-3 py-1.5 text-xs font-sans rounded-sm transition-colors ${
                  mode === "upload"
                    ? "bg-ink text-paper font-medium"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Upload Document (.txt, .md, .docx)
              </button>
            </div>

            <div className="font-mono text-xs text-ink-soft">
              {wordCount} words
            </div>
          </div>

          {/* Document Upload Area */}
          {mode === "upload" && (
            <div className="border border-dashed border-rule p-6 rounded-sm text-center bg-paper/40 space-y-3">
              <UploadCloud className="w-8 h-8 text-ink-soft mx-auto" />
              <div>
                <p className="font-sans text-xs text-ink font-medium">
                  Select a draft document to extract and inspect
                </p>
                <p className="font-sans text-[11px] text-ink-soft mt-0.5">
                  Supported formats: .txt, .md, and .docx (Word) up to 5 MB.
                </p>
              </div>

              <input
                type="file"
                accept=".txt,.md,.markdown,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                onChange={handleFileUpload}
                disabled={isParsingDoc}
                className="text-xs font-sans text-ink-soft file:mr-4 file:py-1 file:px-3 file:rounded-sm file:border file:border-rule file:text-xs file:font-sans file:bg-paper-raised hover:file:bg-paper cursor-pointer"
              />

              {isParsingDoc && (
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-accent pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Extracting text server-side...</span>
                </div>
              )}
            </div>
          )}

          {/* Upload Success Note */}
          {uploadNote && (
            <div className="p-3 bg-moss/10 border border-moss/30 text-moss text-xs rounded-sm flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>{uploadNote}</span>
            </div>
          )}

          {/* Unsupported PDF Notice */}
          {isPdfWarning && (
            <div className="p-3 bg-ochre/10 border border-ochre/30 text-ink text-xs rounded-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-ochre shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">PDF Extraction Not Supported Yet:</span> PDF formatting often fragments sentences and tables. Please upload a .txt, .md, or .docx file, or paste your copy directly below.
              </div>
            </div>
          )}

          {/* Large Newsreader Textarea */}
          <div>
            <label className="block font-sans text-xs font-medium text-ink-soft uppercase tracking-wider mb-1.5">
              Draft Copy for Proofreading <span className="text-oxblood">*</span>
            </label>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder="Paste or write your full copy here. The engine will check tone, terminology, unsupported claims, certified facts, and accessibility..."
              rows={11}
              className="w-full p-4 font-serif text-sm bg-paper border border-rule rounded-sm focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed text-ink selection:bg-accent-soft"
            />
          </div>
        </div>

        {/* Error Banner */}
        {errorMsg && !isPdfWarning && (
          <div className="p-3 bg-oxblood/10 border border-oxblood/30 text-oxblood text-xs rounded-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4">
          <div className="font-mono text-[11px] text-ink-soft">
            Provenance: v1 snapshot stored in private storage upon review trigger
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isReviewRunning}
              className="border-rule text-ink font-sans text-xs h-9"
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || isReviewRunning || !draftText.trim()}
              className="bg-accent hover:bg-accent/90 text-paper font-sans text-xs h-9 px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
                  Run Governance Review
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

