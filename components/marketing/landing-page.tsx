"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Scale,
  Clock,
  ArrowUpRight,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function LandingPage() {
  const [activeEvidenceTab, setActiveEvidenceTab] = React.useState<
    "verified" | "unverified"
  >("verified");

  // Refs for GSAP animation
  const heroRef = React.useRef<HTMLDivElement>(null);
  const driftSectionRef = React.useRef<HTMLElement>(null);
  const stepsContainerRef = React.useRef<HTMLDivElement>(null);

  // Drift markup refs
  const driftPassage1Ref = React.useRef<HTMLSpanElement>(null);
  const driftNote1Ref = React.useRef<HTMLDivElement>(null);

  const driftPassage2Ref = React.useRef<HTMLSpanElement>(null);
  const driftNote2Ref = React.useRef<HTMLDivElement>(null);

  const driftPassage3Ref = React.useRef<HTMLSpanElement>(null);
  const driftNote3Ref = React.useRef<HTMLDivElement>(null);

  const driftPassage4Ref = React.useRef<HTMLSpanElement>(null);
  const driftNote4Ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Register GSAP ScrollTrigger plugin on client
    gsap.registerPlugin(ScrollTrigger);

    let lenis: Lenis | null = null;
    let tickerCallback: ((time: number) => void) | null = null;

    if (!prefersReducedMotion) {
      // 1. Initialize Lenis Smooth Scroll
      try {
        lenis = new Lenis({
          duration: 1.15,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
        });

        // Sync Lenis with GSAP ScrollTrigger
        lenis.on("scroll", ScrollTrigger.update);

        tickerCallback = (time: number) => {
          lenis?.raf(time * 1000);
        };
        gsap.ticker.add(tickerCallback);
        gsap.ticker.lagSmoothing(0);
      } catch (err) {
        console.warn("Lenis initialization skipped:", err);
      }

      // 2. GSAP Animations for The Drift markup
      const ctx = gsap.context(() => {
        // Hero entrance
        if (heroRef.current) {
          gsap.from(heroRef.current.querySelectorAll(".hero-fade"), {
            opacity: 0,
            y: 18,
            duration: 0.8,
            stagger: 0.12,
            ease: "power2.out",
          });
        }

        // Drift scrub triggers
        const setupDriftItem = (
          passageRef: React.RefObject<HTMLSpanElement | null>,
          noteRef: React.RefObject<HTMLDivElement | null>,
          delay: number
        ) => {
          if (!passageRef.current || !noteRef.current) return;

          gsap.fromTo(
            passageRef.current,
            { opacity: 0.45, backgroundColor: "transparent" },
            {
              opacity: 1,
              backgroundColor: "currentColor",
              duration: 0.6,
              scrollTrigger: {
                trigger: passageRef.current,
                start: "top 75%",
                end: "bottom 45%",
                toggleActions: "play reverse play reverse",
              },
            }
          );

          gsap.fromTo(
            noteRef.current,
            { opacity: 0, x: 20 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              delay,
              scrollTrigger: {
                trigger: passageRef.current,
                start: "top 75%",
                end: "bottom 45%",
                toggleActions: "play reverse play reverse",
              },
            }
          );
        };

        setupDriftItem(driftPassage1Ref, driftNote1Ref, 0.05);
        setupDriftItem(driftPassage2Ref, driftNote2Ref, 0.1);
        setupDriftItem(driftPassage3Ref, driftNote3Ref, 0.15);
        setupDriftItem(driftPassage4Ref, driftNote4Ref, 0.2);

        // Steps sequence
        if (stepsContainerRef.current) {
          const stepCards =
            stepsContainerRef.current.querySelectorAll(".step-card");
          gsap.from(stepCards, {
            opacity: 0,
            y: 24,
            duration: 0.7,
            stagger: 0.15,
            scrollTrigger: {
              trigger: stepsContainerRef.current,
              start: "top 70%",
            },
          });
        }
      });

      return () => {
        ctx.revert();
        if (tickerCallback) {
          gsap.ticker.remove(tickerCallback);
        }
        if (lenis) {
          lenis.destroy();
        }
        ScrollTrigger.getAll().forEach((t) => t.kill());
      };
    }

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent-soft selection:text-ink">
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL HEADER & NAVIGATION
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-sm border-b border-rule">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
              aria-label="BrandProof Home"
            >
              <div className="w-7 h-7 rounded-none bg-ink text-paper flex items-center justify-center font-serif text-sm font-bold tracking-tight">
                BP
              </div>
              <span className="font-serif text-xl font-medium tracking-tight text-ink group-hover:text-accent transition-colors">
                BrandProof
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border border-rule font-mono text-[10px] text-ink-faint tracking-wider uppercase bg-paper-raised">
              Governance Desk
            </span>
          </div>

          <nav
            aria-label="Page Sections"
            className="hidden md:flex items-center gap-6 text-xs font-mono tracking-wide uppercase text-ink-soft"
          >
            <a
              href="#the-drift"
              className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              The Drift
            </a>
            <a
              href="#how-it-works"
              className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              How It Works
            </a>
            <a
              href="#principles"
              className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              Principles
            </a>
            <a
              href="#roles"
              className="hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink"
            >
              Roles
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-mono uppercase tracking-wider text-ink-soft hover:text-ink px-3 py-1.5 rounded-sm transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-accent text-paper hover:bg-accent/90 font-mono text-xs uppercase tracking-wider font-medium transition-colors shadow-hairline"
            >
              <span>Demo Workspace</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ─────────────────────────────────────────────────────────────
            2. HERO SECTION: "Publish with proof."
            ───────────────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-rule overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-6">
              <div className="hero-fade inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent font-semibold">
                <span className="w-2 h-2 bg-accent rounded-none" />
                <span>Pre-Publication Brand Governance</span>
              </div>

              <h1
                id="hero-heading"
                className="hero-fade font-serif text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight text-ink leading-[1.04]"
              >
                Publish with proof.
              </h1>

              <p className="hero-fade font-sans text-lg md:text-xl text-ink-soft leading-relaxed max-w-2xl">
                A pre-publication brand check that cites its sources and leaves
                the decision to people.
              </p>

              <div className="hero-fade flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/reviews"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-ink text-paper hover:bg-ink-soft font-mono text-xs uppercase tracking-wider font-medium transition-colors shadow-raised"
                >
                  <span>Try the demo workspace</span>
                  <ArrowRight className="w-4 h-4 stroke-[1.5]" />
                </Link>

                <Link
                  href="/brand"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-sm bg-paper-raised border border-rule hover:border-ink-soft font-mono text-xs uppercase tracking-wider text-ink transition-colors"
                >
                  <BookOpen className="w-4 h-4 stroke-[1.5] text-ink-soft" />
                  <span>Explore Brand Pack</span>
                </Link>
              </div>

              <div className="hero-fade flex items-center gap-6 pt-2 text-xs font-mono text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-moss stroke-[1.5]" />
                  Zero fake approvals
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-moss stroke-[1.5]" />
                  100% human-governed
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-moss stroke-[1.5]" />
                  Strict source citations
                </span>
              </div>
            </div>

            {/* Static Workspace Visual (Real Rendering, Not a Blob) */}
            <div className="hero-fade mt-14 pt-8 border-t border-rule/80">
              <div className="flex items-center justify-between pb-3 text-xs font-mono text-ink-faint">
                <span>ACTIVE WORKSPACE VIEW · PROOFREADER&apos;S DESK</span>
                <span className="hidden sm:inline">NEWSREADER TYPE SPECIMEN · DESKTOP SPLIT</span>
              </div>

              <div className="bg-paper-raised border border-rule shadow-raised rounded-sm overflow-hidden">
                {/* Visual Header Slip */}
                <div className="bg-paper border-b border-rule px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-semibold text-ink">
                      campaign-launch_q4-omnichannel.docx
                    </span>
                    <span className="text-ink-faint">· Revision v2</span>
                    <span className="px-2 py-0.5 rounded-sm bg-accent-soft text-accent border border-accent/20">
                      Channel: Marketing Web
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-ochre" />
                    <span className="text-ochre font-medium">needs_attention</span>
                    <span className="text-ink-faint">· 3 open findings</span>
                  </div>
                </div>

                {/* Split Workspace Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-rule">
                  {/* Draft Reading View (Center Zone) */}
                  <div className="lg:col-span-7 p-6 sm:p-8 space-y-6">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">
                      Draft Body Passage
                    </div>
                    <div className="font-serif text-lg leading-relaxed text-ink space-y-4 max-w-prose">
                      <p>
                        Introducing the Apex Pro Line, designed from the ground
                        up for mission-critical enterprise resilience. As the{" "}
                        <span className="annotation-wavy-critical bg-oxblood-tint/70 text-ink px-1 rounded-sm">
                          #1 AI-powered supply engine in North America
                        </span>
                        , our infrastructure is tested against 100,000 continuous
                        failover drills.
                      </p>
                      <p>
                        With real-time dynamic rerouting, customers achieve a{" "}
                        <span className="annotation-wavy-major bg-ochre-tint/70 text-ink px-1 rounded-sm">
                          guaranteed 40% reduction in logistical overhead
                        </span>
                        , ensuring zero supply-chain bottlenecks during peak
                        seasonal volume.
                      </p>
                      <p>
                        Switch today from legacy freight contracts to our{" "}
                        <span className="annotation-solid-minor bg-slate-tint/70 text-ink px-1 rounded-sm">
                          cheap starter tier
                        </span>{" "}
                        with frictionless one-click onboarding.
                      </p>
                    </div>
                  </div>

                  {/* Margin Notes View (Right Zone) */}
                  <div className="lg:col-span-5 p-5 sm:p-6 bg-paper/50 space-y-4">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-ink-faint flex items-center justify-between">
                      <span>Annotated Findings</span>
                      <span>3 Actionable Flags</span>
                    </div>

                    {/* Note 1: Critical Unsupported Claim */}
                    <div className="p-3.5 rounded-sm bg-paper-raised border border-oxblood/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-oxblood font-semibold">
                          CRITICAL · PROMOTIONAL CLAIM
                        </span>
                        <span className="text-ink-faint">LLM Lane</span>
                      </div>
                      <p className="text-xs font-sans text-ink leading-snug">
                        Superlative claim &ldquo;#1 AI-powered supply engine&rdquo; requires
                        verified third-party audit documentation. None on file.
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] bg-oxblood-tint text-oxblood border border-dashed border-oxblood/40">
                          <AlertCircle className="w-3 h-3 stroke-[1.5]" />
                          [Unverified · Human Judgement Required]
                        </span>
                      </div>
                    </div>

                    {/* Note 2: Major Fact Mismatch */}
                    <div className="p-3.5 rounded-sm bg-paper-raised border border-ochre/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-ochre font-semibold">
                          MAJOR · FACT MISMATCH
                        </span>
                        <span className="text-ink-faint">Rule Lane</span>
                      </div>
                      <p className="text-xs font-sans text-ink leading-snug">
                        Absolute guarantee &ldquo;guaranteed 40% reduction&rdquo; conflicts
                        with approved Q3 audited factsheet (max 28%).
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] bg-moss-tint text-moss border border-moss/30">
                          <BookOpen className="w-3 h-3 stroke-[1.5]" />
                          [S-008 · Financial Disclosures v2]
                        </span>
                      </div>
                    </div>

                    {/* Note 3: Minor Terminology */}
                    <div className="p-3.5 rounded-sm bg-paper-raised border border-slate/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate font-semibold">
                          MINOR · TERMINOLOGY
                        </span>
                        <span className="text-ink-faint">Rule Lane</span>
                      </div>
                      <p className="text-xs font-sans text-ink leading-snug">
                        Prohibited word &ldquo;cheap&rdquo;. Brand style guide mandates
                        &ldquo;accessible&rdquo; or &ldquo;starter&rdquo;.
                      </p>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[10px] bg-moss-tint text-moss border border-moss/30">
                          <BookOpen className="w-3 h-3 stroke-[1.5]" />
                          [S-004 · Terminology Registry]
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            3. THE DRIFT (Interactive Scroll-Scrub Markup)
            ───────────────────────────────────────────────────────────── */}
        <section
          id="the-drift"
          ref={driftSectionRef}
          aria-labelledby="drift-heading"
          className="py-20 md:py-28 border-b border-rule bg-paper"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column: Narrative Explanation */}
              <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-oxblood font-semibold">
                  <span className="w-2 h-2 bg-oxblood rounded-none" />
                  <span>The Governance Failure Mode</span>
                </div>

                <h2
                  id="drift-heading"
                  className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-ink leading-tight"
                >
                  The drift happens one draft at a time.
                </h2>

                <p className="font-sans text-sm md:text-base text-ink-soft leading-relaxed">
                  Brand standards don&apos;t shatter overnight—they erode in
                  micro-revisions. A marketer quotes last year&apos;s
                  un-updated metric. A copywriter injects an unverified
                  superlative. An agency slips an off-brand urgency phrase into
                  an email blast.
                </p>

                <p className="font-sans text-sm text-ink-soft leading-relaxed">
                  Without automated pre-publication checks, these errors slip
                  past tired human reviewers and solidify into published
                  precedent.
                </p>

                <div className="p-4 rounded-sm bg-paper-raised border border-rule space-y-2">
                  <div className="font-mono text-xs uppercase tracking-wider text-ink font-semibold">
                    The Proofreader&apos;s Law
                  </div>
                  <p className="font-sans text-xs text-ink-soft leading-relaxed">
                    &ldquo;A clean automated scan NEVER equals approval.
                    Deterministic rules audit the exact; LLM analysis audits the
                    nuance; people decide the risk.&rdquo;
                  </p>
                </div>
              </div>

              {/* Right Column: Live Markup Workspace */}
              <div className="lg:col-span-7 space-y-6">
                <div className="text-xs font-mono text-ink-faint flex items-center justify-between pb-2 border-b border-rule">
                  <span>LIVE MARKUP STORY · SCROLL TO SCRUB</span>
                  <span>4 COMMON DRIFT PATTERNS</span>
                </div>

                {/* Drift Item 1: Stale Fact */}
                <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-ochre font-semibold">
                      01 · STALE METRIC DRIFT
                    </span>
                    <span className="text-ink-faint">Fact Registry Check</span>
                  </div>
                  <p className="font-serif text-lg leading-relaxed text-ink">
                    &ldquo;Engineered with{" "}
                    <span
                      ref={driftPassage1Ref}
                      className="annotation-wavy-major px-1 bg-ochre-tint/70 text-ink transition-colors duration-200"
                    >
                      78% post-consumer recycled nylon
                    </span>
                    , reducing landfill emissions on every shipment.&rdquo;
                  </p>
                  <div
                    ref={driftNote1Ref}
                    className="p-3 rounded-sm bg-paper border border-ochre/30 flex items-start gap-3 transition-all"
                  >
                    <Clock className="w-4 h-4 text-ochre shrink-0 mt-0.5 stroke-[1.5]" />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-ochre">
                          [S-012 · Materials Factsheet]
                        </span>
                        <span className="text-ink-faint">Expired June 2024</span>
                      </div>
                      <p className="text-ink-soft">
                        Fact sheet v4 updated this metric to 84%. Active
                        version supercedes this draft value.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drift Item 2: Unsupported Superlative */}
                <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-oxblood font-semibold">
                      02 · UNSUPPORTED PROMOTIONAL CLAIM
                    </span>
                    <span className="text-ink-faint">Claims Policy Check</span>
                  </div>
                  <p className="font-serif text-lg leading-relaxed text-ink">
                    &ldquo;Our proprietary routing mesh is{" "}
                    <span
                      ref={driftPassage2Ref}
                      className="annotation-wavy-critical px-1 bg-oxblood-tint/70 text-ink transition-colors duration-200"
                    >
                      undeniably the world&apos;s most reliable cold-chain network
                    </span>
                    , outperforming all legacy logistics providers.&rdquo;
                  </p>
                  <div
                    ref={driftNote2Ref}
                    className="p-3 rounded-sm bg-paper border border-oxblood/30 flex items-start gap-3 transition-all"
                  >
                    <AlertCircle className="w-4 h-4 text-oxblood shrink-0 mt-0.5 stroke-[1.5]" />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-oxblood">
                          [Unverified · Claims Policy §1.4]
                        </span>
                        <span className="text-ink-faint">Evidence Missing</span>
                      </div>
                      <p className="text-ink-soft">
                        Superlative claim requires formal market research study
                        on file. Refuse to publish without human reviewer
                        sign-off.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drift Item 3: Off-Tone Urgency */}
                <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate font-semibold">
                      03 · TONE REGISTER VIOLATION
                    </span>
                    <span className="text-ink-faint">Editorial Voice Check</span>
                  </div>
                  <p className="font-serif text-lg leading-relaxed text-ink">
                    &ldquo;Seats are vanishing fast!{" "}
                    <span
                      ref={driftPassage3Ref}
                      className="annotation-dashed-advisory px-1 bg-slate-tint/70 text-ink transition-colors duration-200"
                    >
                      Don&apos;t walk, run to secure your contract before midnight!
                    </span>
                    &rdquo;
                  </p>
                  <div
                    ref={driftNote3Ref}
                    className="p-3 rounded-sm bg-paper border border-slate/30 flex items-start gap-3 transition-all"
                  >
                    <Scale className="w-4 h-4 text-slate shrink-0 mt-0.5 stroke-[1.5]" />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate">
                          [S-001 · Tone of Voice Guide §3]
                        </span>
                        <span className="text-ink-faint">Advisory Register</span>
                      </div>
                      <p className="text-ink-soft">
                        High-pressure urgency violates the calm, authoritative
                        editorial stance. Suggested rewrite preserves urgency
                        without breathless marketing tropes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Drift Item 4: Prohibited Vocabulary */}
                <div className="p-6 rounded-sm bg-paper-raised border border-rule space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-oxblood font-semibold">
                      04 · PROHIBITED BRAND TERM
                    </span>
                    <span className="text-ink-faint">Vocabulary Dictionary</span>
                  </div>
                  <p className="font-serif text-lg leading-relaxed text-ink">
                    &ldquo;Positioned as a{" "}
                    <span
                      ref={driftPassage4Ref}
                      className="line-through decoration-oxblood decoration-2 text-oxblood px-1 transition-colors duration-200"
                    >
                      cheap alternative
                    </span>{" "}
                    to legacy enterprise software suites.&rdquo;
                  </p>
                  <div
                    ref={driftNote4Ref}
                    className="p-3 rounded-sm bg-paper border border-oxblood/30 flex items-start gap-3 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-moss shrink-0 mt-0.5 stroke-[1.5]" />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-oxblood">
                          [S-004 · Terminology Registry]
                        </span>
                        <span className="text-moss font-medium">
                          Replacement Available
                        </span>
                      </div>
                      <p className="text-ink-soft">
                        &lsquo;Cheap&rsquo; is strictly prohibited. Mandatory
                        replacement: &lsquo;accessible&rsquo; or
                        &lsquo;streamlined&rsquo;.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            4. HOW IT WORKS: 4 STEPS PINNED/STRUCTURED FLOW
            ───────────────────────────────────────────────────────────── */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="py-20 md:py-28 border-b border-rule bg-paper-raised"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                <span className="w-2 h-2 bg-accent rounded-none" />
                <span>The Architecture</span>
              </div>
              <h2
                id="how-it-works-heading"
                className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-ink"
              >
                Four steps from draft to signed approval.
              </h2>
              <p className="font-sans text-base text-ink-soft leading-relaxed">
                BrandProof replaces scattered PDF style-guides and fuzzy AI
                summaries with an auditable, deterministic-first governance
                pipeline.
              </p>
            </div>

            <div
              ref={stepsContainerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {/* Step 1 */}
              <div className="step-card p-6 rounded-sm bg-paper border border-rule space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent px-2 py-0.5 rounded-sm bg-accent-soft">
                      STEP 01
                    </span>
                    <BookOpen className="w-4 h-4 text-ink-faint stroke-[1.5]" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-ink">
                    Approved Sources
                  </h3>
                  <p className="font-sans text-xs text-ink-soft leading-relaxed">
                    Build a controlled Brand Pack: sequential immutable keys
                    (S-001...), version history, facts with expiry dates, and
                    prohibited term registries. The knowledge base is the sole
                    authority.
                  </p>
                </div>
                <div className="pt-4 border-t border-rule font-mono text-[11px] text-ink-faint">
                  Knowledge Base Authority
                </div>
              </div>

              {/* Step 2 */}
              <div className="step-card p-6 rounded-sm bg-paper border border-rule space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-ochre px-2 py-0.5 rounded-sm bg-ochre-tint">
                      STEP 02
                    </span>
                    <Cpu className="w-4 h-4 text-ink-faint stroke-[1.5]" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-ink">
                    Two-Lane Checks
                  </h3>
                  <p className="font-sans text-xs text-ink-soft leading-relaxed">
                    Deterministic regex rules handle exact prohibited terms,
                    required disclaimers, and expired dates. Retrieved-context
                    LLM analysis audits voice, implied claims, and nuance.
                  </p>
                </div>
                <div className="pt-4 border-t border-rule font-mono text-[11px] text-ink-faint">
                  Deterministic + Advisory AI
                </div>
              </div>

              {/* Step 3 */}
              <div className="step-card p-6 rounded-sm bg-paper border border-rule space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-moss px-2 py-0.5 rounded-sm bg-moss-tint">
                      STEP 03
                    </span>
                    <Layers className="w-4 h-4 text-ink-faint stroke-[1.5]" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-ink">
                    Explained Findings
                  </h3>
                  <p className="font-sans text-xs text-ink-soft leading-relaxed">
                    Original text is never silently overwritten. Every flag
                    shows an exact source excerpt or explicit &lsquo;unverified&rsquo; label.
                    Creators accept diffs, edit, or dismiss with a written reason.
                  </p>
                </div>
                <div className="pt-4 border-t border-rule font-mono text-[11px] text-ink-faint">
                  Non-Destructive Diffs
                </div>
              </div>

              {/* Step 4 */}
              <div className="step-card p-6 rounded-sm bg-paper border border-rule space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-oxblood px-2 py-0.5 rounded-sm bg-oxblood-tint">
                      STEP 04
                    </span>
                    <ShieldCheck className="w-4 h-4 text-ink-faint stroke-[1.5]" />
                  </div>
                  <h3 className="font-serif text-xl font-medium text-ink">
                    Human Decision
                  </h3>
                  <p className="font-sans text-xs text-ink-soft leading-relaxed">
                    A clean scan is never an approval. Reviewers inspect
                    unresolved findings, audit creator dismissal reasons, and
                    record signed approval or rejection reasons into the audit
                    ledger.
                  </p>
                </div>
                <div className="pt-4 border-t border-rule font-mono text-[11px] text-ink-faint">
                  Mandatory Human Sign-off
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            5. GOVERNANCE PRINCIPLES & EVIDENCE CHIP SHOWCASE
            ───────────────────────────────────────────────────────────── */}
        <section
          id="principles"
          aria-labelledby="principles-heading"
          className="py-20 md:py-28 border-b border-rule bg-paper"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                  <span className="w-2 h-2 bg-accent rounded-none" />
                  <span>The Fundamental Law</span>
                </div>

                <h2
                  id="principles-heading"
                  className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-ink leading-tight"
                >
                  &ldquo;AI is advisory. Sources are the authority. Humans
                  decide.&rdquo;
                </h2>

                <p className="font-sans text-base text-ink-soft leading-relaxed">
                  Most AI tools hallucinate brand authority by guessing whether a
                  claim sounds plausible. BrandProof adheres to strict evidentiary
                  boundaries: if a claim has no documented source in the
                  knowledge base, it is labelled &ldquo;unverified&rdquo; and
                  refuses to invent support.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-moss shrink-0 mt-1 stroke-[1.5]" />
                    <p className="text-xs text-ink leading-relaxed">
                      <strong className="font-medium text-ink">
                        Evidence-First Citations:
                      </strong>{" "}
                      Every high-severity flag anchors to an existing source ID
                      in your workspace.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-moss shrink-0 mt-1 stroke-[1.5]" />
                    <p className="text-xs text-ink leading-relaxed">
                      <strong className="font-medium text-ink">
                        Prompt-Injection Defense:
                      </strong>{" "}
                      Uploaded copy is treated strictly as untrusted data, never as
                      LLM system instructions.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-moss shrink-0 mt-1 stroke-[1.5]" />
                    <p className="text-xs text-ink leading-relaxed">
                      <strong className="font-medium text-ink">
                        No Silent Rewrites:
                      </strong>{" "}
                      Your creative team keeps ownership. All suggestions are
                      presented as reviewable diffs.
                    </p>
                  </div>
                </div>
              </div>

              {/* Evidence Chip Demonstrator */}
              <div className="lg:col-span-6">
                <div className="bg-paper-raised border border-rule rounded-sm p-6 sm:p-8 space-y-6 shadow-hairline">
                  <div className="flex items-center justify-between border-b border-rule pb-4">
                    <span className="font-mono text-xs text-ink font-semibold uppercase tracking-wider">
                      Interactive Evidence Inspector
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveEvidenceTab("verified")}
                        className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors cursor-pointer ${
                          activeEvidenceTab === "verified"
                            ? "bg-moss text-paper"
                            : "bg-paper border border-rule text-ink-soft hover:text-ink"
                        }`}
                      >
                        Verified Source
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveEvidenceTab("unverified")}
                        className={`px-3 py-1 text-xs font-mono rounded-sm transition-colors cursor-pointer ${
                          activeEvidenceTab === "unverified"
                            ? "bg-oxblood text-paper"
                            : "bg-paper border border-rule text-ink-soft hover:text-ink"
                        }`}
                      >
                        Unverified Claim
                      </button>
                    </div>
                  </div>

                  {activeEvidenceTab === "verified" ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-moss-tint border border-moss/40 rounded-sm">
                        <div className="flex items-center gap-2 font-mono text-xs text-moss font-semibold">
                          <BookOpen className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>[S-002 · Claims Policy v3 §4.1]</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                          Authoritative Ground Truth Excerpt
                        </span>
                        <blockquote className="p-3 bg-paper border-l-2 border-moss text-xs font-serif text-ink italic leading-relaxed">
                          &ldquo;Any comparative efficiency claim exceeding 25%
                          must cite our audited third-party logistics benchmark
                          (ISO-9001 certified, conducted Q3 2024).&rdquo;
                        </blockquote>
                      </div>
                      <div className="pt-2 text-xs font-sans text-ink-soft leading-relaxed">
                        <strong className="text-ink">System Verdict:</strong>{" "}
                        The claim is verified against active brand sources. A
                        direct citation link is preserved in the review history
                        for legal auditability.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-oxblood-tint border border-dashed border-oxblood/50 rounded-sm">
                        <div className="flex items-center gap-2 font-mono text-xs text-oxblood font-semibold">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[1.5]" />
                          <span>[Unverified · Needs Human Judgement]</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                          Absence of Supporting Documentation
                        </span>
                        <div className="p-3 bg-paper border-l-2 border-oxblood text-xs font-sans text-ink leading-relaxed">
                          &ldquo;No approved guideline, factsheet, or policy in
                          the Brand Pack supports or contradicts this claim. The
                          AI will not invent a rationale.&rdquo;
                        </div>
                      </div>
                      <div className="pt-2 text-xs font-sans text-ink-soft leading-relaxed">
                        <strong className="text-ink">System Verdict:</strong>{" "}
                        Flagged for designated human reviewer sign-off. The creator
                        must either provide external proof or accept a moderated
                        claim before release.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            6. BUILT FOR THREE STAKEHOLDERS (Three Columns)
            ───────────────────────────────────────────────────────────── */}
        <section
          id="roles"
          aria-labelledby="roles-heading"
          className="py-20 md:py-28 border-b border-rule bg-paper-raised"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold">
                <span className="w-2 h-2 bg-accent rounded-none" />
                <span>Tailored Workflows</span>
              </div>
              <h2
                id="roles-heading"
                className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-ink"
              >
                Engineered for the full governance lifecycle.
              </h2>
              <p className="font-sans text-base text-ink-soft leading-relaxed">
                Whether you&apos;re drafting campaign copy, clearing legal risks,
                or managing brand identity at scale, BrandProof provides purpose-built
                clarity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Column 1: Creators */}
              <div className="p-6 rounded-sm bg-paper border border-rule space-y-4">
                <div className="w-9 h-9 rounded-sm bg-accent-soft text-accent flex items-center justify-center font-mono text-xs font-bold border border-accent/20">
                  <FileText className="w-4 h-4 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-xl font-medium text-ink">
                  For Creators &amp; Writers
                </h3>
                <p className="font-sans text-xs text-ink-soft leading-relaxed">
                  Draft with confidence rather than fear of legal rejection. Run
                  pre-flight checks before submitting, view transparent rule
                  citations, and review purpose-preserving replacement diffs.
                </p>
                <ul className="pt-4 border-t border-rule space-y-2 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                    Instant pre-submission scan
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                    Non-destructive diff acceptance
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                    Written dismissal justifications
                  </li>
                </ul>
              </div>

              {/* Column 2: Reviewers */}
              <div className="p-6 rounded-sm bg-paper border border-rule space-y-4">
                <div className="w-9 h-9 rounded-sm bg-ochre-tint text-ochre flex items-center justify-center font-mono text-xs font-bold border border-ochre/20">
                  <ShieldCheck className="w-4 h-4 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-xl font-medium text-ink">
                  For Designated Reviewers
                </h3>
                <p className="font-sans text-xs text-ink-soft leading-relaxed">
                  Eliminate review fatigue. The triage queue prioritizes drafts
                  by highest open risk, displays creator dismissal reasons, and
                  enforces mandatory written reasons on changes or rejections.
                </p>
                <ul className="pt-4 border-t border-rule space-y-2 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-ochre stroke-[1.5]" />
                    Prioritized queue by severity
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-ochre stroke-[1.5]" />
                    Dismissal &amp; unverified audits
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-ochre stroke-[1.5]" />
                    Signed approval and rejection logs
                  </li>
                </ul>
              </div>

              {/* Column 3: Brand Owners */}
              <div className="p-6 rounded-sm bg-paper border border-rule space-y-4">
                <div className="w-9 h-9 rounded-sm bg-moss-tint text-moss flex items-center justify-center font-mono text-xs font-bold border border-moss/20">
                  <Scale className="w-4 h-4 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-xl font-medium text-ink">
                  For Brand Owners &amp; Legal
                </h3>
                <p className="font-sans text-xs text-ink-soft leading-relaxed">
                  Maintain single-source-of-truth guidelines with immutable
                  versioning. The Insights dashboard shows policy recurrence,
                  stale guidelines, and rules that creators trip over most.
                </p>
                <ul className="pt-4 border-t border-rule space-y-2 text-xs text-ink-soft">
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-moss stroke-[1.5]" />
                    Sequential immutable source keys
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-moss stroke-[1.5]" />
                    Real-time policy recurrence analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-moss stroke-[1.5]" />
                    Auditable compliance history
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            7. CALL TO ACTION (CTA)
            ───────────────────────────────────────────────────────────── */}
        <section
          aria-labelledby="cta-heading"
          className="py-20 md:py-28 bg-paper"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-accent font-semibold">
              <span className="w-2 h-2 bg-accent rounded-none" />
              <span>Ready for Review</span>
            </div>

            <h2
              id="cta-heading"
              className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-ink"
            >
              Stop brand drift before publication.
            </h2>

            <p className="font-sans text-base sm:text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
              Explore the live demo workspace with pre-loaded guidelines,
              sample drafts, two-lane verification, and audited human approvals.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                href="/reviews"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-ink text-paper hover:bg-ink-soft font-mono text-xs uppercase tracking-wider font-medium transition-colors shadow-raised"
              >
                <span>Launch Demo Workspace</span>
                <ArrowRight className="w-4 h-4 stroke-[1.5]" />
              </Link>

              <Link
                href="/reviews/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-paper-raised border border-rule hover:border-ink-soft font-mono text-xs uppercase tracking-wider text-ink transition-colors"
              >
                <FileText className="w-4 h-4 stroke-[1.5] text-ink-soft" />
                <span>Submit a Draft Copy</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          8. EDITORIAL FOOTER & MANDATORY AI DISCLOSURE
          ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-rule bg-paper-raised text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-rule">
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-none bg-ink text-paper flex items-center justify-center font-serif text-xs font-bold">
                  BP
                </div>
                <span className="font-serif text-lg font-medium tracking-tight text-ink">
                  BrandProof
                </span>
              </div>
              <p className="font-sans text-xs text-ink-soft leading-relaxed">
                Pre-publication brand governance workspace. Controlled knowledge
                bases, two-lane verification, and audited human approvals.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink font-semibold">
                Workspace
              </div>
              <ul className="space-y-1.5 font-sans text-ink-soft">
                <li>
                  <Link href="/reviews" className="hover:text-ink transition-colors">
                    Review Desk
                  </Link>
                </li>
                <li>
                  <Link href="/reviews/new" className="hover:text-ink transition-colors">
                    Submit Draft
                  </Link>
                </li>
                <li>
                  <Link href="/queue" className="hover:text-ink transition-colors">
                    Reviewer Queue
                  </Link>
                </li>
                <li>
                  <Link href="/insights" className="hover:text-ink transition-colors">
                    Policy Insights
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink font-semibold">
                Brand Pack
              </div>
              <ul className="space-y-1.5 font-sans text-ink-soft">
                <li>
                  <Link href="/brand" className="hover:text-ink transition-colors">
                    Overview &amp; Freshness
                  </Link>
                </li>
                <li>
                  <Link href="/brand/sources" className="hover:text-ink transition-colors">
                    Source Registry
                  </Link>
                </li>
                <li>
                  <Link href="/brand/terms" className="hover:text-ink transition-colors">
                    Terminology Rules
                  </Link>
                </li>
                <li>
                  <Link href="/brand/facts" className="hover:text-ink transition-colors">
                    Audited Fact Sheet
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-ink font-semibold">
                Access &amp; Security
              </div>
              <ul className="space-y-1.5 font-sans text-ink-soft">
                <li>
                  <Link href="/login" className="hover:text-ink transition-colors">
                    Workspace Sign In
                  </Link>
                </li>
                <li>
                  <span className="text-ink-faint">Role-Based Access (Admin/Reviewer/Creator)</span>
                </li>
                <li>
                  <span className="text-ink-faint">Private Supabase Storage</span>
                </li>
                <li>
                  <span className="text-ink-faint">Row-Level Security Active</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Mandatory AI-Use Disclosure */}
          <div className="pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-ink-faint font-mono text-[11px]">
            <p className="max-w-3xl leading-relaxed">
              <strong className="text-ink font-medium">AI Governance Disclosure:</strong>{" "}
              Analysis uses an external LLM provider; only the minimum text is
              sent. Uploaded documents are treated as untrusted data and never
              used for training.
            </p>
            <div className="shrink-0 text-right">
              &copy; {new Date().getFullYear()} BrandProof · Inkloom Brand Governance
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
