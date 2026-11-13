"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error digest safely without leaking raw user content
    console.error("[BrandProof ErrorBoundary]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-paper-raised border border-rule p-8 rounded-sm shadow-raised space-y-6">
        <div className="flex items-center gap-3 text-oxblood">
          <div className="w-10 h-10 rounded-sm bg-oxblood-tint border border-oxblood/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-oxblood font-semibold">
              Desk Interruption
            </span>
            <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">
              An unexpected error occurred
            </h1>
          </div>
        </div>

        <p className="font-sans text-xs text-ink-soft leading-relaxed">
          The proofreader&apos;s workspace encountered an issue while processing
          the requested operation. Your draft content is preserved.
        </p>

        {error.digest && (
          <div className="p-3 bg-paper border border-rule rounded-sm font-mono text-[11px] text-ink-faint">
            Error Reference ID: {error.digest}
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            onClick={() => reset()}
            className="flex-1"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
            Retry Action
          </Button>
          <Link href="/" className="flex-1">
            <Button variant="secondary" className="w-full">
              <Home className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
