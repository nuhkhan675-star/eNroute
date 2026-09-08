"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { notifyNewSignup } from "@/lib/notifications/newUser";

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

  // Fire-and-forget: awaited so it actually runs before the serverless
  // invocation ends, but it can never fail the signup -- notifyNewSignup
  // swallows its own errors.
  await notifyNewSignup({ name, email });

  // A session only comes back when email confirmation is off. With it on,
  // signUp returns no session and the caller swaps to the code form, which
  // verifySignupCode() below completes.
  if (data.session) {
    redirect("/onboarding");
  }
  return { message: `We sent a 6-digit code to ${email}. Enter it below to confirm your account.` };
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

/**
 * Step 1 of code sign-in: email a six-digit code.
 *
 * This is the same signInWithOtp call that previously sent a magic link --
 * whether the recipient gets a link or a code is decided entirely by the
 * Supabase email template. The template must use {{ .Token }} rather than
 * {{ .ConfirmationURL }}, or this will still deliver a link and the code form
 * below will have nothing to accept.
 *
 * emailRedirectTo is deliberately dropped: it only applies to the link form,
 * and leaving it set invites the template back toward sending one.
 */
export async function signInWithEmailCode(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email." };

  const human = await verifyTurnstile(String(formData.get("cf-turnstile-response") || "") || null);
  if (!human.ok) return { error: human.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Codes are for signing IN. Letting this create an account would route
    // around the signup form, and with it the name field and notification.
    options: { shouldCreateUser: false },
  });
  if (error) return { error: error.message };

  return { message: `We sent a 6-digit code to ${email}. It expires in an hour.` };
}

/** Step 2: exchange the emailed code for a session. */
export async function verifyEmailCode(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("code") || "").trim();
  if (!email) return { error: "Enter your email." };
  if (!token) return { error: "Enter the code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    // Supabase returns the same shape for wrong, expired and already-used
    // codes; a single clear message beats leaking which it was.
    return { error: "That code isn't valid or has expired. Request a new one." };
  }

  redirect("/dashboard");
}

/**
 * Step 2 of signup: exchange the emailed confirmation code for a session.
 *
 * Distinct from verifyEmailCode() only in the OTP type -- "signup" consumes
 * the token minted by the Confirm signup template, "email" the one from the
 * Magic Link template. Both templates must use {{ .Token }}, not
 * {{ .ConfirmationURL }}, or the recipient gets a link and has no code to type.
 */
export async function verifySignupCode(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("code") || "").trim();
  if (!email) return { error: "Enter your email." };
  if (!token) return { error: "Enter the code from your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  if (error) {
    // Same reasoning as verifyEmailCode: wrong, expired and already-used codes
    // are indistinguishable to the user and shouldn't be distinguished here.
    return { error: "That code isn't valid or has expired. Request a new one." };
  }

  redirect("/onboarding");
}

/** Send a fresh signup confirmation code to an address that hasn't confirmed yet. */
export async function resendSignupCode(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { error: error.message };

  return { message: `We sent another code to ${email}.` };
}

/**
 * Set the display name shown in the header and account settings.
 *
 * The name lives in auth user_metadata (written at signup), not on
 * student_profiles, which has no name column. Accounts created before that
 * field existed have no name at all, which is why this is editable rather than
 * read-only.
 */
export async function updateDisplayName(formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Enter your name." };
  if (name.length > 80) return { error: "That name is too long." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
  if (error) return { error: error.message };

  // The header is server-rendered from the session, so it keeps showing the
  // old name until the route re-renders.
  revalidatePath("/", "layout");
  return { message: "Name updated." };
}

/**
 * Change the password of a signed-in user, from account settings.
 *
 * Distinct from updatePassword() above, which serves the reset-link flow where
 * possession of the emailed link IS the proof of identity. Here the user
 * already has a session, and supabase.auth.updateUser({ password }) would
 * accept a new password without ever asking for the old one -- so anyone at a
 * borrowed laptop could take the account over. Re-authenticating first closes
 * that, and matches what the form asks for.
 */
export async function changePassword(formData: FormData): Promise<AuthResult> {
  const currentPassword = String(formData.get("currentPassword") || "");
  const password = String(formData.get("password") || "");
  if (!currentPassword) return { error: "Enter your current password." };
  if (password.length < 8) return { error: "Choose a new password of at least 8 characters." };
  if (password === currentPassword) return { error: "That's already your password." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "You need to be logged in to change your password." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    // Also the path for an account created by emailed code, which has no
    // password to verify against -- the message holds either way.
    return { error: "That isn't your current password." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { message: "Password updated." };
}

/**
 * Start the Google OAuth flow.
 *
 * Supabase returns a URL to send the browser to; the round trip comes back to
 * /auth/callback with a PKCE code, which that route already exchanges for a
 * session. `next=/dashboard` rather than /onboarding because the dashboard
 * sends anyone without a profile on to onboarding anyway -- a returning user
 * shouldn't land in the wizard.
 *
 * No Turnstile check here: the human verification is Google's, and there's no
 * form for the widget to write a token into.
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });
  if (error) return { error: error.message };
  if (!data.url) return { error: "Couldn't start Google sign-in. Try again." };

  redirect(data.url);
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
