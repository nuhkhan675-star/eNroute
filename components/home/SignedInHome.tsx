import Link from "next/link";
import { BrandN } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Starfield } from "@/components/home/Starfield";
import { FloatingCrests } from "@/components/home/FloatingCrests";
import { Reveal } from "@/components/home/Reveal";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Compass,
  SquarePen,
} from "lucide-react";

const SHORTCUTS = [
  {
    href: "/universities",
    icon: Compass,
    title: "Explore universities",
    body: "Your ranked matches, plus any school you want to check on demand.",
    tone: "text-sky-300 bg-sky-400/10 ring-sky-400/20",
  },
  {
    href: "/saved",
    icon: Bookmark,
    title: "Saved schools",
    body: "The shortlist you're actually building, in one place.",
    tone: "text-amber-300 bg-amber-400/10 ring-amber-400/20",
  },
  {
    href: "/application-info",
    icon: BookOpen,
    title: "Application info",
    body: "What each country asks for, and what it weighs most heavily.",
    tone: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/20",
  },
];

interface Props {
  greeting: string;
  fieldOfInterest: string | null;
  profileStrength: number;
  strengths: string[];
  weaknesses: string[];
}

export function SignedInHome({ greeting, fieldOfInterest, profileStrength, strengths, weaknesses }: Props) {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <section className="relative w-full px-6 pt-16 pb-10">
        <Starfield className="pointer-events-none absolute inset-0 -z-20 size-full" />
        <FloatingCrests />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] opacity-60"
          style={{
            background:
              "radial-gradient(50% 45% at 50% 6%, color-mix(in oklch, var(--primary), transparent 84%), transparent)",
          }}
        />

        <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
          <Reveal className="text-center">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
              {greeting}
            </span>
            <p className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
              e<BrandN className="drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary),transparent_70%)]" />
              route
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your profile at a glance</h1>
            {fieldOfInterest && <p className="mt-2 text-muted-foreground">Interested in {fieldOfInterest}</p>}
          </Reveal>

          <Reveal delay={80}>
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
              <div
                className="pointer-events-none absolute inset-0 -z-10 opacity-80"
                style={{
                  background:
                    "radial-gradient(70% 100% at 0% 0%, color-mix(in oklch, var(--primary), transparent 90%), transparent)",
                }}
              />
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">Profile strength</span>
                <span className="text-2xl font-bold tracking-tight text-primary">
                  {profileStrength.toFixed(1)}
                  <span className="text-sm font-medium text-muted-foreground"> / 10</span>
                </span>
              </div>
              <Progress value={profileStrength * 10} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">
                A composite of your academic and extracurricular analyses &mdash; not an admission
                probability.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2">
            <Reveal delay={140}>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 className="size-4" /> Why this rating &mdash; strengths
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-400">&bull;</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <AlertCircle className="size-4" /> Why this rating &mdash; weaknesses
                </h2>
                {weaknesses.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                    {weaknesses.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-400">&bull;</span> {s}
                      </li>
                    ))}
                  </ul>
                ) : (
                  // A profile of straight 6s, 7s and A*s genuinely has none, and
                  // the analyst is told to say so rather than invent one.
                  <p className="mt-3 text-sm text-muted-foreground">
                    No material weaknesses stood out in your record.
                  </p>
                )}
              </div>
            </Reveal>
          </div>

          <Reveal delay={260}>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base shadow-[0_0_18px_-8px_var(--primary)] transition-shadow hover:shadow-[0_0_28px_-6px_var(--primary)]"
                nativeButton={false}
                render={
                  <Link href="/universities">
                    See your matches <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                className="h-12 gap-2 border-border px-8 text-base hover:border-primary/50 hover:bg-primary/10"
                nativeButton={false}
                render={
                  <Link href="/onboarding">
                    <SquarePen className="size-4" /> Edit &amp; re-analyse
                  </Link>
                }
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Where to go next. Without these the page was a report with no exits --
          you read your rating and then had to find the nav yourself. */}
      <section className="w-full border-t border-border bg-gradient-to-b from-transparent to-primary/5 px-6 py-20">
        <div className="mx-auto grid w-full max-w-5xl gap-5 sm:grid-cols-3">
          {SHORTCUTS.map((s, i) => (
            <Reveal key={s.href} delay={i * 90}>
              <Link
                href={s.href}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <span className={`inline-flex size-11 items-center justify-center rounded-xl ring-1 ${s.tone}`}>
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 flex items-center gap-1.5 text-base font-semibold">
                  {s.title}
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
