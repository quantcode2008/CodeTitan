import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";
import { RetrievedContext } from "./types";

/**
 * Extracts key phrases, noun phrases, numbers, and superlatives from the draft text
 * to query the full-text search index of brand guidelines.
 */
export function extractSearchPhrases(draftText: string): string[] {
  if (!draftText || !draftText.trim()) return [];

  const phrases = new Set<string>();

  // 1. Numbers, percentages, years, time windows (e.g., "78%", "2026", "25-Year", "72-hour")
  const numbersAndStats = draftText.match(/\b\d+(?:[.,]\d+)?%?|\b\d+-(?:year|hour|day|month)\b/gi);
  if (numbersAndStats) {
    numbersAndStats.forEach((n) => phrases.add(n.toLowerCase()));
  }

  // 2. Promotional claim keywords & superlatives
  const superlatives = draftText.match(/\b(#1|undisputed|best|guaranteed|miracle|revolutionary|sustainable|recycled|warranty|eternity|forever|eco|ocean|waterproof|durability)\b/gi);
  if (superlatives) {
    superlatives.forEach((s) => phrases.add(s.toLowerCase()));
  }

  // 3. Capitalized noun phrases / product names (e.g., "SummitX Expedition", "TrailLite Alpine", "Aster & Pine")
  const properNouns = draftText.match(/\b[A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)*\b/g);
  if (properNouns) {
    properNouns.forEach((p) => {
      // Ignore common English sentence starters
      const lower = p.toLowerCase();
      if (!["the", "when", "with", "good", "order", "every", "all", "this"].includes(lower)) {
        phrases.add(p);
      }
    });
  }

  return Array.from(phrases).slice(0, 10);
}

/**
 * Retrieves trusted context for a draft:
 * 1. Executes search_sources RPC using extracted key phrases
 * 2. Always includes core governance policies (tone guide, claims policy, terminology)
 * 3. Caps context size to avoid context pollution and latency
 */
export async function retrieveTrustedContext(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  draftText: string,
  maxContextSources = 8
): Promise<RetrievedContext[]> {
  const resultSources = new Map<string, RetrievedContext>();

  // 1. Always fetch core policy sources (tone guide, claims policy, terminology)
  const { data: coreSources, error: coreErr } = await supabase
    .from("brand_sources")
    .select("id, source_key, title, body, type, current_version")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .in("type", ["tone_example", "claim_policy", "terminology"]);

  if (!coreErr && coreSources) {
    for (const src of coreSources) {
      resultSources.set(src.id, {
        source_id: src.id,
        source_key: src.source_key,
        title: src.title,
        excerpt: src.body.slice(0, 600), // Cap excerpt
        type: src.type,
        current_version: src.current_version,
      });
    }
  }

  // 2. Search for relevant sources using extracted phrases
  const phrases = extractSearchPhrases(draftText);
  if (phrases.length > 0) {
    const query = phrases.join(" OR ");

    try {
      const { data: searchResults, error: rpcErr } = await supabase.rpc(
        "search_sources",
        {
          lookup_workspace_id: workspaceId,
          query_text: query,
          result_limit: 6,
        }
      );

      if (!rpcErr && searchResults && searchResults.length > 0) {
        // Fetch full source body / version for search results if not already present
        const neededIds = searchResults
          .map((r) => r.source_id)
          .filter((id) => !resultSources.has(id));

        if (neededIds.length > 0) {
          const { data: extraSources } = await supabase
            .from("brand_sources")
            .select("id, source_key, title, body, type, current_version")
            .in("id", neededIds)
            .eq("status", "active");

          if (extraSources) {
            for (const src of extraSources) {
              if (resultSources.size >= maxContextSources) break;
              resultSources.set(src.id, {
                source_id: src.id,
                source_key: src.source_key,
                title: src.title,
                excerpt: src.body.slice(0, 600),
                type: src.type,
                current_version: src.current_version,
              });
            }
          }
        }
      }
    } catch (e) {
      // If RPC fails (e.g. websearch query syntax error), fallback gracefully
      console.warn("search_sources RPC encountered non-fatal error:", e);
    }
  }

  // If resultSources is still empty (e.g. unit test or offline DB), fetch active sources directly
  if (resultSources.size === 0) {
    const { data: fallbackSources } = await supabase
      .from("brand_sources")
      .select("id, source_key, title, body, type, current_version")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .limit(maxContextSources);

    if (fallbackSources) {
      for (const src of fallbackSources) {
        resultSources.set(src.id, {
          source_id: src.id,
          source_key: src.source_key,
          title: src.title,
          excerpt: src.body.slice(0, 600),
          type: src.type,
          current_version: src.current_version,
        });
      }
    }
  }

  return Array.from(resultSources.values());
}
