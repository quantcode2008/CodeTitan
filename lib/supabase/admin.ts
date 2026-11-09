import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/database.types";

/**
 * Creates an administrative Supabase client using the service-role key.
 * 
 * NON-NEGOTIABLE SECURITY PRINCIPLE:
 * This client bypasses Row Level Security (RLS) and is strictly guarded by
 * "server-only". It must NEVER be imported or exposed to the client browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in server environment."
    );
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
