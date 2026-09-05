"use client";

import Link from "next/link";
import { ScrollHero, SerifHeadline, type Scene } from "@/components/home/ScrollHero";
import { Button } from "@/components/ui/button";

/**
 * The homepage's scroll-scrubbed opening sequence.
 *
 * Scenes declare only a relative WEIGHT; ScrollHero derives the actual
 * timeline slots and the crossfade between them. Hand-written ranges were the
 * original approach and were subtly wrong -- the overlaps were smaller than
 * the fade duration, so the stage briefly blanked between scenes.
 *
 * Copy uses eNroute's own verified figures -- 2,104 universities across the
 * six supported countries -- rather than any other site's claims.
 */

const COUNTRIES = "US · UK · India · Australia · Singapore · Hong Kong";

const PILLS = [
  { text: "2,104 real universities", tone: "border-primary/40 bg-primary/10 text-primary" },
  { text: "Tiered acceptance odds", tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  { text: "Sourced, never guessed", tone: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
];

const MARQUEE = [
  "Harvard University", "University of Oxford", "National University of Singapore",
  "Indian Institute of Technology Delhi", "University of Cambridge", "Imperial College London",
  "The University of Hong Kong", "University of Melbourne", "Stanford University",
  "Nanyang Technological University", "University College London", "Ashoka University",
];

function buildScenes(primaryHref: string, greeting: string | null): Scene[] {
  return [
  // 1. Opening breath -- the wordmark alone (ScrollHero renders it at the
  //    top), with the personalised greeting the old static hero carried.
  {
    weight: 0.7,
    content: greeting ? (
      <span className="border-primary/30 bg-primary/10 text-primary mt-28 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
        {greeting}
      </span>
    ) : null,
  },

  // 2. First statement.
  {
    weight: 1.2,
    content: (
      <SerifHeadline lines={["Admissions season is full of guesses.", "We replaced ours with data."]} />
    ),
  },

  // 3. Crossfades into the second statement, with the countries beneath.
  {
    weight: 1.2,
    content: (
      <>
        <SerifHeadline lines={["Real odds. Real universities.", "Across six countries."]} />
        <p className="text-muted-foreground mt-3 text-xs tracking-[0.2em] uppercase sm:text-sm">
          {COUNTRIES}
        </p>
      </>
    ),
  },

  // 4. Proof points.
  {
    weight: 1,
    content: (
      <>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {PILLS.map((p) => (
            <span
              key={p.text}
              className={`rounded-full border px-5 py-2 text-sm font-medium ${p.tone}`}
            >
              {p.text}
            </span>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 max-w-xl text-sm sm:text-base">
          Every estimate is grounded in real selectivity data for a real university — and where no
          published figure exists, we label it an estimate rather than dressing a guess up as fact.
        </p>
      </>
    ),
  },

  // 5. The catalogue drifting past.
  {
    weight: 1,
    content: (
      <div className="w-full max-w-3xl">
        <p className="text-muted-foreground mb-6 text-xs tracking-[0.2em] uppercase">
          Already in your shortlist
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {MARQUEE.map((name) => (
            <span key={name} className="text-foreground/70 text-sm sm:text-base">
              {name}
            </span>
          ))}
        </div>
      </div>
    ),
  },

  // 6. Close, with the calls to action.
  {
    weight: 1.3,
    content: (
      <>
        <SerifHeadline lines={["Stop guessing.", "See exactly where you stand."]} />
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" nativeButton={false} render={<Link href={primaryHref}>Get started</Link>} />
          <Button
            size="lg"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/login">Sign in</Link>}
          />
        </div>
      </>
    ),
  },
  ];
}

export function HomeScrollHero({
  primaryHref,
  greeting,
}: {
  /** Signed-in visitors without a profile go to onboarding, not signup. */
  primaryHref: string;
  greeting: string | null;
}) {
  return <ScrollHero scenes={buildScenes(primaryHref, greeting)} />;
}
