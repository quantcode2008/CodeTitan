import { Metadata } from "next";
import { OnboardingForm } from "./onboarding-form";
import { getSessionUser } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building } from "lucide-react";

export const metadata: Metadata = {
  title: "Workspace Setup — BrandProof",
  description: "Create or join a brand governance workspace.",
};

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?returnTo=/onboarding");
  }

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces (id, name, slug)")
    .eq("user_id", user.id);

  const existingWorkspaces = (memberships || [])
    .map((m: any) => ({
      id: m.workspaces?.id,
      name: m.workspaces?.name,
      slug: m.workspaces?.slug,
      role: m.role,
    }))
    .filter((w) => Boolean(w.id));

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col justify-between selection:bg-accent-soft selection:text-ink">
      <header className="border-b border-rule px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono tracking-wider uppercase text-ink hover:text-accent transition-colors"
        >
          <span className="w-2.5 h-2.5 bg-accent rounded-none inline-block" />
          <span className="font-bold">BrandProof</span>
          <span className="text-ink-soft">/ Workspace Onboarding</span>
        </Link>
        <div className="text-xs font-mono text-ink-soft">
          Signed in as <strong className="text-ink">{user.email}</strong>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-sm bg-accent-soft border border-accent/20 font-mono text-[10px] text-accent font-semibold tracking-wider uppercase">
              Brand Governance Setup
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-ink leading-tight">
              Select or create a workspace.
            </h1>
            <p className="font-sans text-xs md:text-sm text-ink-soft leading-relaxed">
              Every brand guidelines library, terminology rule, claims policy, and review queue is isolated inside a workspace boundary protected by Row Level Security.
            </p>
          </div>

          {/* Existing Workspaces List */}
          {existingWorkspaces.length > 0 && (
            <div className="p-4 rounded-sm bg-paper-sunken border border-rule space-y-3">
              <span className="text-xs font-mono text-ink uppercase font-semibold block">
                Your Active Workspaces ({existingWorkspaces.length})
              </span>
              <div className="space-y-2">
                {existingWorkspaces.map((ws) => (
                  <Link
                    key={ws.id}
                    href="/"
                    className="flex items-center justify-between p-2.5 rounded-sm bg-paper border border-rule hover:border-accent transition-colors group"
                  >
                    <div>
                      <div className="text-xs font-medium text-ink group-hover:text-accent transition-colors">
                        {ws.name}
                      </div>
                      <div className="text-[10px] font-mono text-ink-soft">
                        role: <span className="text-ink font-semibold">{ws.role}</span> · {ws.slug}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-ink-soft group-hover:text-accent transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7">
          <div className="bg-paper-raised border border-rule rounded-sm p-6 sm:p-8 shadow-hairline">
            <OnboardingForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-rule px-8 py-4 text-xs font-mono text-ink-soft flex items-center justify-between">
        <div>BrandProof · The Proofreader&apos;s Desk</div>
        <div>Isolated Workspace Security</div>
      </footer>
    </div>
  );
}

