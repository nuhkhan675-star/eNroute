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

// Rounded rather than exact: the catalogue grows, and a precise figure on a
// marketing surface goes stale the moment it does.
const PILLS = [
  { text: "2,000+ universities", tone: "border-primary/40 bg-primary/10 text-primary" },
  { text: "Odds from published data", tone: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  { text: "Estimates labelled as estimates", tone: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
];

// The provenance statement. Every claim in it is one the system can actually
// back: Scorecard supplies the US rates, ROR the catalogue, rankings the proxy
// tier, and per-university pages the sourced lookups -- with anything else
// labelled an estimate on the card itself.
const SOURCES_HEADING = "How these numbers are sourced";

const MARQUEE = [
  "Harvard University", "University of Oxford", "National University of Singapore",
  "Indian Institute of Technology Delhi", "University of Cambridge", "Imperial College London",
  "The University of Hong Kong", "University of Melbourne", "Stanford University",
  "Nanyang Technological University", "University College London", "Ashoka University",
];

function buildScenes(primaryHref: string, greeting: string | null): Scene[] {
  return [
  // 1. Opens ON the first statement rather than on a blank beat. Because this
  //    scene owns the start of the timeline it holds at full opacity from
  //    scroll 0, so the wordmark and the headline are the first thing seen --
  //    an empty opening frame just read as a broken page.
  {
    weight: 1.4,
    content: (
      <>
        {greeting ? (
          <span className="border-primary/30 bg-primary/10 text-primary mb-2 rounded-full border px-4 py-1.5 text-xs font-medium tracking-wide uppercase">
            {greeting}
          </span>
        ) : null}
        <SerifHeadline lines={["You are not short of opinions.", "You are short of evidence."]} />
      </>
    ),
  },

  // 3. Crossfades into the second statement, with the countries beneath.
  {
    weight: 1.2,
    content: (
      <>
        <SerifHeadline lines={["Published rates. Named sources.", "Six countries."]} />
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
          Where a university publishes its admissions figures, that is the number your chances are
          built on. Where it does not, we say so on the card instead of quietly filling the gap.
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
          A few of the many we cover
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
        <SerifHeadline lines={["Know where you stand.", "Know where you fit."]} />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" nativeButton={false} render={<Link href={primaryHref}>Get started</Link>} />
          <Button
            size="lg"
            variant="ghost"
            nativeButton={false}
            render={<Link href="/login">Sign in</Link>}
          />
        </div>
        <div className="mt-5 max-w-2xl border-t border-border/50 pt-4">
          <p className="text-primary/80 text-[11px] font-medium tracking-[0.18em] uppercase">
            {SOURCES_HEADING}
          </p>
          <p className="text-muted-foreground mt-2 text-[11px] leading-snug sm:text-[11.5px]">
            Every acceptance rate on eNroute is traceable to a named, published source. United States
            figures come from the U.S. Department of Education&rsquo;s College Scorecard, the federal
            dataset compiled from institutions&rsquo; own IPEDS submissions. The wider catalogue is
            built on the Research Organization Registry, an openly licensed registry of higher
            education and research institutions. Where a university publishes its own admissions
            statistics, those figures are taken from the institution&rsquo;s page and stored with the
            source URL and the year they refer to. For schools that publish no rate at all,
            selectivity is inferred from established world rankings and shown as a proxy rather than
            a measurement. And where no credible figure exists, the card says so and marks the
            estimate as an estimate &mdash; a number you can check is worth more than one that merely
            looks precise.
          </p>
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
