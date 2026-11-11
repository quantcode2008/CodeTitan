"use client";

import * as React from "react";
import { BookOpen, ExternalLink, X, ShieldCheck, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BrandSourcePreview {
  id: string;
  source_key: string;
  title: string;
  type: string;
  body: string;
  version: number;
  owner_id?: string;
  status: string;
}

export interface SourceDrawerProps {
  source: BrandSourcePreview | null;
  isOpen: boolean;
  onClose: () => void;
  highlightPassage?: string;
}

export function SourceDrawer({
  source,
  isOpen,
  onClose,
  highlightPassage,
}: SourceDrawerProps) {
  if (!isOpen || !source) return null;

  // Highlight matched phrase if present in source content
  const renderSourceContent = () => {
    if (!highlightPassage || !source.body) {
      return (
        <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-ink">
          {source.body}
        </div>
      );
    }

    const regex = new RegExp(`(${highlightPassage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = source.body.split(regex);

    return (
      <div className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-ink">
        {parts.map((part, i) =>
          part.toLowerCase() === highlightPassage.toLowerCase() ? (
            <mark key={i} className="bg-ochre/25 text-ink font-semibold px-0.5 rounded-xs border-b border-ochre">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-xs flex justify-end">
      <div className="bg-paper-raised w-full max-w-xl h-full border-l border-rule shadow-xl flex flex-col font-sans text-xs animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 bg-paper border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent stroke-[1.75]" />
            <span className="font-mono text-xs uppercase tracking-wider font-semibold text-ink">
              Controlled Brand Source
            </span>
            <span className="font-mono text-xs px-2 py-0.5 bg-paper-sunken border border-rule rounded-sm text-accent font-semibold">
              {source.source_key}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-ink-soft hover:text-ink rounded-sm cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Source Metadata */}
        <div className="p-4 border-b border-rule bg-paper-sunken/40 space-y-2">
          <h2 className="font-serif text-base font-semibold text-ink leading-snug">
            {source.title}
          </h2>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-ink-soft">
            <span className="capitalize px-1.5 py-0.5 rounded-sm bg-paper border border-rule">
              Type: {source.type}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Version {source.version}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-moss" />
              Approved Authority
            </span>
          </div>
        </div>

        {/* Source Body (Newsreader Reading View) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-paper-raised">
          <div className="text-[11px] font-mono uppercase text-ink-soft tracking-wider">
            Approved Policy Text & Excerpt
          </div>
          <div className="p-4 bg-paper border border-rule rounded-sm shadow-hairline">
            {renderSourceContent()}
          </div>

          {highlightPassage && (
            <div className="p-3 bg-ochre/10 border border-ochre/30 rounded-sm text-[11px] text-ochre">
              <strong>Matched Passage Highlighted:</strong> Phrases matching the flagged draft text are highlighted above in yellow-ochre.
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-paper border-t border-rule flex items-center justify-between font-mono text-[11px] text-ink-soft">
          <span>Authority Source ID: {source.id.slice(0, 8)}...</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-paper-raised hover:bg-paper border border-rule rounded-sm text-ink cursor-pointer"
          >
            Close Source View
          </button>
        </div>
      </div>
    </div>
  );
}
