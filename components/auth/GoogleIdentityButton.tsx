"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { notifySignupIfNew } from "@/lib/actions/auth";

/**
 * Google sign-in rendered by Google Identity Services, on our own origin.
 *
 * The Supabase redirect flow works, but Google names the redirect host on its
 * consent screen -- "to continue to <project-ref>.supabase.co" -- and no
 * consent-screen branding changes that, because it is the destination Google
 * is actually sending the user to. Serving auth from our own domain would fix
 * it too, but that is a paid Supabase add-on.
 *
 * Here the sign-in happens against our origin instead: Google returns an ID
 * token to this page, and we hand it straight to Supabase. Google names the
 * authorised JavaScript origin, which is enroute.website.
 *
 * Requires, in Google Cloud, that the OAuth client lists our site under
 * Authorised JavaScript origins -- the field the redirect flow does not use.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

interface CredentialResponse {
  credential?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleIdentityButton({ text = "continue_with" }: { text?: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) return;

    const handle = async (response: CredentialResponse) => {
      if (!response.credential) {
        setError("Google didn't return a sign-in token. Try again.");
        return;
      }
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      // Google creates the account inside Supabase, so this is the first
      // moment our code can tell the operator about a new one.
      await notifySignupIfNew();

      // The session lives in cookies the server can read, but the pages that
      // matter are server-rendered -- refresh so they re-render signed in.
      router.replace("/dashboard");
      router.refresh();
    };

    // The script may load before or after this effect runs, so poll briefly
    // rather than assuming an order.
    const mount = () => {
      if (rendered.current || !holder.current || !window.google) return;
      rendered.current = true;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handle,
        ux_mode: "popup",
      });
      window.google.accounts.id.renderButton(holder.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        width: 320,
        logo_alignment: "left",
      });
    };
    mount();
    const timer = window.setInterval(mount, 200);
    return () => window.clearInterval(timer);
  }, [router, text]);

  if (!CLIENT_ID) return null;

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
      <div ref={holder} className="flex justify-center [color-scheme:light]" />
      {error && <p className="mt-2 text-center text-sm text-destructive">{error}</p>}
    </>
  );
}
