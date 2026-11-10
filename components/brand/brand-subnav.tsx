"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  SpellCheck,
  ShieldAlert,
  Image,
  UploadCloud,
  Layers,
} from "lucide-react";
import { WorkspaceRole } from "@/lib/auth/types";

export interface BrandSubNavProps {
  currentRole: WorkspaceRole;
  counts?: {
    sources?: number;
    terms?: number;
    facts?: number;
    assets?: number;
  };
}

export function BrandSubNav({ currentRole, counts }: BrandSubNavProps) {
  const pathname = usePathname();
  const isAdmin = currentRole === "admin";

  const tabs = [
    {
      label: "Overview",
      href: "/brand",
      icon: Layers,
      exact: true,
    },
    {
      label: "Sources & Policies",
      href: "/brand/sources",
      icon: FileText,
      badge: counts?.sources,
    },
    {
      label: "Terminology",
      href: "/brand/terms",
      icon: SpellCheck,
      badge: counts?.terms,
    },
    {
      label: "Certified Facts",
      href: "/brand/facts",
      icon: ShieldAlert,
      badge: counts?.facts,
    },
    {
      label: "Brand Assets",
      href: "/brand/assets",
      icon: Image,
      badge: counts?.assets,
    },
    ...(isAdmin
      ? [
          {
            label: "Import Guidelines",
            href: "/brand/import",
            icon: UploadCloud,
          },
        ]
      : []),
  ];

  return (
    <div className="border-b border-rule bg-paper-raised/40 px-6 select-none">
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-mono transition-colors border-b-2 -mb-[5px] whitespace-nowrap cursor-pointer",
                isActive
                  ? "border-accent text-accent font-semibold bg-paper"
                  : "border-transparent text-ink-soft hover:text-ink hover:bg-paper/50"
              )}
            >
              <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-sm bg-paper-sunken border border-rule text-ink-soft">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
