"use client";

import { useState } from "react";
import { COUNTRY_GUIDES, type CountryGuide } from "@/lib/content/applicationInfo";
import { ExternalLink, Quote } from "lucide-react";
import { CountryFlag } from "@/components/application-info/CountryFlag";

/**
 * The guide is read as one document with numbered parts, not a stack of
 * boxes. Order is the order a student actually meets these things: where
 * you apply, what to gather, then the three things that get judged.
 */
const SECTIONS: { id: string; title: string; render: (g: CountryGuide) => React.ReactNode }[] = [
  {
    id: "platform",
    title: "Where you apply",
    render: (g) => (
      <>
        <p>{g.platform.note}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {g.platform.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              {l.label} <ExternalLink className="size-3" />
            </a>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "needs",
    title: "What you'll need",
    render: (g) => (
      <ul className="flex flex-col gap-2.5">
        {g.needs.map((n) => (
          <li key={n} className="flex gap-3">
            <span className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-primary/70" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    ),
  },
  { id: "tests", title: "Tests", render: (g) => <p>{g.tests}</p> },
  { id: "essays", title: "Essays", render: (g) => <p>{g.essays}</p> },
  { id: "extracurriculars", title: "Extracurriculars", render: (g) => <p>{g.extracurriculars}</p> },
];

export default function ApplicationInfoPage() {
  const [active, setActive] = useState(COUNTRY_GUIDES[0].slug);
  const guide = COUNTRY_GUIDES.find((g) => g.slug === active) ?? COUNTRY_GUIDES[0];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">Application info</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          How applying works, country by country
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          What each system asks for and what it actually weighs. Researched per country, not the
          policy of any one university &mdash; always read your target school&apos;s own admissions
          page as well.
        </p>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16">
        {/* Country rail. Vertical and sticky on desktop so switching country
            never scrolls you back to the top; a horizontal strip on mobile. */}
        {/* min-w-0: the strip's six non-wrapping entries are ~780px of
            intrinsic width, and a scroll container still reports that as its
            min-content. Without this the grid track grew to fit it and the
            whole article ran off the right edge on phones. */}
        <nav aria-label="Country" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="hidden text-xs font-medium tracking-wide text-muted-foreground uppercase lg:block">
            Country
          </p>
          <ul className="-mx-6 flex gap-1 overflow-x-auto px-6 pb-2 lg:mx-0 lg:mt-3 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
            {COUNTRY_GUIDES.map((g) => {
              const isActive = g.slug === active;
              return (
                <li key={g.slug} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActive(g.slug)}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors " +
                      (isActive
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-card hover:text-foreground")
                    }
                  >
                    {/* Flags dim slightly when inactive so the active row
                        still reads as the highlighted one. */}
                    <CountryFlag
                      slug={g.slug}
                      className={
                        "h-[18px] w-[27px] shrink-0 rounded-[3px] ring-1 ring-white/15 transition-opacity " +
                        (isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100")
                      }
                    />
                    <span className="whitespace-nowrap">{g.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 hidden lg:block">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">On this page</p>
            <ol className="mt-3 flex flex-col gap-1.5 border-l border-border pl-4 text-sm">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-baseline gap-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="font-mono text-[11px] text-primary/70">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        {/* Keyed on the slug so a country switch re-mounts the article and
            replays the entrance, which reads as a page turn rather than text
            silently swapping underneath you. */}
        <article key={guide.slug} className="min-w-0 motion-safe:animate-[guide-in_.45s_ease-out_both]">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{guide.name}</h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">{guide.overview}</p>

          {/* The one thing that most changes how to prepare goes first, not
              last. It used to sit at the bottom, after everything it should
              have framed. */}
          <figure className="relative mt-8 max-w-2xl border-l-2 border-primary pl-6">
            <Quote className="absolute -top-1 -left-3 size-5 rounded-full bg-background p-0.5 text-primary" />
            <figcaption className="text-xs font-medium tracking-wide text-primary uppercase">
              What {guide.name} actually prioritises
            </figcaption>
            <blockquote className="mt-2 text-base leading-relaxed text-foreground/90">
              {guide.priorities}
            </blockquote>
          </figure>

          <ol className="mt-12 flex flex-col">
            {SECTIONS.map((s, i) => (
              <li
                key={s.id}
                id={s.id}
                className="relative grid scroll-mt-28 gap-4 border-l border-border pb-12 pl-8 last:pb-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8 sm:pl-10"
              >
                {/* Marker on the rail. The number is the wayfinding device,
                    matched to the contents list on the left. */}
                <span
                  aria-hidden
                  className="absolute top-0 -left-[13px] inline-flex size-[26px] items-center justify-center rounded-full border border-primary/40 bg-background font-mono text-[11px] font-semibold text-primary"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-sm font-semibold tracking-tight sm:pt-0.5">{s.title}</h3>
                <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{s.render(guide)}</div>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}
