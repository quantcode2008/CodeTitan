"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[BrandProof GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F6F3EC] text-[#16140F] font-serif flex items-center justify-center p-6 antialiased">
        <div className="max-w-md w-full bg-[#FBF9F4] border border-[#DDD6C6] p-8 rounded-sm shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#F9ECEB] border border-[#8C2F2B]/20 flex items-center justify-center text-[#8C2F2B]">
              <AlertCircle className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8C2F2B] font-semibold block">
                System Boundary Exception
              </span>
              <h1 className="font-serif text-2xl font-medium tracking-tight text-[#16140F]">
                Critical Application Error
              </h1>
            </div>
          </div>

          <p className="font-sans text-xs text-[#4A463C] leading-relaxed">
            The workspace was unable to load the primary environment layout.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm bg-[#16140F] text-[#F6F3EC] font-mono text-xs uppercase tracking-wider font-medium hover:bg-[#4A463C] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 stroke-[1.5]" />
              Reload Workspace
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-sm bg-[#FBF9F4] border border-[#DDD6C6] text-[#16140F] font-mono text-xs uppercase tracking-wider hover:border-[#4A463C] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
