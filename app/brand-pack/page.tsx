"use client";

import * as React from "react";
import { AppShell } from "@/components/brandproof/app-shell";
import { SourceChip } from "@/components/brandproof/source-chip";
import { SeverityMark } from "@/components/brandproof/severity-mark";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Drawer } from "@/components/ui/drawer";
import { BookOpen, Search, ShieldCheck, FileText, CheckCircle2 } from "lucide-react";

export default function BrandPackPage() {
  const [activeTab, setActiveTab] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSource, setSelectedSource] = React.useState<{
    key: string;
    title: string;
    type: string;
    body: string;
  } | null>(null);

  const sources = [
    {
      key: "S-001",
      title: "Tone of Voice & Brand Character Guide",
      type: "tone_example",
      category: "voice",
      body: "Aster & Pine speaks with the quiet confidence of a seasoned trail guide. Our voice is warm, plainspoken, and respectful of the wild. We avoid breathless tech hype, corporate jargon, and exaggerated excitement. Sentences are crisp, active, and grounded in real outdoor utility.",
    },
    {
      key: "S-002",
      title: "Product Nomenclature & Classification Lexicon",
      type: "terminology",
      category: "terminology",
      body: "Official gear line names must be capitalized exactly: RidgeLine Series, TrailLite Alpine, SummitX Expedition. Do not hyphenate RidgeLine. Never refer to technical apparel as mere clothes or fast fashion.",
    },
    {
      key: "S-003",
      title: "Global Claims Policy v3.0 (Superlatives & Comparisons)",
      type: "claim_policy",
      category: "claims",
      body: "Absolute superlatives such as '#1', 'world's best', 'unbeatable', or 'guaranteed for life' are strictly prohibited unless supported by verified third-party laboratory certification. All comparative claims referencing competitor durability require advance written sign-off from Legal Operations.",
    },
    {
      key: "S-004",
      title: "Warranty Disclaimers & Field Repair Policy",
      type: "guideline",
      category: "legal",
      body: "Any promotional reference to the 25-Year Gear Promise must explicitly include the approved disclaimer: 'Covers manufacturer defects under normal trail usage.' Unqualified statements like 'indestructible' or 'lifetime replacement no matter what' are forbidden.",
    },
    {
      key: "S-005",
      title: "Environmental Claims & FTC Green Guide Standards",
      type: "claim_policy",
      category: "claims",
      body: "Recycled textile percentages must be backed by current Global Recycled Standard (GRS) certificates dated within the active calendar year. Do not use generic eco-slang such as '100% green' or 'planet-saving'.",
    },
    {
      key: "S-006",
      title: "Certified Brand Fact Sheet 2026",
      type: "fact",
      category: "facts",
      body: "Authoritative company facts: Founded in 2014 in Bend, Oregon. Signature 25-year repair pledge active across all canvas packs. Eco-Nylon batch 2023 certified at 78% post-consumer content (Note: this certificate expired December 31, 2024; pending 2026 recertification).",
    },
    {
      key: "S-007",
      title: "Digital Imagery & Accessibility Alt-Text Standards",
      type: "asset_rule",
      category: "assets",
      body: "All photographic assets published on web and social channels must provide rich, informative alternative text describing the gear item, terrain conditions, and outdoor activity. Purely decorative images must be explicitly marked.",
    },
    {
      key: "S-008",
      title: "Prohibited Terminology & Negative Phrasing Dictionary",
      type: "terminology",
      category: "terminology",
      body: "Prohibited terms that damage Aster & Pine brand equity: 'cheap' (diminishes perceived craft), 'revolutionary' (empty hyperbole), 'miracle fabric' (unscientific claim), and 'indestructible' (legally actionable liability).",
    },
    {
      key: "S-009",
      title: "Preferred Terminology & Craftsmanship Vocabulary",
      type: "terminology",
      category: "terminology",
      body: "Preferred phrasing to use across all channels: 'trail-tested', 'purpose-built', 'repaired for life', 'weather-sealed', 'responsibly sourced', and 'field-ready'.",
    },
    {
      key: "S-010",
      title: "Pricing Disclosures & Promotional Transparency",
      type: "guideline",
      category: "legal",
      body: "Sales copy must never deploy artificial urgency tactics (e.g. 'Only 2 left at this price!' without real inventory sync). Strike-through pricing must reflect bona fide sales in the preceding 60 days.",
    },
    {
      key: "S-011",
      title: "Social Media Creator & Ambassador Code",
      type: "guideline",
      category: "voice",
      body: "Ambassadors must explicitly disclose paid sponsorship in the first two lines of copy using #AsterPinePartner or #ad. No safety-critical cold weather survival claims may be made by uncertified ambassadors.",
    },
    {
      key: "S-012",
      title: "Co-Branding, Logo Clear-Space & Partner Badging",
      type: "asset_rule",
      category: "assets",
      body: "The Aster & Pine fir-and-peak emblem requires a minimum clear space equal to 50% of its height on all sides. When placed on third-party guides, it must render in forest ink (#16140F) or pure paper white.",
    },
  ];

  const filtered = sources.filter((s) => {
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "claims" && s.type === "claim_policy") ||
      (activeTab === "terminology" && s.type === "terminology") ||
      (activeTab === "facts" && s.type === "fact") ||
      (activeTab === "guidelines" && s.type === "guideline");
    const matchesQuery =
      searchQuery === "" ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Brand Pack", href: "/brand-pack" },
      ]}
    >
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="border-b border-rule pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              Controlled Knowledge Base
            </span>
            <h1 className="font-serif text-2xl font-medium text-ink mt-1">
              Brand Pack · The Single Source of Truth
            </h1>
            <p className="font-sans text-xs text-ink-soft mt-1">
              The organisation&apos;s approved sources are the authority, not the AI. Automated scans cite these exact records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-moss-tint text-moss text-xs font-mono border border-moss/30 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              12 Active Sources Enforced
            </span>
          </div>
        </div>

        {/* Filters and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            tabs={[
              { id: "all", label: "All Sources", badge: sources.length },
              { id: "claims", label: "Claims Policy", badge: 2 },
              { id: "terminology", label: "Terminology", badge: 3 },
              { id: "facts", label: "Certified Facts", badge: 1 },
              { id: "guidelines", label: "Guidelines", badge: 3 },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Search policies (e.g. S-014 or claims)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-sm font-sans text-xs text-ink bg-paper-raised border border-rule placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none stroke-[1.5]" />
          </div>
        </div>

        {/* Sources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.key}
              onClick={() => setSelectedSource(s)}
              className="group p-4 rounded-sm bg-paper-raised border border-rule hover:border-ink-soft/40 transition-all cursor-pointer space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-accent">
                    [{s.key}]
                  </span>
                  <span className="font-mono text-[10px] uppercase text-ink-faint">
                    {s.type.replace(/_/g, " ")}
                  </span>
                </div>
                <h3 className="font-serif text-sm font-medium text-ink leading-snug group-hover:text-accent transition-colors">
                  {s.title}
                </h3>
                <p className="mt-2 font-sans text-xs text-ink-soft line-clamp-3 leading-relaxed">
                  {s.body}
                </p>
              </div>

              <div className="pt-2 border-t border-rule-soft flex items-center justify-between text-[11px] font-mono text-ink-faint">
                <span>Version 1.0</span>
                <span className="text-accent underline font-sans text-xs">
                  Inspect policy →
                </span>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="p-8 text-center bg-paper-raised border border-rule rounded-sm font-sans text-xs text-ink-soft">
            No brand sources found matching &ldquo;{searchQuery}&rdquo;.
          </div>
        )}
      </div>

      {/* Source Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedSource)}
        onClose={() => setSelectedSource(null)}
        title={selectedSource?.title || "Brand Source"}
        subtitle={`Source ID: [${selectedSource?.key}] · ${selectedSource?.type}`}
      >
        {selectedSource && (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-3 bg-paper rounded-sm border border-rule text-ink-soft">
              <span className="font-mono text-[10px] uppercase text-moss font-semibold block mb-1">
                ✓ Enforced by Automated Governance Engine
              </span>
              <span>
                Both deterministic regex rules and LLM evaluation cross-reference drafts against this text.
              </span>
            </div>

            <div>
              <h4 className="font-serif text-sm font-medium text-ink mb-1.5">
                Full Policy Text
              </h4>
              <div className="p-4 bg-paper-sunken/60 border border-rule rounded-sm font-serif text-sm text-ink leading-relaxed">
                {selectedSource.body}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-paper p-3 rounded-sm border border-rule">
              <div>
                <span className="text-ink-faint">Status:</span> Active
              </div>
              <div>
                <span className="text-ink-faint">Authority:</span> Legal & Brand Ops
              </div>
              <div>
                <span className="text-ink-faint">Scope:</span> Workspace-wide
              </div>
              <div>
                <span className="text-ink-faint">Audit:</span> Enforced
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setSelectedSource(null)}
            >
              Close Policy
            </Button>
          </div>
        )}
      </Drawer>
    </AppShell>
  );
}
