import Link from "next/link";
import { AppShell } from "@/components/brandproof/app-shell";
import { Button } from "@/components/ui/button";
import { StatusTrail } from "@/components/brandproof/status-trail";
import {
  FileText,
  ShieldCheck,
  Palette,
  BookOpen,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <AppShell
      breadcrumb={[
        { label: "Inkloom Governance", href: "/" },
        { label: "Proofreader's Desk", href: "/" },
      ]}
    >
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Editorial Desk Header */}
        <div className="border-b border-rule pb-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold mb-2">
            <span className="w-2 h-2 rounded-none bg-accent" />
            <span>Brand Governance Workspace</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-ink">
            BrandProof: The Proofreader&apos;s Desk
          </h1>
          <p className="mt-3 font-sans text-sm text-ink-soft max-w-2xl leading-relaxed">
            Pre-publication governance workspace for controlled brand guidelines,
            unsupported claim detection, two-lane verification, and audited human
            approvals.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/design">
              <Button variant="primary">
                <Palette className="w-4 h-4 mr-1.5 stroke-[1.5]" />
                Explore Design System Showcase
              </Button>
            </Link>
            <Link href="/design">
              <Button variant="secondary">
                <FileText className="w-4 h-4 mr-1.5 stroke-[1.5]" />
                Inspect Proofreader Components
              </Button>
            </Link>
          </div>
        </div>

        {/* Fundamental Law Banner */}
        <StatusTrail currentState="needs_attention" unresolvedCount={3} />

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-2">
            <div className="w-8 h-8 rounded-sm bg-accent-soft text-accent flex items-center justify-center font-mono text-xs font-bold border border-accent/20">
              01
            </div>
            <h3 className="font-serif text-lg font-medium text-ink">
              Source Authority
            </h3>
            <p className="font-sans text-xs text-ink-soft leading-relaxed">
              Every finding is anchored to an approved brand source in the
              controlled knowledge base. Unverified claims are explicitly
              flagged.
            </p>
          </div>

          <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-2">
            <div className="w-8 h-8 rounded-sm bg-ochre-tint text-ochre flex items-center justify-center font-mono text-xs font-bold border border-ochre/20">
              02
            </div>
            <h3 className="font-serif text-lg font-medium text-ink">
              Two Governance Lanes
            </h3>
            <p className="font-sans text-xs text-ink-soft leading-relaxed">
              Deterministic rule checks provide exact, auditable compliance; LLM
              analysis handles subtle tone drift, nuance, and meaning.
            </p>
          </div>

          <div className="p-5 rounded-sm bg-paper-raised border border-rule space-y-2">
            <div className="w-8 h-8 rounded-sm bg-moss-tint text-moss flex items-center justify-center font-mono text-xs font-bold border border-moss/20">
              03
            </div>
            <h3 className="font-serif text-lg font-medium text-ink">
              Non-Destructive Diffs
            </h3>
            <p className="font-sans text-xs text-ink-soft leading-relaxed">
              Creator drafts are never silently overwritten. Changes are
              proposed as transparent diffs requiring explicit creator action.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

