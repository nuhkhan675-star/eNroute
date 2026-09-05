"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";
import { BrandN } from "@/components/layout/Logo";

/**
 * Scroll-scrubbed hero: one continuous timeline driven directly by scroll
 * position, the way a video scrubs on a scrollbar -- NOT a stack of sections
 * that animate as they enter the viewport.
 *
 * Mechanism: a very tall outer container provides the scroll distance, and an
 * inner `sticky` viewport-height stage pins the visuals in place while that
 * distance is consumed. CSS sticky does the pinning, so there is no pin-spacer
 * machinery to fight with and nothing to tear down on unmount -- notably
 * simpler than GSAP ScrollTrigger's pin for the same result, and it survives
 * resize and SSR hydration without special handling.
 *
 * `useScroll` reports 0->1 across the container, and every scene maps a slice
 * of that single progress value. Scenes therefore cannot drift out of sync
 * with one another: they are all reading the same clock.
 */

/** Total scroll distance. ~450vh gives each scene room to breathe. */
const STAGE_VH = 450;

export interface Scene {
  content: ReactNode;
  /** Relative share of the timeline. Defaults to 1; give a scene 1.5 to hold longer. */
  weight?: number;
}

/**
 * Half-width of the crossfade, as a fraction of the narrowest scene slot.
 *
 * The crossfade is CENTRED ON THE BOUNDARY between two scenes: the outgoing
 * scene runs 1 -> 0 across [b - o, b + o] while the incoming one runs 0 -> 1
 * across exactly the same interval, so their opacities always sum to 1 and the
 * stage can never blank.
 *
 * Getting this wrong is easy and was wrong twice here. Hand-written ranges
 * overlapped by less than the fade duration; then adjacent computed slots put
 * one scene's fade-out entirely after the next scene's fade-in, so both were
 * near zero at the seam (measured: 0.006 at p=0.484). Both defects looked like
 * an intermittent flicker rather than an obvious bug.
 */
const CROSSFADE = 0.4;

/** Turns scene weights into [start, end] slots covering 0..1 exactly. */
function buildSchedule(scenes: Scene[]): [number, number][] {
  const total = scenes.reduce((sum, s) => sum + (s.weight ?? 1), 0);
  let cursor = 0;
  return scenes.map((s) => {
    const share = (s.weight ?? 1) / total;
    const slot: [number, number] = [cursor, cursor + share];
    cursor += share;
    return slot;
  });
}

/**
 * Maps global scroll progress to one scene's local 0->1, then to a fade+drift.
 * Each scene fades in over its first fifth and out over its last fifth, so
 * consecutive scenes crossfade where their ranges abut.
 */
function useSceneMotion(
  progress: MotionValue<number>,
  [start, end]: [number, number],
  overlap: number,
  reduced: boolean
) {
  const fade = overlap;
  // The scenes at either END of the timeline have nowhere to fade from or to.
  // The first would be invisible at progress 0, leaving the hero blank before
  // the visitor scrolls; the last would fade to nothing at progress 1, leaving
  // an empty stage at the bottom of the pinned sequence. Both hold instead.
  const opensTimeline = start <= 0;
  const closesTimeline = end >= 1;
  // Note the keyframes straddle the slot edges (start - fade .. start + fade),
  // which is what centres the crossfade on the boundary.
  const opacity = useTransform(
    progress,
    [start - fade, start + fade, end - fade, end + fade],
    [opensTimeline ? 1 : 0, 1, 1, closesTimeline ? 1 : 0]
  );
  // Drifts up as it leaves and starts slightly low -- the "rising" feel. Held
  // flat when the visitor prefers reduced motion; the crossfade alone still
  // carries the sequence.
  const y = useTransform(
    progress,
    [start - fade, start + fade, end - fade, end + fade],
    reduced ? [0, 0, 0, 0] : [opensTimeline ? 0 : 28, 0, 0, closesTimeline ? 0 : -28]
  );
  return { opacity, y };
}

function SceneLayer({
  progress,
  range,
  overlap,
  reduced,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  overlap: number;
  reduced: boolean;
  children: ReactNode;
}) {
  const { opacity, y } = useSceneMotion(progress, range, overlap, reduced);
  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center"
    >
      {children}
    </motion.div>
  );
}

/** Serif headline; lines stagger by offsetting each line's range slightly. */
export function SerifHeadline({ lines }: { lines: string[] }) {
  return (
    <h2 className="font-[family-name:var(--font-serif-display)] max-w-4xl text-3xl leading-[1.25] font-normal tracking-[0.14em] text-balance uppercase sm:text-4xl md:text-5xl md:leading-[1.2]">
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </h2>
  );
}

export function ScrollHero({ scenes }: { scenes: Scene[] }) {
  const schedule = buildSchedule(scenes);
  // Half-width of every crossfade. Tied to the NARROWEST slot so a short scene
  // can never be swallowed by its own fades.
  const overlap = Math.min(...schedule.map(([a, b]) => b - a)) * CROSSFADE * 0.5;
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  // offset: timeline starts when the container's top hits the viewport top and
  // ends when its bottom does -- i.e. exactly the sticky stage's travel.
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  // The glow breathes: brightest mid-sequence, dimming toward both ends.
  const glowOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.35, 0.7, 0.7, 0.3]);
  const glowScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.08, 0.95]);

  // Visible while the opening plays, hidden through the middle, back for the
  // closing frame.
  const wordmarkOpacity = useTransform(
    scrollYProgress,
    [0, 0.06, 0.2, 0.86, 0.94],
    [1, 1, 0, 0, 1]
  );

  return (
    <div ref={container} style={{ height: `${STAGE_VH}vh` }} className="relative w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-background">
        {/* Radial spotlight, brightest near centre-top, vignetting to black. */}
        <motion.div
          aria-hidden
          style={{ opacity: glowOpacity, scale: glowScale }}
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(58% 48% at 50% 22%, color-mix(in oklch, var(--primary), transparent 84%), transparent 70%)",
            }}
          />
        </motion.div>
        {/* Vignette to true black at the edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 35%, transparent 40%, var(--background) 100%)",
          }}
        />

        {/* Wordmark pinned near the top of the stage for the opening stretch,
            then again at the close -- it frames the sequence rather than
            competing with the centred headlines. */}
        <motion.div
          style={{ opacity: wordmarkOpacity }}
          className="pointer-events-none absolute inset-x-0 top-10 z-10 flex justify-center"
        >
          <HeroWordmark className="text-3xl sm:text-4xl" />
        </motion.div>

        {scenes.map((scene, i) => (
          <SceneLayer key={i} progress={scrollYProgress} range={schedule[i]} overlap={overlap} reduced={reduced}>
            {scene.content}
          </SceneLayer>
        ))}
      </div>
    </div>
  );
}

/** The wordmark, reused for the opening and closing scenes. */
export function HeroWordmark({ className = "" }: { className?: string }) {
  return (
    <p className={`text-5xl font-bold tracking-tight sm:text-6xl ${className}`}>
      e<BrandN className="drop-shadow-[0_0_28px_color-mix(in_oklch,var(--primary),transparent_65%)]" />route
    </p>
  );
}
