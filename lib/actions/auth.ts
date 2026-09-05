"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { verifyTurnstile } from "@/lib/auth/turnstile";

/** Where password-reset and magic-link emails send people back to. */
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export interface AuthResult {
  error?: string;
  message?: string;
}

export async function signUpWithPassword(formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (!name) return { error: "Enter your name." };
  if (!email || password.length < 8) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const human = await verifyTurnstile(String(formData.get("cf-turnstile-response") || "") || null);
  if (!human.ok) return { error: human.error };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) return { error: error.message };

  if (data.session) {
    redirect("/onboarding");
  }
  return { message: "Check your email to confirm your account, then log in." };
}

export async function signInWithPassword(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const human = await verifyTurnstile(String(formData.get("cf-turnstile-response") || "") || null);
  if (!human.ok) return { error: human.error };
  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signInWithMagicLink(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  return { message: "Check your email for a sign-in link." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Step 1 of a password reset: email the student a one-time link.
 *
 * Always reports success, even when the address has no account. Saying "no
 * account with that email" would turn this form into a way to test which
 * addresses are registered, so the response is identical either way.
 */
export async function requestPasswordReset(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter the email you signed up with." };

  const human = await verifyTurnstile(String(formData.get("cf-turnstile-response") || "") || null);
  if (!human.ok) return { error: human.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteUrl() + "/auth/callback?next=/reset-password",
  });
  // A genuine send failure is still not surfaced per-address, for the reason
  // above; it is logged instead.
  if (error) console.error("[auth] password reset request failed", error.message);

  return { message: "If that email has an account, a reset link is on its way." };
}

/**
 * Step 2: set the new password. Reachable only with the recovery session the
 * emailed link established, so no current-password check is needed -- proving
 * control of the inbox is what authorises this.
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  if (password.length < 8) return { error: "Choose a password of at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/dashboard");
}
