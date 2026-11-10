import { Metadata } from "next";
import { SignupForm } from "./signup-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Create Account — BrandProof",
  description: "Join the Brand Governance Desk. Establish your proofreader identity and access controlled brand knowledge bases.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent-soft selection:text-ink">
      <header className="border-b border-rule px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-ink hover:text-accent transition-colors"
        >
          <span className="w-2.5 h-2.5 bg-accent rounded-none inline-block" />
          <span className="font-bold">BrandProof</span>
          <span className="text-ink-soft">/ Editorial Governance</span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-mono text-ink-soft hover:text-ink transition-colors"
        >
          Already registered? Sign in →
        </Link>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <div className="lg:col-span-6 space-y-6 lg:pr-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-accent-soft border border-accent/20 font-mono text-[11px] text-accent font-semibold tracking-wider uppercase">
              <span>Onboarding New Members</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-ink leading-[1.1]">
              Join the Brand Governance Desk.
            </h1>
            <p className="font-sans text-sm md:text-base text-ink-soft leading-relaxed max-w-lg">
              Establish your proofreader identity to draft, review, and verify brand communications with guaranteed source traceability and cryptographic audit logs.
            </p>
          </div>

          <div className="p-4 rounded-sm bg-paper-sunken border border-rule space-y-2">
            <h3 className="font-serif text-sm font-medium text-ink">
              Proofreader Responsibilities
            </h3>
            <ul className="text-xs text-ink-soft space-y-1.5 list-disc pl-4 leading-relaxed font-sans">
              <li>Every high-severity finding links to an approved source ID.</li>
              <li>Dismissals require a documented, audited explanation.</li>
              <li>Only designated reviewers can grant pre-publication release sign-off.</li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-6 w-full max-w-lg mx-auto lg:max-w-none">
          <div className="bg-paper-raised border border-rule rounded-sm p-6 sm:p-8 shadow-hairline">
            <div className="border-b border-rule pb-4 mb-6">
              <h2 className="font-serif text-2xl font-medium text-ink">
                Create proofreader account
              </h2>
              <p className="font-sans text-xs text-ink-soft mt-1">
                Enter your details to register. You will then set up or join a workspace.
              </p>
            </div>

            <SignupForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-rule px-8 py-4 text-xs font-mono text-ink-soft flex items-center justify-between">
        <div>BrandProof · The Proofreader&apos;s Desk</div>
        <div>Row Level Security Active</div>
      </footer>
    </div>
  );
}

