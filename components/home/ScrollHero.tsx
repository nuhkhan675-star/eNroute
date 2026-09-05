"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { BrandN } from "@/components/layout/Logo";

/**
 * Scroll-scrubbed hero: one continuous timeline driven directly by scroll
 * position, the way a video scrubs on a scrollbar -- NOT a stack of sections
 * that animate as they enter the viewport.
 *
 * Mechanism: a tall outer container supplies the scroll distance, and an inner
 * sticky viewport-height stage pins the visuals while that distance is
 * consumed. CSS sticky does the pinning, so there is no pin-spacer to manage
 * and it survives resize and hydration without special handling.
 *
 * Deliberately NOT using a motion library. Framer Motion's useTransform threw
 * "Failed to execute animate on Element: Offsets must be monotonically
 * non-decreasing" from inside react-dom on every frame in this Next 16 /
 * React 19 stack -- with the keyframes verified monotonic and inside [0, 1],
 * so the fault was not in the inputs. Writing opacity and transform straight
 * onto the nodes from a rAF-throttled scroll listener is deterministic, has no
 * version-compatibility surface, and mirrors CursorGlow elsewhere in this app.
 */

const STAGE_VH = 450;

/**
 * Half-width of the crossfade, as a fraction of the narrowest scene slot.
 *
 * The crossfade is CENTRED ON THE BOUNDARY between two scenes: the outgoing
 * scene runs 1 -> 0 across [b - o, b + o] while the incoming one runs 0 -> 1
 * across exactly the same interval, so their opacities always sum to 1 and the
 * stage can never blank. This was wrong twice before -- first with hand-written
 * ranges overlapping by less than the fade duration, then with adjacent slots
 * that put one fade-out entirely after the next fade-in (measured 0.006
 * brightest at the seam). Both read as a flicker rather than an obvious bug.
 *
 * At 0.8 the fade occupies most of each slot, so a scene spends far longer
 * easing in and out than sitting at full opacity -- a slow arrival rather than
 * a switch. It must stay below 1: the half-overlap is CROSSFADE * 0.5 * the
 * narrowest slot, and at 1 or above the keyframes stop being monotonic.
 */
const CROSSFADE = 0.8;

/** Vertical drift, in px, as a scene enters and leaves. */
const DRIFT = 26;

/**
 * How quickly the rendered position catches up to the real scroll position,
 * per frame. Below 1 the timeline TRAILS the scrollbar slightly and eases into
 * place, which is what removes the stepped feel -- a wheel or trackpad
 * delivers scroll in coarse jumps, and mapping those straight onto opacity
 * reads as chop. 0.12 is a noticeable glide without feeling laggy.
 */
const SMOOTHING = 0.075;

/** Below this delta the timeline has effectively settled; stop the loop. */
const SETTLED = 0.0002;

/** Smoothstep -- eases both ends of every fade so nothing starts or stops abruptly. */
function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

export interface Scene {
  content: ReactNode;
  /** Relative share of the timeline. Defaults to 1; 1.5 holds longer. */
  weight?: number;
}

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

/** Piecewise-linear interpolation, clamped outside the keyframe range. */
function lerp(x: number, inputs: number[], outputs: number[]): number {
  if (x <= inputs[0]) return outputs[0];
  if (x >= inputs[inputs.length - 1]) return outputs[outputs.length - 1];
  for (let i = 0; i < inputs.length - 1; i++) {
    if (x >= inputs[i] && x <= inputs[i + 1]) {
      const span = inputs[i + 1] - inputs[i];
      const t = span === 0 ? 0 : (x - inputs[i]) / span;
      return outputs[i] + ease(t) * (outputs[i + 1] - outputs[i]);
    }
  }
  return outputs[outputs.length - 1];
}

export function ScrollHero({ scenes }: { scenes: Scene[] }) {
  const container = useRef<HTMLDivElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const schedule = buildSchedule(scenes);
    const overlap = Math.min(...schedule.map(([a, b]) => b - a)) * CROSSFADE * 0.5;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let target = 0;   // where the scrollbar actually is
    let shown = -1;   // where the timeline is currently drawn
    let frame = 0;

    const readTarget = () => {
      const el = container.current;
      if (!el) return;
      const travel = el.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      target = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / travel));
    };

    const draw = (p: number) => {
      schedule.forEach(([start, end], i) => {
        const node = sceneRefs.current[i];
        if (!node) return;
        const opensTimeline = i === 0;
        const closesTimeline = i === schedule.length - 1;
        const keys = [start - overlap, start + overlap, end - overlap, end + overlap];
        const opacity = lerp(p, keys, [opensTimeline ? 1 : 0, 1, 1, closesTimeline ? 1 : 0]);
        const y = reduced
          ? 0
          : lerp(p, keys, [opensTimeline ? 0 : DRIFT, 0, 0, closesTimeline ? 0 : -DRIFT]);
        node.style.opacity = String(opacity);
        node.style.transform = "translate3d(0, " + y.toFixed(2) + "px, 0)";
        // A faded-out scene must not swallow clicks meant for the visible one.
        node.style.pointerEvents = opacity > 0.9 ? "auto" : "none";
      });

      if (glowRef.current) {
        glowRef.current.style.opacity = String(lerp(p, [0, 0.15, 0.85, 1], [0.4, 0.85, 0.85, 0.35]));
        glowRef.current.style.transform =
          "scale(" + lerp(p, [0, 0.5, 1], [0.92, 1.08, 0.95]).toFixed(3) + ")";
      }
    };

    // Continuous loop while the drawn position is still catching up. Running
    // only on scroll events was the source of the choppiness: a wheel or
    // trackpad emits coarse, irregular deltas, so the timeline jumped between
    // them instead of gliding.
    const tick = () => {
      const delta = target - shown;
      if (Math.abs(delta) < SETTLED) {
        shown = target;
        draw(shown);
        frame = 0;
        return;
      }
      shown += delta * (reduced ? 1 : SMOOTHING);
      draw(shown);
      frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      readTarget();
      if (!frame) frame = requestAnimationFrame(tick);
    };

    readTarget();
    shown = target;
    draw(shown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [scenes]);

  return (
    <div ref={container} style={{ height: STAGE_VH + "vh" }} className="relative w-full">
      <div className="bg-background sticky top-0 h-screen w-full overflow-hidden">
        <div ref={glowRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(58% 48% at 50% 24%, color-mix(in oklch, var(--primary), transparent 82%), transparent 70%)",
            }}
          />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 35%, transparent 40%, var(--background) 100%)",
          }}
        />

        {/* Held at full opacity for the whole sequence rather than fading out
            under the headlines -- the wordmark and the statement read as one
            composition, which is how the reference frames it. */}
        <div className="pointer-events-none absolute inset-x-0 top-20 z-10 flex justify-center">
          <HeroWordmark className="text-3xl sm:text-4xl" />
        </div>

        {scenes.map((scene, i) => (
          <div
            key={i}
            ref={(node) => {
              sceneRefs.current[i] = node;
            }}
            style={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pt-44 pb-10 text-center"
          >
            {scene.content}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Serif headline -- uppercase, wide-tracked, thin-stroke editorial serif. */
export function SerifHeadline({ lines }: { lines: string[] }) {
  return (
    <h2 className="max-w-4xl font-[family-name:var(--font-serif-display)] text-3xl leading-[1.25] font-normal tracking-[0.14em] text-balance uppercase sm:text-4xl md:text-5xl md:leading-[1.2]">
      {lines.map((line, i) => (
        <span key={i} className="block">
          {line}
        </span>
      ))}
    </h2>
  );
}

export function HeroWordmark({ className = "" }: { className?: string }) {
  return (
    <p className={"text-5xl font-bold tracking-tight sm:text-6xl " + className}>
      e<BrandN className="drop-shadow-[0_0_28px_color-mix(in_oklch,var(--primary),transparent_65%)]" />route
    </p>
  );
}
