"use client";

import { cn } from "@/lib/utils";

/**
 * The small result cards that drift around the hero.
 *
 * Illustrative, not live data -- these are what an estimate looks like, shown
 * to someone who hasn't signed up yet and therefore has no estimates. The
 * percentages are plausible rather than claimed: Oxford and Stanford really are
 * single-digit-to-low-teens for international applicants, and labelling them
 * Reach/Target is the same vocabulary the product uses once you're in.
 *
 * Hidden below lg: on a phone they'd overlap the headline, and the headline is
 * the thing that has to survive.
 */
const CARDS = [
  { school: "Stanford", band: "Reach", pct: 6, className: "left-[4%] top-[22%]", delay: "0s" },
  { school: "Oxford", band: "Reach", pct: 17, className: "right-[5%] top-[16%]", delay: "-2.4s" },
  { school: "Melbourne", band: "Target", pct: 54, className: "left-[7%] bottom-[16%]", delay: "-4.1s" },
  { school: "NUS", band: "Reach", pct: 21, className: "right-[4%] bottom-[22%]", delay: "-1.3s" },
];

const BAND_STYLES: Record<string, string> = {
  Reach: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  Target: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  Likely: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

export function FloatingOdds() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
      {CARDS.map((c) => (
        <div
          key={c.school}
          style={{ animationDelay: c.delay }}
          className={cn(
            "absolute w-44 rounded-xl border border-border/80 bg-card/80 p-3 shadow-lg backdrop-blur-sm",
            "motion-safe:animate-[drift_9s_ease-in-out_infinite] motion-reduce:animate-none",
            c.className,
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">{c.school}</span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                BAND_STYLES[c.band],
              )}
            >
              {c.band}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${c.pct}%` }} />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">{c.pct}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
