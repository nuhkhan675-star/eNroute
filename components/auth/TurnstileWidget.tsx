"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget -- the "verify you are human" box.
 *
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so the auth
 * forms stay usable in development and on any deploy without the keys. The
 * server-side check in lib/auth/turnstile.ts is disabled under exactly the
 * same condition, so the two can never disagree and lock people out.
 *
 * On success Turnstile writes a token into a hidden input named
 * "cf-turnstile-response" inside the surrounding form, which the server action
 * reads back out of the FormData.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function TurnstileWidget() {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    // The script may load before or after this effect runs, so poll briefly
    // rather than assuming an order.
    const mount = () => {
      if (cancelled || widgetId.current || !holder.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(holder.current, {
        sitekey: SITE_KEY,
        theme: "dark",
      });
    };
    mount();
    const timer = window.setInterval(mount, 200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
      />
      <div ref={holder} className="flex justify-center" />
    </>
  );
}
