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
  ChevronDown,
  Building,
  Plus,
  LogOut,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceRole } from "@/lib/auth/types";
import { signOutAction } from "@/lib/actions/auth";

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
}

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  currentRole?: WorkspaceRole;
  isDesignatedReviewer?: boolean;
  userEmail?: string;
  userName?: string;
  workspaces?: WorkspaceItem[];
  activeWorkspaceId?: string;
}

/**
 * Editorial App Shell for BrandProof.
 * Slim left rail with role-aware navigation, workspace switcher, and audit indicators.
 */
export function AppShell({
  children,
  breadcrumb = [
    { label: "Inkloom Governance", href: "/" },
    { label: "Workspace" },
  ],
  currentRole = "reviewer",
  isDesignatedReviewer = false,
  userEmail,
  userName,
  workspaces = [
    {
      id: "b0000000-0000-0000-0000-000000000001",
      name: "Aster & Pine (Demo)",
      slug: "aster-and-pine",
      role: currentRole,
    },
  ],
  activeWorkspaceId = "b0000000-0000-0000-0000-000000000001",
}: AppShellProps) {
  const pathname = usePathname();
  const [isDark, setIsDark] = React.useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const activeWorkspace =
    workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0];

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

  // Role-Aware Navigation:
  // - creators: see drafts & read-only brand pack, no settings
  // - reviewers: see review queue, brand pack, insights, no settings
  // - admins: see full desk, brand pack, insights, settings & members
  const navItems = React.useMemo(() => {
    const items = [
      {
        label:
          currentRole === "reviewer"
            ? "Review Queue"
            : currentRole === "creator"
            ? "Drafts & Scans"
            : "Review Desk",
        href: "/",
        icon: FileCheck2,
      },
      {
        label:
          currentRole === "creator" ? "Brand Pack (Read-Only)" : "Brand Pack",
        href: "/brand",
        icon: BookOpen,
      },
      { label: "Insights", href: "/insights", icon: BarChart2 },
      { label: "Design System", href: "/design", icon: Palette },
    ];

    if (currentRole === "admin") {
      items.push({
        label: "Settings & Members",
        href: "/settings",
        icon: Settings,
      });
    }

    return items;
  }, [currentRole]);

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
        <div className="flex flex-col items-center space-y-2 relative">
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

          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            title={`Account: ${userName || userEmail || currentRole}`}
            className="w-8 h-8 rounded-sm bg-paper-raised border border-rule flex items-center justify-center text-xs font-mono font-medium text-ink-soft hover:text-ink hover:border-accent transition-all cursor-pointer"
          >
            <User className="w-4 h-4 stroke-[1.5]" />
          </button>

          {/* User Popover Menu */}
          {isUserMenuOpen && (
            <div
              className="absolute left-12 bottom-0 w-60 bg-paper-raised border border-rule rounded-sm p-3 shadow-raised z-50 space-y-3"
              onMouseLeave={() => setIsUserMenuOpen(false)}
            >
              <div className="border-b border-rule pb-2">
                <p className="text-xs font-medium text-ink truncate">
                  {userName || "Proofreader"}
                </p>
                <p className="text-[11px] font-mono text-ink-soft truncate">
                  {userEmail || "Authenticated"}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-accent-soft text-accent border border-accent/20 font-semibold">
                    {currentRole}
                  </span>
                  {isDesignatedReviewer && (
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded-sm bg-ochre-tint text-ochre border border-ochre/30 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-ochre" />
                      Designated
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-xs">
                {currentRole === "admin" && (
                  <Link
                    href="/settings"
                    className="block px-2 py-1.5 rounded-sm hover:bg-paper text-ink transition-colors font-sans"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Workspace Settings
                  </Link>
                )}
                <Link
                  href="/onboarding"
                  className="block px-2 py-1.5 rounded-sm hover:bg-paper text-ink transition-colors font-sans"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  Create / Join Workspace
                </Link>
              </div>

              <div className="border-t border-rule pt-2">
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs text-oxblood hover:bg-oxblood-tint/50 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 stroke-[1.5]" />
                    <span>Sign Out</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-12 border-b border-rule bg-paper-raised/70 px-6 flex items-center justify-between shrink-0 select-none">
          {/* Left: Breadcrumbs & Workspace Switcher */}
          <div className="flex items-center space-x-3">
            {/* Workspace Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-paper border border-rule hover:border-accent font-sans text-xs text-ink transition-all cursor-pointer"
              >
                <Building className="w-3.5 h-3.5 text-accent stroke-[1.5]" />
                <span className="font-medium max-w-[140px] sm:max-w-[180px] truncate">
                  {activeWorkspace?.name || "Workspace"}
                </span>
                <ChevronDown className="w-3 h-3 text-ink-soft ml-0.5" />
              </button>

              {/* Workspace Switcher Dropdown */}
              {isWorkspaceOpen && (
                <div
                  className="absolute left-0 top-full mt-1.5 w-64 bg-paper-raised border border-rule rounded-sm p-2 shadow-raised z-50 space-y-2"
                  onMouseLeave={() => setIsWorkspaceOpen(false)}
                >
                  <div className="px-2 py-1 text-[10px] font-mono text-ink-soft uppercase tracking-wider border-b border-rule pb-1.5">
                    Your Workspaces
                  </div>

                  <div className="space-y-1">
                    {workspaces.map((ws) => (
                      <Link
                        key={ws.id}
                        href="/"
                        onClick={() => setIsWorkspaceOpen(false)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-sm text-xs transition-colors",
                          ws.id === activeWorkspaceId
                            ? "bg-accent-soft text-accent font-medium border border-accent/20"
                            : "hover:bg-paper text-ink"
                        )}
                      >
                        <div className="truncate">
                          <div>{ws.name}</div>
                          <div className="text-[10px] font-mono text-ink-soft">
                            slug: {ws.slug}
                          </div>
                        </div>
                        <span className="font-mono text-[9px] uppercase px-1 rounded-sm bg-paper-sunken border border-rule text-ink-soft">
                          {ws.role}
                        </span>
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-rule pt-1.5">
                    <Link
                      href="/onboarding"
                      onClick={() => setIsWorkspaceOpen(false)}
                      className="flex items-center gap-1.5 p-2 rounded-sm text-xs text-accent hover:bg-paper transition-colors font-mono"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
                      <span>Create or Join Workspace</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <span className="text-rule font-serif">/</span>

            {/* Breadcrumbs */}
            <nav
              aria-label="Breadcrumbs"
              className="hidden sm:flex items-center space-x-2 text-xs font-sans"
            >
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
          </div>

          {/* Right Meta: Role Badge & Sign In / Out */}
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-paper-sunken border border-rule font-mono text-[10px] uppercase text-ink-soft">
              <Shield className="w-3 h-3 text-accent stroke-[1.5]" />
              Role: <strong className="text-ink">{currentRole}</strong>
              {isDesignatedReviewer && (
                <span className="text-ochre font-semibold">(Designated)</span>
              )}
            </span>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
