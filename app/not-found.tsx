import Link from "next/link";
import { BookOpen, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-paper-raised border border-rule p-8 rounded-sm shadow-raised space-y-6 text-center">
        <div className="w-12 h-12 rounded-sm bg-accent-soft border border-accent/20 mx-auto flex items-center justify-center text-accent">
          <BookOpen className="w-6 h-6 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            Error 404 · Unindexed Resource
          </span>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink">
            Page Not Found
          </h1>
          <p className="font-sans text-xs text-ink-soft leading-relaxed max-w-sm mx-auto">
            The requested document, guideline source, or review record does not
            exist in this workspace or may have been archived.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link href="/reviews">
            <Button variant="primary">
              <BookOpen className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
              Go to Review Desk
            </Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">
              <Home className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
