"use client";

import * as React from "react";
import { AppShell } from "@/components/brandproof/app-shell";
import { Annotation } from "@/components/brandproof/annotation";
import { MarginNote, FindingData } from "@/components/brandproof/margin-note";
import { SourceChip } from "@/components/brandproof/source-chip";
import { SeverityMark, SeverityLevel } from "@/components/brandproof/severity-mark";
import { StatusTrail, WorkflowState } from "@/components/brandproof/status-trail";
import { DiffView } from "@/components/brandproof/diff-view";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs } from "@/components/ui/tabs";
import { Dialog } from "@/components/ui/dialog";
import { Drawer } from "@/components/ui/drawer";
import { ToastContainer, ToastItem } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

import { Sun, Moon, Info, BookOpen, FileCheck2, ArrowUpRight } from "lucide-react";

export default function DesignSystemPage() {
  // Theme state
  const [isDark, setIsDark] = React.useState(false);

  // Active finding in draft
  const [activeFindingId, setActiveFindingId] = React.useState<string>("F-101");

  // Workflow state for status trail
  const [workflowState, setWorkflowState] =
    React.useState<WorkflowState>("needs_attention");

  // Tabs state
  const [activeTab, setActiveTab] = React.useState("all");

  // Dialog and Drawer state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState({
    id: "S-014",
    title: "Global Claims Policy v3.2",
    excerpt:
      "All claims regarding system latency or performance must cite verified synthetic benchmarks conducted within the last 90 days. Unsubstantiated claims such as 'instantaneous' or '100% infallible' are strictly prohibited.",
  });

  // Toasts state
  const [toasts, setToasts] = React.useState<ToastItem[]>([
    {
      id: "toast-1",
      title: "Proofing rule triggered",
      description: "Critical severity finding linked to source [S-014].",
      variant: "warning",
    },
  ]);

  // Demo Findings
  const [findings, setFindings] = React.useState<FindingData[]>([
    {
      id: "F-101",
      severity: "critical",
      lane: "deterministic",
      title: "Unapproved Absolute Claim",
      explanation:
        "The phrasing 'infinitely scalable' violates Section 4.2 of Claims Policy. Unverified performance claims must be qualified with certified benchmarks.",
      originalText: "infinitely scalable architecture",
      suggestedText: "horizontally scalable infrastructure verified up to 50k RPS",
      sourceId: "S-014",
      sourceTitle: "Global Claims Policy v3.2",
      evidenceStatus: "verified",
      status: "open",
    },
    {
      id: "F-102",
      severity: "major",
      lane: "llm",
      title: "Informal Brand Voice Drift",
      explanation:
        "The tone deviates toward casual promotional speech. Brand Guidelines recommend measured, authoritative phrasing for enterprise releases.",
      originalText: "blows away older legacy tools",
      suggestedText: "demonstrates marked architectural advantages over monolithic systems",
      sourceId: "S-008",
      sourceTitle: "Enterprise Voice & Tone Guide",
      evidenceStatus: "verified",
      status: "open",
    },
    {
      id: "F-103",
      severity: "minor",
      lane: "deterministic",
      title: "Legacy Nomenclature Used",
      explanation:
        "The term 'Inkloom Cloud' was deprecated in Q3. The approved official terminology is 'Inkloom Governance Fabric'.",
      originalText: "Inkloom Cloud",
      suggestedText: "Inkloom Governance Fabric",
      sourceId: "S-002",
      sourceTitle: "Official Nomenclature Lexicon 2026",
      evidenceStatus: "verified",
      status: "open",
    },
    {
      id: "F-104",
      severity: "advisory",
      lane: "llm",
      title: "Unverified Third-Party Citation",
      explanation:
        "External analyst statistic is referenced without an approved entry in the Brand Knowledge Base. Flagged for reviewer human judgement.",
      originalText: "saving teams 12 hours every week",
      suggestedText: "reducing governance review cycles according to internal pilot logs",
      sourceId: "S-000",
      sourceTitle: "No approved source cited",
      evidenceStatus: "unverified",
      status: "open",
    },
  ]);

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAcceptFinding = (id: string) => {
    setFindings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "accepted" } : f))
    );
    setToasts((prev) => [
      ...prev,
      {
        id: `toast-${Date.now()}`,
        title: "Suggestion Accepted",
        description: `Finding ${id} replaced with approved suggestion. Diff updated.`,
        variant: "success",
      },
    ]);
  };

  const handleOpenSource = (sourceId: string, title: string) => {
    setSelectedSource({
      id: sourceId,
      title: title,
      excerpt:
        sourceId === "S-014"
          ? "All claims regarding system latency or performance must cite verified synthetic benchmarks conducted within the last 90 days. Absolute superlatives ('zero downtime', 'infinitely scalable') are strictly prohibited without designated legal sign-off."
          : sourceId === "S-008"
          ? "Our voice is that of a seasoned, quiet editor: calm, authoritative, and precise. Avoid breathless tech-bro hyperbole ('revolutionary', 'blows away'). Let verified metrics communicate strength."
          : "Approved terminology: Use 'Inkloom Governance Fabric' for all distributed workflow engines.",
    });
    setIsDrawerOpen(true);
  };

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Design System Showcase", href: "/design" },
      ]}
    >
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">
        {/* Page Title & Vision Header */}
        <section className="border-b border-rule pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              Design System · The Proofreader&apos;s Desk
            </span>
            <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-ink">
              BrandProof Visual Language & Components
            </h1>
            <p className="mt-2 font-sans text-sm text-ink-soft max-w-2xl leading-relaxed">
              Tactile, editorial, and trustworthy. Built with razor-sharp 1px
              hairline rules, high-contrast ink scales, and zero generic AI
              dashboard slop.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const doc = document.documentElement;
                if (doc.classList.contains("dark")) {
                  doc.classList.remove("dark");
                  setIsDark(false);
                } else {
                  doc.classList.add("dark");
                  setIsDark(true);
                }
              }}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 mr-1.5 text-ochre" />
                  Switch to Light Desk
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 mr-1.5 text-slate" />
                  Switch to Night Desk
                </>
              )}
            </Button>
          </div>
        </section>

        {/* 1. Tokens: Color Palette & Swatches */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-ink">
              1. Color Tokens & WCAG AA Calibrations
            </h2>
            <span className="font-mono text-xs text-ink-faint">
              Base: #F6F3EC · Night: #14130F
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs font-mono">
            {/* Paper */}
            <div className="p-3 rounded-sm border border-rule bg-paper">
              <div className="h-10 rounded-sm border border-rule bg-paper mb-2" />
              <p className="font-semibold text-ink">paper</p>
              <p className="text-ink-faint text-[10px]">#F6F3EC</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                Desk canvas
              </p>
            </div>

            {/* Paper Raised */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-paper-raised mb-2" />
              <p className="font-semibold text-ink">paper-raised</p>
              <p className="text-ink-faint text-[10px]">#FBF9F4</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                Document sheet
              </p>
            </div>

            {/* Ink */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-ink mb-2" />
              <p className="font-semibold text-ink">ink</p>
              <p className="text-ink-faint text-[10px]">#16140F</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                16.5:1 ratio (AAA)
              </p>
            </div>

            {/* Ink Soft */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-ink-soft mb-2" />
              <p className="font-semibold text-ink">ink-soft</p>
              <p className="text-ink-faint text-[10px]">#4A463C</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                8.47:1 ratio (AAA)
              </p>
            </div>

            {/* Rule */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-rule mb-2" />
              <p className="font-semibold text-ink">rule</p>
              <p className="text-ink-faint text-[10px]">#DDD6C6</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                Hairline divider
              </p>
            </div>

            {/* Accent */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-accent mb-2" />
              <p className="font-semibold text-ink">accent (Ink Blue)</p>
              <p className="text-ink-faint text-[10px]">#1F3A5F</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                Primary action ink
              </p>
            </div>

            {/* Oxblood */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-oxblood mb-2" />
              <p className="font-semibold text-ink">oxblood (Critical)</p>
              <p className="text-ink-faint text-[10px]">#8C2F2B</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                7.52:1 ratio (AAA)
              </p>
            </div>

            {/* Ochre */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-ochre mb-2" />
              <p className="font-semibold text-ink">ochre (Major)</p>
              <p className="text-ink-faint text-[10px]">#B07A1F / #8C5E0D</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                5.21:1 calibrated text
              </p>
            </div>

            {/* Slate */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-slate mb-2" />
              <p className="font-semibold text-ink">slate (Advisory)</p>
              <p className="text-ink-faint text-[10px]">#3F5B73</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                6.44:1 ratio (AA)
              </p>
            </div>

            {/* Moss */}
            <div className="p-3 rounded-sm border border-rule bg-paper-raised">
              <div className="h-10 rounded-sm border border-rule bg-moss mb-2" />
              <p className="font-semibold text-ink">moss (Approved)</p>
              <p className="text-ink-faint text-[10px]">#4B6B45</p>
              <p className="text-ink-soft text-[10px] mt-1 font-sans">
                5.11:1 ratio (AA)
              </p>
            </div>
          </div>
        </section>

        {/* 2. Interactive Document Proofing Canvas */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-medium text-ink">
                2. Live Proofreader&apos;s Desk: Annotation + Margin Note + Leader
              </h2>
              <p className="font-sans text-xs text-ink-soft mt-0.5">
                Click any underlined draft segment to focus its margin finding
                card and review the citation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* The Document Sheet (68ch reading column) */}
            <div className="lg:col-span-7 bg-paper-raised p-8 rounded-sm border border-rule shadow-hairline">
              <div className="flex items-center justify-between pb-4 border-b border-rule mb-6 text-xs text-ink-faint font-mono">
                <span>DOC-2026-Q4-LAUNCH.md</span>
                <span>Reading Width: 68ch</span>
              </div>

              {/* Document Text */}
              <article className="max-w-draft space-y-5 font-serif text-base text-ink leading-relaxed">
                <h3 className="font-serif text-2xl font-medium tracking-tight text-ink">
                  Inkloom Governance Fabric: 2026 Architectural Brief
                </h3>

                <p>
                  Modern digital enterprises require rigorous brand oversight
                  prior to customer-facing publication. When distributing
                  marketing collateral across hundreds of channels, teams
                  rely on our{" "}
                  <Annotation
                    findingId="F-101"
                    severity="critical"
                    isActive={activeFindingId === "F-101"}
                    onClick={setActiveFindingId}
                  >
                    infinitely scalable architecture
                  </Annotation>{" "}
                  to eliminate non-compliant terminology before it goes public.
                </p>

                <p>
                  By decoupling automated deterministic scanning from LLM-driven
                  tone analysis, BrandProof delivers instant feedback that{" "}
                  <Annotation
                    findingId="F-102"
                    severity="major"
                    isActive={activeFindingId === "F-102"}
                    onClick={setActiveFindingId}
                  >
                    blows away older legacy tools
                  </Annotation>
                  . All assets are archived securely within the{" "}
                  <Annotation
                    findingId="F-103"
                    severity="minor"
                    isActive={activeFindingId === "F-103"}
                    onClick={setActiveFindingId}
                  >
                    Inkloom Cloud
                  </Annotation>
                  , with strict tenant isolation.
                </p>

                <p>
                  Early beta deployments indicate significant operational
                  velocity gains, reportedly{" "}
                  <Annotation
                    findingId="F-104"
                    severity="advisory"
                    isActive={activeFindingId === "F-104"}
                    onClick={setActiveFindingId}
                  >
                    saving teams 12 hours every week
                  </Annotation>{" "}
                  on routine legal and brand reviews. Every proposed modification
                  preserves author intent and is logged in the permanent audit
                  trail.
                </p>
              </article>
            </div>

            {/* The Margin Findings Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-xs uppercase tracking-wider text-ink-soft">
                  Marginalia ({findings.length} findings)
                </span>
                <span className="font-sans text-[11px] text-ink-faint">
                  Active: <strong className="font-mono text-ink">{activeFindingId}</strong>
                </span>
              </div>

              <div className="space-y-3">
                {findings.map((f) => (
                  <MarginNote
                    key={f.id}
                    finding={f}
                    isActive={activeFindingId === f.id}
                    onSelect={setActiveFindingId}
                    onAccept={handleAcceptFinding}
                    onEdit={(id) => {
                      setIsDialogOpen(true);
                    }}
                    onDismiss={(id) => {
                      setFindings((prev) =>
                        prev.map((item) =>
                          item.id === id
                            ? { ...item, status: "dismissed" }
                            : item
                        )
                      );
                      setToasts((prev) => [
                        ...prev,
                        {
                          id: `toast-${Date.now()}`,
                          title: "Finding Dismissed",
                          description: `Dismissal of ${id} logged with required justification.`,
                          variant: "info",
                        },
                      ]);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Severity Marks & Source Citations */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Severity Marks */}
          <div className="p-6 rounded-sm border border-rule bg-paper-raised space-y-4">
            <h3 className="font-serif text-lg font-medium text-ink">
              3. Severity Mark (Never Color Alone)
            </h3>
            <p className="font-sans text-xs text-ink-soft">
              Pairs high-contrast ink with geometric shape symbols and explicit
              text labels for instant recognition and full accessibility.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <SeverityMark severity="critical" />
              <SeverityMark severity="major" />
              <SeverityMark severity="minor" />
              <SeverityMark severity="advisory" />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <SeverityMark severity="critical" size="sm" />
              <SeverityMark severity="major" size="sm" />
              <SeverityMark severity="minor" size="sm" />
              <SeverityMark severity="advisory" size="sm" />
            </div>
          </div>

          {/* Source Chips */}
          <div className="p-6 rounded-sm border border-rule bg-paper-raised space-y-4">
            <h3 className="font-serif text-lg font-medium text-ink">
              4. Source Chips (Footnote Citations)
            </h3>
            <p className="font-sans text-xs text-ink-soft">
              Footnote-style citations linking claims to approved knowledge base
              articles. Unverified claims display a dashed border.
            </p>

            <div className="flex flex-col gap-2.5 pt-2">
              <SourceChip
                sourceId="S-014"
                sourceTitle="Global Claims Policy v3.2"
                sectionRef="§4.2"
                variant="verified"
                onClick={() =>
                  handleOpenSource("S-014", "Global Claims Policy v3.2")
                }
              />
              <SourceChip
                sourceId="S-008"
                sourceTitle="Enterprise Voice & Tone Guide"
                sectionRef="§2.1"
                variant="verified"
                onClick={() =>
                  handleOpenSource("S-008", "Enterprise Voice & Tone Guide")
                }
              />
              <SourceChip
                sourceId="S-000"
                variant="unverified"
                onClick={() =>
                  handleOpenSource("S-000", "No Approved Source Found")
                }
              />
            </div>
          </div>
        </section>

        {/* 5. Status Trail (The Fundamental Law) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-medium text-ink">
              5. Status Trail (Governance Stepper)
            </h3>
            <div className="flex items-center space-x-2 text-xs font-sans">
              <span className="text-ink-soft">Simulate:</span>
              <button
                type="button"
                onClick={() => setWorkflowState("needs_attention")}
                className="px-2 py-0.5 rounded-sm border border-rule bg-paper text-ink cursor-pointer hover:bg-paper-sunken"
              >
                Needs Attention
              </button>
              <button
                type="button"
                onClick={() => setWorkflowState("ready_for_review")}
                className="px-2 py-0.5 rounded-sm border border-rule bg-paper text-ink cursor-pointer hover:bg-paper-sunken"
              >
                Ready
              </button>
              <button
                type="button"
                onClick={() => setWorkflowState("approved")}
                className="px-2 py-0.5 rounded-sm border border-rule bg-paper text-ink cursor-pointer hover:bg-paper-sunken"
              >
                Approved
              </button>
            </div>
          </div>

          <StatusTrail
            currentState={workflowState}
            unresolvedCount={findings.filter((f) => f.status === "open").length}
          />
        </section>

        {/* 6. Diff View (Preservation & Non-Destruction) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-medium text-ink">
              6. Diff View (Inline & Split Comparison)
            </h3>
            <span className="font-sans text-xs text-ink-faint">
              Original copy preserved; changes highlighted in Oxblood & Moss
            </span>
          </div>

          <DiffView
            originalText="Our infinitely scalable architecture eliminates all non-compliant messaging."
            revisedText="Our horizontally scalable infrastructure verified up to 50k RPS validates brand claims."
          />
        </section>

        {/* 7. Base UI Primitives */}
        <section className="p-6 rounded-sm border border-rule bg-paper-raised space-y-6">
          <h3 className="font-serif text-lg font-medium text-ink">
            7. Base UI Primitives (Controls, Forms, Feedback)
          </h3>

          {/* Buttons */}
          <div className="space-y-2">
            <h4 className="font-sans text-xs uppercase tracking-wider text-ink-soft font-semibold">
              Buttons (4px radius, hairline rules)
            </h4>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Sheet</Button>
              <Button variant="quiet">Quiet Ghost</Button>
              <Button variant="destructive">Destructive Oxblood</Button>
              <Button variant="secondary" size="sm">
                Small (sm)
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </div>

          {/* Form inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Authoritative Reference Code"
              placeholder="e.g. S-042"
              hint="Format matches brand knowledge base index"
            />
            <Select
              label="Assigned Reviewer Lane"
              options={[
                { value: "legal", label: "Legal & Regulatory Compliance" },
                { value: "brand", label: "Executive Brand Marketing" },
                { value: "product", label: "Product Governance Team" },
              ]}
            />
            <Input
              label="Mandatory Reason for Dismissal"
              placeholder="Required when dismissing findings"
              error="Dismissal requires an audited explanation"
            />
          </div>

          <Textarea
            label="Finding Resolution Rationale"
            placeholder="Document why this copy replacement preserves original creator intent..."
            rows={2}
          />

          {/* Tabs */}
          <div className="space-y-2">
            <h4 className="font-sans text-xs uppercase tracking-wider text-ink-soft font-semibold">
              Editorial Underline Tabs
            </h4>
            <Tabs
              tabs={[
                { id: "all", label: "All Findings", badge: 4 },
                { id: "deterministic", label: "Deterministic Lane", badge: 2 },
                { id: "llm", label: "LLM Tone Lane", badge: 2 },
                { id: "resolved", label: "Resolved", badge: 0 },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />
          </div>

          {/* Modals & Triggers */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
              Preview Edit Dialog
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                handleOpenSource("S-014", "Global Claims Policy v3.2")
              }
            >
              Preview Source Drawer
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setToasts((prev) => [
                  ...prev,
                  {
                    id: `toast-${Date.now()}`,
                    title: "Audit Log Recorded",
                    description:
                      "Reviewer action committed to immutable Supabase ledger.",
                    variant: "success",
                  },
                ]);
              }}
            >
              Trigger Notification Toast
            </Button>
          </div>
        </section>

        {/* 8. Skeletons & Empty States */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skeleton Loaders */}
          <div className="p-6 rounded-sm border border-rule bg-paper-raised space-y-4">
            <h3 className="font-serif text-lg font-medium text-ink">
              8. Skeleton Loader (Calm Paper Shimmer)
            </h3>
            <p className="font-sans text-xs text-ink-soft">
              Subtle paper tone shimmer matching the `#F6F3EC` base.
            </p>

            <div className="space-y-3 pt-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex items-center gap-3 pt-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          </div>

          {/* Empty State */}
          <div className="p-6 rounded-sm border border-rule bg-paper-raised space-y-4">
            <h3 className="font-serif text-lg font-medium text-ink">
              9. Empty State (Real Editorial Copy)
            </h3>
            <EmptyState
              title="No Pending Document Submissions"
              description="Your workspace draft queue is up to date. Submit a markdown or text draft to run deterministic and tone governance scans."
              actionLabel="Create New Draft"
              onAction={() => {
                alert("New draft workflow triggered.");
              }}
            />
          </div>
        </section>
      </div>

      {/* Edit Dialog Modal */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="Edit Finding Suggestion"
        description="Preserve original intent while satisfying approved brand rules."
      >
        <div className="space-y-4">
          <Textarea
            label="Revised Text"
            defaultValue="horizontally scalable infrastructure verified up to 50k RPS"
            rows={3}
          />
          <Input
            label="Justification for Audit Log"
            defaultValue="Updated with recent Q3 synthetic load testing figures"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="quiet" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsDialogOpen(false);
                setToasts((prev) => [
                  ...prev,
                  {
                    id: `toast-${Date.now()}`,
                    title: "Edit Applied",
                    description: "Custom wording saved to draft and audited.",
                    variant: "success",
                  },
                ]);
              }}
            >
              Apply Edit
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Source Citation Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedSource.title}
        subtitle={`Source ID: [${selectedSource.id}] · Approved Knowledge Base`}
      >
        <div className="space-y-5 font-sans">
          <div className="p-3 bg-paper rounded-sm border border-rule text-xs text-ink-soft">
            <span className="font-mono uppercase text-[10px] text-moss font-semibold block mb-1">
              ✓ Verified Authority Document
            </span>
            <span>
              This document is part of the controlled Brand Knowledge Base.
              Automated scans verify findings directly against this text.
            </span>
          </div>

          <div>
            <h4 className="font-serif text-sm font-medium text-ink mb-1.5">
              Approved Policy Excerpt
            </h4>
            <div className="p-4 bg-paper-sunken/60 border border-rule rounded-sm font-serif text-sm text-ink leading-relaxed italic">
              &ldquo;{selectedSource.excerpt}&rdquo;
            </div>
          </div>

          <div className="space-y-2 text-xs text-ink-soft">
            <h4 className="font-sans font-medium text-ink">Metadata</h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-paper p-3 rounded-sm border border-rule">
              <div>
                <span className="text-ink-faint">Version:</span> 3.2.0
              </div>
              <div>
                <span className="text-ink-faint">Approved By:</span> Legal Ops
              </div>
              <div>
                <span className="text-ink-faint">Effective:</span> Oct 2026
              </div>
              <div>
                <span className="text-ink-faint">Status:</span> Enforced
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-rule">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setIsDrawerOpen(false)}
            >
              Close Citation Inspector
            </Button>
          </div>
        </div>
      </Drawer>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </AppShell>
  );
}

