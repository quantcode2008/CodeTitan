"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck2,
  BookOpen,
  BarChart2,
  Settings,
  Palette,
  Sun,
  Moon,
  Shield,
  User,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  currentRole?: "admin" | "creator" | "reviewer";
}

/**
 * Editorial App Shell for BrandProof.
 * Slim left rail with workspace switcher, Brand Pack, Reviews, and Audit trails.
 */
export function AppShell({
  children,
  breadcrumb = [
    { label: "Inkloom Governance", href: "/" },
    { label: "Workspace" },
  ],
  currentRole = "reviewer",
}: AppShellProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = React.useState(false);

  // Initialize theme from DOM or system
  React.useEffect(() => {
    const isDarkTheme = document.documentElement.classList.contains("dark");
    setIsDark(isDarkTheme);
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const navItems = [
    { label: "Reviews", href: "/", icon: FileCheck2 },
    { label: "Brand Pack", href: "/brand-pack", icon: BookOpen },
    { label: "Insights", href: "/insights", icon: BarChart2 },
    { label: "Design System", href: "/design", icon: Palette },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-row font-sans selection:bg-accent-soft selection:text-ink">
      {/* Slim Left Navigation Rail (56px) */}
      <aside
        aria-label="Workspace sidebar"
        className="w-14 shrink-0 bg-paper-sunken border-r border-rule flex flex-col items-center justify-between py-3 z-30 select-none"
      >
        {/* Top: Logo & Nav items */}
        <div className="flex flex-col items-center space-y-4">
          {/* Workspace Monogram */}
          <Link
            href="/"
            className="w-9 h-9 rounded-sm bg-accent text-paper font-serif font-bold text-base flex items-center justify-center hover:opacity-90 transition-opacity border border-accent/20"
            title="BrandProof Governance"
          >
            BP
          </Link>

          <div className="w-6 h-[1px] bg-rule my-1" aria-hidden="true" />

          {/* Nav Icons */}
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "w-9 h-9 rounded-sm flex items-center justify-center transition-colors duration-150 relative group cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink",
                    isActive
                      ? "bg-paper text-accent font-semibold border border-rule shadow-hairline"
                      : "text-ink-soft hover:text-ink hover:bg-paper/50"
                  )}
                >
                  <Icon className="w-4 h-4 stroke-[1.5]" />
                  {isActive && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-accent rounded-r-none"
                      aria-hidden="true"
                    />
                  )}
                  {/* Tooltip on hover */}
                  <span className="absolute left-12 px-2 py-1 bg-ink text-paper text-[11px] font-sans font-medium rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-raised">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Theme Toggle & User Avatar */}
        <div className="flex flex-col items-center space-y-2">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDark ? "Switch to Light Desk" : "Switch to Night Desk"}
            title={isDark ? "Light Desk (#F6F3EC)" : "Night Desk (#14130F)"}
            className="w-9 h-9 rounded-sm text-ink-soft hover:text-ink hover:bg-paper flex items-center justify-center transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 stroke-[1.5] text-ochre" />
            ) : (
              <Moon className="w-4 h-4 stroke-[1.5] text-slate" />
            )}
          </button>

          <div
            title={`Signed in as ${currentRole}`}
            className="w-8 h-8 rounded-sm bg-paper-raised border border-rule flex items-center justify-center text-xs font-mono font-medium text-ink-soft"
          >
            <User className="w-4 h-4 stroke-[1.5]" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-12 border-b border-rule bg-paper-raised/70 px-6 flex items-center justify-between shrink-0 select-none">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumbs" className="flex items-center space-x-2 text-xs font-sans">
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {idx > 0 && (
                  <ChevronRight className="w-3 h-3 text-ink-faint stroke-[1.5]" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-ink-soft hover:text-ink transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink font-medium">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Right Meta: Role Badge & Governance Indicator */}
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule font-mono text-[10px] uppercase text-ink-soft">
              <Shield className="w-3 h-3 text-accent stroke-[1.5]" />
              Role: <strong className="text-ink">{currentRole}</strong>
            </span>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

