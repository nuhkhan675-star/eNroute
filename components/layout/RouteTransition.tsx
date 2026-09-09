"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Circular wipe between pages.
 *
 * A dark disc grows from wherever you clicked until it covers the screen,
 * ripples while the next route resolves, then contracts to reveal it.
 *
 * Two things keep this from breaking navigation. The overlay is always
 * pointer-events-none, so it can never swallow a click even mid-animation. And
 * a watchdog clears it if the route doesn't change -- an anchor to the current
 * page, a cancelled navigation, or a failed one would otherwise leave the
 * screen covered.
 */
type Phase = "idle" | "covering" | "revealing";

const COVER_MS = 420;
const REVEAL_MS = 520;
const WATCHDOG_MS = 1600;

export function RouteTransition() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  // Set on click, read after the route commits: without it, a back/forward or
  // any pathname change we didn't start would play a reveal out of nowhere.
  const pending = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // same page, nothing to reveal

      setOrigin({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
      pending.current = true;
      setPhase("covering");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Watchdog: if the navigation never lands, uncover rather than stranding the
  // visitor behind a black screen.
  useEffect(() => {
    if (phase !== "covering") return;
    const t = window.setTimeout(() => {
      if (pending.current) {
        pending.current = false;
        setPhase("revealing");
      }
    }, WATCHDOG_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    // setTimeout rather than a bare setState: this runs as a reaction to the
    // route committing, not as part of rendering it.
    const toReveal = window.setTimeout(() => setPhase("revealing"), 0);
    const toIdle = window.setTimeout(() => setPhase("idle"), REVEAL_MS + 60);
    return () => {
      window.clearTimeout(toReveal);
      window.clearTimeout(toIdle);
    };
  }, [pathname]);

  if (phase === "idle") return null;

  const covered = phase === "covering";
  const at = `at ${origin.x}% ${origin.y}%`;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{
        clipPath: covered ? `circle(150% ${at})` : `circle(0% ${at})`,
        transition: `clip-path ${covered ? COVER_MS : REVEAL_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
        backgroundColor: "var(--background)",
      }}
    >
      {covered && (
        <div className="absolute inset-0 flex items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 260}ms` }}
              className={cn(
                "absolute size-40 rounded-full border border-primary/25",
                "motion-safe:animate-[ripple_1.4s_ease-out_infinite]",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
