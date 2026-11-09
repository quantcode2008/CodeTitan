"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

/**
 * Editorial tab navigation.
 * Uses hairline rules and clean underlines instead of heavy pill bubbles.
 */
export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn("flex items-center space-x-6 border-b border-rule", className)}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative pb-2.5 pt-1 font-sans text-sm font-medium tracking-tight transition-colors duration-150 ease-out cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:rounded-sm",
              isActive ? "text-ink" : "text-ink-soft hover:text-ink"
            )}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-mono rounded-sm border",
                    isActive
                      ? "bg-accent-soft text-accent border-accent/20 font-semibold"
                      : "bg-paper-sunken text-ink-soft border-rule"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

