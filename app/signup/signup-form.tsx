"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpWithPasswordAction } from "@/lib/actions/auth";
import { ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function SignupForm() {
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.set("fullName", fullName);
    formData.set("email", email);
    formData.set("password", password);

    startTransition(async () => {
      const res = await signUpWithPasswordAction(null, formData);
      if (res?.error) {
        setErrorMsg(res.error);
      } else if (res?.message) {
        setSuccessMsg(res.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div>
        <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
          Full Name
        </label>
        <Input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Sarah Jenkins"
          className="font-sans text-sm bg-paper"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
          Work Email
        </label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="s.jenkins@asterandpine.demo"
          className="font-sans text-sm bg-paper"
        />
      </div>

      <div>
        <label className="block text-xs font-mono text-ink-soft mb-1.5 uppercase tracking-wider">
          Password (min 8 characters)
        </label>
        <Input
          type="password"
          required
          minLength={8}
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
        {isPending ? "Creating Account..." : "Create Proofreader Account"}
        <ArrowRight className="w-3.5 h-3.5 ml-2 stroke-[1.5]" />
      </Button>

      <div className="pt-3 border-t border-rule flex items-center justify-between text-xs text-ink-soft">
        <span>Already have an account?</span>
        <Link
          href="/login"
          className="text-accent font-medium hover:underline"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
