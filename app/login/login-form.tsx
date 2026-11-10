"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithPasswordAction, signInWithMagicLinkAction } from "@/lib/actions/auth";
import { Shield, ArrowRight, KeyRound, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface DemoAccount {
  name: string;
  role: "admin" | "reviewer" | "creator";
  email: string;
  isDesignated?: boolean;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Elena Vance",
    role: "admin",
    email: "admin@asterandpine.demo",
    description: "Workspace governance admin, member management & Brand Pack authority.",
  },
  {
    name: "Marcus Thorne",
    role: "reviewer",
    email: "reviewer@asterandpine.demo",
    isDesignated: true,
    description: "Designated reviewer with high-risk claim sign-off and rejection authority.",
  },
  {
    name: "Chloe Bennett",
    role: "creator",
    email: "creator1@asterandpine.demo",
    description: "Draft author with two-lane inspection and non-destructive diff editing.",
  },
  {
    name: "Liam Patel",
    role: "creator",
    email: "creator2@asterandpine.demo",
    description: "Isolated creator workspace with verified clean draft submissions.",
  },
];

export function LoginForm({ isDev }: { isDev: boolean }) {
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";
  const callbackError = searchParams.get("error");

  const [mode, setMode] = React.useState<"password" | "magic">("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(
    callbackError === "auth_callback_failed"
      ? "Authentication callback failed or expired. Please sign in again."
      : null
  );
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function selectDemoAccount(account: DemoAccount) {
    setEmail(account.email);
    setPassword("DemoPass2026!");
    setErrorMsg(null);
    setSuccessMsg(`Loaded credentials for ${account.name} (${account.role}). Click "Enter Workspace" to sign in.`);
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    formData.set("returnTo", returnTo);

    startTransition(async () => {
      const res = await signInWithPasswordAction(null, formData);
      if (res?.error) {
        setErrorMsg(res.error);
      }
    });
  }

  async function handleMagicLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.set("email", email);

    startTransition(async () => {
      const res = await signInWithMagicLinkAction(null, formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.message) {
        setSuccessMsg(res.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-rule" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "password"}
          onClick={() => {
            setMode("password");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`pb-2.5 px-4 text-xs font-mono font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
            mode === "password"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Password Sign-In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "magic"}
          onClick={() => {
            setMode("magic");
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`pb-2.5 px-4 text-xs font-mono font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
            mode === "magic"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Magic Link
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-sm bg-oxblood-tint/60 border border-oxblood/30 text-oxblood text-xs font-sans flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-3 rounded-sm bg-moss-tint/60 border border-moss/30 text-moss text-xs font-sans flex items-start gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 stroke-[1.5]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Body */}
      {mode === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
              Work Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="editor@asterandpine.demo"
              className="font-sans text-sm bg-paper"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-ink-soft uppercase tracking-wider">
                Password
              </label>
            </div>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="font-sans text-sm bg-paper"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="w-full justify-center text-xs tracking-wider uppercase font-mono py-2.5 mt-2"
          >
            {isPending ? "Verifying Credentials..." : "Enter Workspace"}
            <ArrowRight className="w-3.5 h-3.5 ml-2 stroke-[1.5]" />
          </Button>
        </form>
      ) : (
        <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
              Work Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="editor@asterandpine.demo"
              className="font-sans text-sm bg-paper"
            />
            <p className="mt-1.5 text-[11px] text-ink-soft leading-normal">
              We will send a one-time cryptographic sign-in link to this address. No password needed.
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isPending}
            className="w-full justify-center text-xs tracking-wider uppercase font-mono py-2.5 mt-2"
          >
            {isPending ? "Dispatching Link..." : "Send Magic Link"}
            <Mail className="w-3.5 h-3.5 ml-2 stroke-[1.5]" />
          </Button>
        </form>
      )}

      {/* Sign up link */}
      <div className="pt-2 border-t border-rule flex items-center justify-between text-xs text-ink-soft">
        <span>New to BrandProof?</span>
        <Link
          href="/signup"
          className="text-accent font-medium hover:underline inline-flex items-center gap-1"
        >
          Create proofreader account
        </Link>
      </div>

      {/* Demo Accounts Panel (Judges Quick Access in Non-Production) */}
      {isDev && (
        <div className="mt-8 pt-6 border-t border-rule space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-mono text-accent font-semibold uppercase tracking-wider">
              <KeyRound className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Judge Quick-Access · Seeded Demo Roles</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-accent-soft text-accent border border-accent/20">
              Dev / Demo Mode
            </span>
          </div>

          <p className="text-[11px] font-sans text-ink-soft leading-relaxed">
            Click any seeded role to populate credentials for instant evaluation. Password is{" "}
            <code className="px-1 py-0.5 rounded-sm bg-paper-sunken border border-rule font-mono text-ink text-[10px]">
              DemoPass2026!
            </code>
            .
          </p>

          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((acc) => {
              const roleBadgeColor = {
                admin: "bg-oxblood-tint text-oxblood border-oxblood/30",
                reviewer: "bg-ochre-tint text-ochre border-ochre/30",
                creator: "bg-slate-tint text-slate border-slate/30",
              }[acc.role];

              return (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => selectDemoAccount(acc)}
                  className="w-full text-left p-2.5 rounded-sm bg-paper border border-rule hover:border-accent hover:bg-paper-sunken transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-ink group-hover:text-accent transition-colors">
                        {acc.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-sm border ${roleBadgeColor}`}
                      >
                        {acc.role}
                        {acc.isDesignated && " · designated"}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-ink-soft group-hover:text-ink transition-colors">
                      Use →
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-soft mt-1 leading-snug line-clamp-1">
                    {acc.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
