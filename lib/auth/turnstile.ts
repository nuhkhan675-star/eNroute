import "server-only";

/**
 * Cloudflare Turnstile verification -- the "verify you are human" check.
 *
 * Enabled only when BOTH keys are configured. With them absent the check is
 * skipped entirely, so local development and any deploy without the keys keeps
 * working rather than locking everyone out of sign-in. That is a deliberate
 * trade: the widget is defence against automated abuse, not an authorisation
 * boundary, and a misconfigured turnstile silently bricking login is a worse
 * outcome than briefly running without it.
 *
 * The secret key must never reach the browser -- it lives only here, behind
 * "server-only".
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

export const turnstileEnabled = Boolean(SITE_KEY && SECRET_KEY);

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!turnstileEnabled) return { ok: true };
  if (!token) return { ok: false, error: "Please complete the human verification check." };

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: SECRET_KEY as string, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data?.success
      ? { ok: true }
      : { ok: false, error: "Human verification failed. Please try again." };
  } catch {
    // Cloudflare unreachable. Failing closed here would take sign-in down with
    // it, so the request proceeds -- again, this widget is abuse mitigation,
    // not the thing standing between an attacker and an account.
    console.error("[turnstile] verification request failed; allowing the attempt through");
    return { ok: true };
  }
}
