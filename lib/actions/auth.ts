"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Signs in a user using email and password.
 */
export async function signInWithPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const returnTo = formData.get("returnTo")?.toString() || "/";

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect(returnTo);
}

/**
 * Sends a passwordless Magic Link to the user's email.
 */
export async function signInWithMagicLinkAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email")?.toString().trim();
  if (!email) {
    return { error: "Please enter an email address." };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    message: "A magic sign-in link has been sent to your email. Check your inbox.",
  };
}

/**
 * Registers a new proofreader account.
 */
export async function signUpWithPasswordAction(
  prevState: AuthActionResult | null,
  formData: FormData
): Promise<AuthActionResult> {
  const fullName = formData.get("fullName")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();

  if (!email || !password || !fullName) {
    return { error: "Full name, email, and password are all required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters in length." };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If user is returned and session established, redirect to workspace onboarding
  if (data?.session) {
    redirect("/onboarding");
  }

  return {
    success: true,
    message: "Account created! Check your email to confirm registration, or sign in now.",
  };
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
