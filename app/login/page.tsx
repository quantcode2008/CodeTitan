import { Metadata } from "next";
import { LoginForm } from "./login-form";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In — BrandProof",
  description:
    "Publish with proof. Pre-publication brand governance workspace for controlled claims, terminology, and audited approvals.",
};

export default function LoginPage() {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent-soft selection:text-ink">
      {/* Top Hairline Header */}
      <header className="border-b border-rule px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-ink hover:text-accent transition-colors"
        >
          <span className="w-2.5 h-2.5 bg-accent rounded-none inline-block" />
          <span className="font-bold">BrandProof</span>
          <span className="text-ink-soft">/ Editorial Governance</span>
        </Link>
        <div className="text-[11px] font-mono text-ink-soft">
          Inkloom AI Brand Governance
        </div>
      </header>

      {/* Main 2-Column Split */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Brand Editorial Authority */}
        <div className="lg:col-span-6 space-y-8 lg:pr-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-accent-soft border border-accent/20 font-mono text-[11px] text-accent font-semibold tracking-wider uppercase">
              <span>Controlled Brand Governance</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-ink leading-[1.08]">
              Publish with proof.
            </h1>
            <p className="font-sans text-sm md:text-base text-ink-soft leading-relaxed max-w-lg">
              A pre-publication brand-governance workspace. Check copy against
              a controlled brand knowledge base, pair every finding with an
              editable, purpose-preserving suggestion, and hold an unbroken
              chain of audited human approvals.
            </p>
          </div>

          <div className="border-t border-rule pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-sm bg-paper-sunken border border-rule space-y-1">
                <span className="font-mono text-[10px] text-accent uppercase font-bold">
                  Rule 01
                </span>
                <h4 className="font-serif text-sm font-medium text-ink">
                  Source Authority
                </h4>
                <p className="text-[11px] text-ink-soft leading-relaxed">
                  Your approved brand guidelines are the authority. AI is advisory.
                </p>
              </div>

              <div className="p-3.5 rounded-sm bg-paper-sunken border border-rule space-y-1">
                <span className="font-mono text-[10px] text-ochre uppercase font-bold">
                  Rule 02
                </span>
                <h4 className="font-serif text-sm font-medium text-ink">
                  Two Governance Lanes
                </h4>
                <p className="text-[11px] text-ink-soft leading-relaxed">
                  Deterministic exact rules + LLM tone and nuance analysis.
                </p>
              </div>

              <div className="p-3.5 rounded-sm bg-paper-sunken border border-rule space-y-1">
                <span className="font-mono text-[10px] text-slate uppercase font-bold">
                  Rule 03
                </span>
                <h4 className="font-serif text-sm font-medium text-ink">
                  Non-Destructive Diffs
                </h4>
                <p className="text-[11px] text-ink-soft leading-relaxed">
                  Drafts are never overwritten. Creator accepts, edits, or dismisses.
                </p>
              </div>

              <div className="p-3.5 rounded-sm bg-paper-sunken border border-rule space-y-1">
                <span className="font-mono text-[10px] text-oxblood uppercase font-bold">
                  Rule 04
                </span>
                <h4 className="font-serif text-sm font-medium text-ink">
                  Audited Decisions
                </h4>
                <p className="text-[11px] text-ink-soft leading-relaxed">
                  A clean automated scan never equals approval. Reviewers decide.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs font-mono text-ink-soft flex items-center gap-2">
            <span>Workspace:</span>
            <strong className="text-ink">Aster &amp; Pine Outdoor Co.</strong>
            <span className="text-ink-faint">·</span>
            <span>Seed Node active</span>
          </div>
        </div>

        {/* Right Column: Form Container */}
        <div className="lg:col-span-6 w-full max-w-lg mx-auto lg:max-w-none">
          <div className="bg-paper-raised border border-rule rounded-sm p-6 sm:p-8 shadow-hairline">
            <div className="border-b border-rule pb-4 mb-6">
              <h2 className="font-serif text-2xl font-medium text-ink">
                Sign in to your desk
              </h2>
              <p className="font-sans text-xs text-ink-soft mt-1">
                Authenticate with your enterprise credentials or a magic link.
              </p>
            </div>

            <Suspense fallback={<div className="h-48 flex items-center justify-center font-mono text-xs text-ink-soft">Loading desk credentials...</div>}>
              <LoginForm isDev={isDev} />
            </Suspense>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-rule px-8 py-4 text-xs font-mono text-ink-soft flex flex-wrap items-center justify-between gap-4">
        <div>BrandProof · The Proofreader&apos;s Desk</div>
        <div className="flex items-center gap-4">
          <Link href="/design" className="hover:text-ink transition-colors">
            Design Tokens
          </Link>
          <span>·</span>
          <span>Row Level Security Enforced</span>
        </div>
      </footer>
    </div>
  );
}

