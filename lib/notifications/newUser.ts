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
