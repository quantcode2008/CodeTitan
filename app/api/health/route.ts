import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const isLLMConfigured = Boolean(process.env.GEMINI_API_KEY);

  return NextResponse.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "0.1.0",
      services: {
        app: "operational",
        supabase: isSupabaseConfigured ? "configured" : "mock_or_unconfigured",
        llm: isLLMConfigured ? "configured" : "fallback_mode",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
