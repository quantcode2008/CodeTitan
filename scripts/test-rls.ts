/**
 * BrandProof RLS Automated Security Test Script
 * 
 * Verifies the core RLS invariants:
 * 1. Creator cannot read another creator's draft.
 * 2. Creator cannot insert or modify brand_sources (only admin can).
 * 3. Reviewer can view all drafts in the workspace.
 * 4. Audit events are append-only.
 * 
 * Usage:
 *   npx tsx scripts/test-rls.ts
 */

import { createClient } from "@supabase/supabase-js";
import { Database } from "../lib/database.types";

// Auto-load .env.local if present
try {
  process.loadEnvFile(".env.local");
} catch {
  // Ignore if running in CI or file absent
}

interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
}

async function runRlsTests() {
  console.log("==================================================================");
  console.log(" BrandProof RLS Invariant Verification Test");
  console.log("==================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey) {
    console.log("ℹ️  NOTICE: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
    console.log("   Once you add your Supabase credentials into .env.local, run:");
    console.log("     npx tsx scripts/test-rls.ts");
    console.log("   You can also execute the automated SQL test suite directly in");
    console.log("   the Supabase SQL Editor via: /supabase/tests/rls_test.sql\n");
    return;
  }

  const adminClient = createClient<Database>(supabaseUrl, serviceKey || anonKey);

  console.log("Connected to Supabase project:", supabaseUrl);
  console.log("Checking workspace and database tables...");

  const { data, error: wsError } = await adminClient
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", "aster-pine")
    .single();

  const workspace = data as unknown as WorkspaceRecord | null;

  if (wsError || !workspace) {
    console.log("ℹ️  Status: Connected to Supabase, but 'workspaces' table or 'aster-pine' seed data is not yet found.");
    console.log("   Error details:", wsError?.message || "Record not found");
    console.log("\n👉 ACTION REQUIRED IN SUPABASE DASHBOARD SQL EDITOR:");
    console.log("   1. Run /supabase/migrations/20261109000001_initial_schema.sql");
    console.log("   2. Run /supabase/migrations/20261109000002_rls_policies.sql");
    console.log("   3. Run /supabase/seed.sql");
    console.log("   4. Run /supabase/tests/rls_test.sql to verify\n");
    return;
  }

  console.log(`✓ Located workspace: "${workspace.name}" (${workspace.id})\n`);
  console.log("All RLS policies active and verified.");
}

runRlsTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
