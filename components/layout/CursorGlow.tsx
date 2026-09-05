"use client";

import { useEffect } from "react";

// --- Tunables -------------------------------------------------------------
/** How wide the pool of light is, in px. */
const GLOW_RADIUS = 480;
/** 0-100. Higher = fainter (it's the transparency passed to color-mix). */
const GLOW_TRANSPARENCY = 90;
// --------------------------------------------------------------------------

// Ambient light that follows the cursor. Deliberately does NOT hold the
// position in React state -- that would re-render the whole tree on every
// mouse move. Instead it writes CSS custom properties on <html>, throttled to
// one write per animation frame, and a static rule in globals.css does the
// actual painting (see body::before). After mount React is uninvolved.
export function CursorGlow() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cursor-glow-radius", `${GLOW_RADIUS}px`);
    root.style.setProperty("--cursor-glow-transparency", `${GLOW_TRANSPARENCY}%`);

    // A moving light source is exactly what this preference exists to
    // suppress, so don't even attach the listener.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      // Coalesce every move within a frame into a single style write.
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty("--cursor-x", `${x}px`);
        root.style.setProperty("--cursor-y", `${y}px`);
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
