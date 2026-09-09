import Link from "next/link";
import { BrandN } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Starfield } from "@/components/home/Starfield";
import { Globe } from "@/components/home/Globe";
import { FloatingOdds } from "@/components/home/FloatingOdds";
import { Reveal } from "@/components/home/Reveal";
import { ArrowRight, BarChart3, FileText, Globe2, Search, Sparkles } from "lucide-react";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "India",
  "Australia",
  "Singapore",
  "Hong Kong",
];

const STEPS = [
  {
    n: "01",
    icon: FileText,
    title: "Enter your record once",
    body: "Your curriculum, subjects and grades on their own scale — IB points, A Level grades, a CBSE percentage — plus the activities you actually did.",
  },
  {
    n: "02",
    icon: Search,
    title: "Pick your countries",
    body: "Target one or six. Recommendations are ranked across all of them at once, spanning comfortable through to genuine reach.",
  },
  {
    n: "03",
    icon: BarChart3,
    title: "See where you stand",
    body: "A chance estimate per university, with the reasoning behind it — your strengths, the gaps, and what would move the number.",
  },
];

// Every figure here is one we can point at in the database. Nothing invented:
// a made-up "prediction accuracy" would be the exact thing this product is
// supposed to be an antidote to.
const STATS = [
  { value: "2,100+", label: "Universities" },
  { value: "6", label: "Countries" },
  { value: "8", label: "Curricula understood" },
  { value: "70", label: "Fields of study" },
];

const EVIDENCE = [
  {
    tier: "Best",
    title: "A published acceptance rate",
    body: "Where a university or a government registry publishes real application and admission counts, that is what we use. Highest confidence.",
    tone: "text-emerald-300 ring-emerald-400/25 bg-emerald-400/10",
  },
  {
    tier: "Next",
    title: "Its world ranking, as a proxy",
    body: "Most countries publish enrolment but never applications, so a true rate often doesn't exist. Ranking places the school on the spectrum instead.",
    tone: "text-sky-300 ring-sky-400/25 bg-sky-400/10",
  },
  {
    tier: "Last",
    title: "Our own estimate",
    body: "When neither exists we say so on the card, and the confidence drops. Nothing we derive is ever presented as a published figure.",
    tone: "text-amber-300 ring-amber-400/25 bg-amber-400/10",
  },
];

// Illustrative, and labelled as such on the page -- these are what a result
// looks like, not real students' records.
const EXAMPLES = [
  {
    initials: "SA",
    name: "Computer Science applicant",
    record: "1480 SAT · AP",
    rows: [
      { school: "MIT", band: "Reach" },
      { school: "Michigan", band: "Target" },
      { school: "Arizona State", band: "Likely" },
    ],
  },
  {
    initials: "AR",
    name: "Engineering applicant",
    record: "CBSE 94% · JEE",
    rows: [
      { school: "IIT Bombay", band: "Reach" },
      { school: "BITS Pilani", band: "Target" },
      { school: "NUS", band: "Reach" },
    ],
  },
  {
    initials: "EM",
    name: "Economics applicant",
    record: "A*AA A Levels",
    rows: [
      { school: "Oxford", band: "Reach" },
      { school: "UCL", band: "Target" },
      { school: "Melbourne", band: "Likely" },
    ],
  },
];

const BAND_STYLES: Record<string, string> = {
  Reach: "bg-orange-500/15 text-orange-300 border-orange-500/40",
  Target: "bg-blue-500/15 text-blue-300 border-blue-500/40",
  Likely: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
};

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative flex min-h-[calc(100vh-4rem)] w-full items-center px-6 py-20">
        <Starfield className="pointer-events-none absolute inset-0 -z-20 size-full" />
        {/* The globe sits behind the copy, large and dim: it should register as
            "this is global" at a glance without competing with the headline. */}
        <Globe className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[min(92vw,40rem)] -translate-x-1/2 -translate-y-1/2 opacity-55" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] opacity-70"
          style={{
            background:
              "radial-gradient(55% 45% at 50% 12%, color-mix(in oklch, var(--primary), transparent 82%), transparent)",
          }}
        />
        <FloatingOdds />

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-7 text-center">
          <Reveal>
            <p className="text-5xl font-bold tracking-tight sm:text-6xl">
              e<BrandN className="drop-shadow-[0_0_22px_color-mix(in_oklch,var(--primary),transparent_65%)]" />
              route
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Know where you actually fit.</h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Admission chance estimates across six countries, read from your curriculum on its own
              terms — and shown with the reasoning behind every number.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Globe2 className="size-3.5" /> Covering
              </span>
              {COUNTRIES.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base shadow-[0_0_18px_-8px_var(--primary)] transition-shadow hover:shadow-[0_0_30px_-6px_var(--primary)]"
                nativeButton={false}
                render={
                  <Link href="/signup">
                    Sign in to get started <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 text-base"
                nativeButton={false}
                render={<Link href="/about">How it works</Link>}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Free to use. No card, no consultant.</p>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- three steps */}
      <section className="w-full border-t border-border bg-gradient-to-b from-transparent to-primary/5 px-6 py-24">
        <div className="mx-auto w-full max-w-6xl">
          <Reveal className="text-center">
            <span className="text-xs font-medium tracking-widest text-primary uppercase">How it works</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Three steps, then a straight answer
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card p-7 transition-colors hover:border-primary/40">
                  <span className="pointer-events-none absolute -top-3 right-4 text-6xl font-bold text-primary/10">
                    {s.n}
                  </span>
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <s.icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 text-base font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ the numbers */}
      <section className="w-full border-t border-border px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <Reveal className="text-center">
            <span className="text-xs font-medium tracking-widest text-primary uppercase">By the numbers</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              What&apos;s actually in the database
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 70}>
                <div className="rounded-2xl border border-border bg-card px-4 py-7 text-center">
                  <p className="text-3xl font-bold tracking-tight text-primary">{s.value}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- evidence ladder */}
      <section className="w-full border-t border-border bg-gradient-to-b from-transparent to-primary/5 px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <Reveal className="text-center">
            <span className="text-xs font-medium tracking-widest text-primary uppercase">How we decide</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Real data first, and we say when it isn&apos;t
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Every university is placed using the strongest evidence available for it, in a fixed
              order. The card always tells you which one you&apos;re looking at.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {EVIDENCE.map((e, i) => (
              <Reveal key={e.title} delay={i * 90}>
                <div className="h-full rounded-2xl border border-border bg-card p-7">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ring-1 ${e.tone}`}>
                    {e.tier}
                  </span>
                  <h3 className="mt-4 text-base font-semibold">{e.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={280} className="mt-8 text-center">
            <Link
              href="/data-sources"
              className="text-sm text-primary underline underline-offset-4 hover:no-underline"
            >
              Read the full methodology
            </Link>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- example results */}
      <section className="w-full border-t border-border px-6 py-24">
        <div className="mx-auto w-full max-w-5xl">
          <Reveal className="text-center">
            <span className="text-xs font-medium tracking-widest text-primary uppercase">What you get</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              A balanced list, not twenty reaches
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Illustrative examples of how different records land across countries.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {EXAMPLES.map((p, i) => (
              <Reveal key={p.name} delay={i * 90}>
                <div className="h-full rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {p.initials}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.record}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-2.5">
                    {p.rows.map((r) => (
                      <div key={r.school} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">{r.school}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BAND_STYLES[r.band]}`}
                        >
                          {r.band}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- final CTA */}
      <section className="w-full border-t border-border px-6 py-24">
        <Reveal className="mx-auto w-full max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center">
            <div
              className="pointer-events-none absolute inset-0 -z-10 opacity-80"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--primary), transparent 86%), transparent)",
              }}
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-medium tracking-wide text-primary uppercase">
              <Sparkles className="size-3.5" /> Free to start
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
              Ready to find where you fit?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Build your profile once and get chance estimates across every country you&apos;re
              considering.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base shadow-[0_0_18px_-8px_var(--primary)]"
                nativeButton={false}
                render={
                  <Link href="/signup">
                    Sign in to get started <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="ghost"
                className="h-12 px-6 text-base"
                nativeButton={false}
                render={<Link href="/login">I already have an account</Link>}
              />
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
