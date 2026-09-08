import "server-only";

/**
 * Emails the operator when someone creates an account.
 *
 * Uses Resend's HTTP API directly rather than adding an SDK -- it is one POST,
 * and a dependency for that is not worth the install.
 *
 * Enabled only when RESEND_API_KEY is set. Without it this is a no-op, so
 * local development and any deploy without the key behave normally instead of
 * erroring on every signup.
 *
 * Nothing here can break account creation: every failure path returns quietly
 * and logs. A notification that does not arrive is a nuisance; a signup that
 * fails because a notification could not be sent is a lost user.
 */
const API_KEY = process.env.RESEND_API_KEY;
const TO = process.env.SIGNUP_NOTIFICATION_EMAIL ?? "enrouteuniadvisor@gmail.com";
// Resend's shared sender works without verifying a domain, but only delivers
// to the address that owns the Resend account. Override once a domain is set
// up and mail can go anywhere.
const FROM = process.env.SIGNUP_NOTIFICATION_FROM ?? "eNroute <onboarding@resend.dev>";

/**
 * Notify for an account created outside the password form -- Google, or an
 * emailed code. Supabase creates those users itself, so there is no point in
 * our code that inherently knows "this one is new"; we have to ask.
 *
 * Exactly-once is enforced with a flag on app_metadata, which only the service
 * role can write, so a returning user can never re-trigger it and a curious
 * one can't fake it. The flag is set BEFORE sending: a notification that goes
 * missing is a nuisance, but a broken flag with a working send would email on
 * every single login.
 */
export async function notifyIfNewSignup(user: {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
}): Promise<void> {
  if (!API_KEY) return;
  if (user.app_metadata?.signup_notified) return;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[signup-notify] service role key missing; skipping to avoid notifying on every login");
    return;
  }

  try {
    const res = await fetch(`${url}/auth/v1/admin/users/${user.id}`, {
      method: "PUT",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ app_metadata: { ...(user.app_metadata ?? {}), signup_notified: true } }),
    });
    if (!res.ok) {
      console.error(`[signup-notify] couldn't mark user as notified (${res.status}); not sending`);
      return;
    }
  } catch (err) {
    console.error("[signup-notify] marking failed", err instanceof Error ? err.message : err);
    return;
  }

  await notifyNewSignup({
    name: String(user.user_metadata?.full_name ?? ""),
    email: user.email ?? "(unknown)",
  });
}

export async function notifyNewSignup(params: { name: string; email: string }): Promise<void> {
  if (!API_KEY) return;

  const when = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const body = {
    from: FROM,
    to: [TO],
    subject: `New eNroute signup: ${params.name || params.email}`,
    text: [
      "Someone just created an eNroute account.",
      "",
      `Name:  ${params.name || "(not given)"}`,
      `Email: ${params.email}`,
      `Time:  ${when}`,
    ].join("\n"),
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`[signup-notify] Resend returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[signup-notify] send failed", err instanceof Error ? err.message : err);
  }
}
