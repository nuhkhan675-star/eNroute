import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { notifyIfNewSignup } from "@/lib/notifications/newUser";

// Handles the redirect back from magic-link / email-confirmation emails.
//
// Supabase sends one of two shapes depending on the template and flow:
//   ?code=...                 -- PKCE, exchanged for a session
//   ?token_hash=...&type=...  -- email OTP link, verified directly
// Both are handled so a confirmation link never dead-ends on a valid token.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  // Accounts created through Google or an email link are created by Supabase,
  // so this route is the first place our own code sees them -- and therefore
  // the only place the operator notification can fire for them.
  const announce = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await notifyIfNewSignup(user);
  };

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await announce(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      await announce(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
