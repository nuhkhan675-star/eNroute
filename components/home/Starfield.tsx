"use client";

import { useEffect, useRef } from "react";

/**
 * Slow-drifting starfield behind the hero.
 *
 * Canvas rather than hundreds of absolutely-positioned divs: the browser
 * composites one element instead of laying out 160, which matters because this
 * sits under text that has to stay readable while scrolling.
 *
 * Honours prefers-reduced-motion by painting one static frame -- the texture is
 * the point, the movement is decoration.
 */
export function Starfield({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let stars: { x: number; y: number; r: number; a: number; speed: number; phase: number }[] = [];

    // Cached, not read per frame: getBoundingClientRect() forces a synchronous
    // layout, and doing that 60 times a second starved the main thread badly
    // enough that CSS transitions elsewhere on the page crawled.
    let w = 0;
    let h = 0;

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      w = width;
      h = height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Density by area, so a wide desktop doesn't look sparse and a phone
      // doesn't turn into soup.
      const count = Math.round((width * height) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.3,
        a: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 0.05 + 0.015,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const twinkle = reduced ? 1 : 0.65 + 0.35 * Math.sin(t / 900 + s.phase);
        ctx.globalAlpha = s.a * twinkle;
        ctx.fillStyle = "#cbd5f5";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (!reduced) {
          s.y -= s.speed;
          if (s.y < -2) {
            s.y = h + 2;
            s.x = Math.random() * w;
          }
        }
      }
      ctx.globalAlpha = 1;
      if (!reduced) raf = requestAnimationFrame(draw);
    };

    build();
    draw(0);

    const onResize = () => {
      build();
      if (reduced) draw(0);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
