import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/lib/database.types";

/**
 * Creates a Supabase client for browser components using the anon public key.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client in test/dev if environment variables are not yet provided
    console.warn(
      "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Client running in fallback mode."
    );
  }

  return createBrowserClient<Database>(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-anon-key"
  );
}

