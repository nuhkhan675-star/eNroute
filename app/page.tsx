import Link from "next/link";
import { BrandN } from "@/components/layout/Logo";
import { HomeScrollHero } from "@/components/home/HomeScrollHero";
import { Database, Brain, MessageCircle, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUserFullName } from "@/lib/db/users";
import { getLatestAnalysis } from "@/lib/db/analyses";
import type { AcademicAnalysis, ExtracurricularAnalysis } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FounderSection } from "@/components/home/FounderSection";

const RETURNING_GREETINGS = [
  (name: string) => `Welcome back, ${name}`,
  (name: string) => `Good to see you again, ${name}`,
  (name: string) => `Hey ${name}, let's take another look`,
  (name: string) => `Glad you're here, ${name}`,
  (name: string) => `${name}, ready for an update?`,
];

const FIRST_TIME_GREETINGS = [
  (name: string) => `Welcome, ${name}`,
  (name: string) => `Hey ${name}, let's get started`,
  (name: string) => `Good to have you, ${name}`,
  (name: string) => `${name}, let's build your profile`,
];

function randomGreeting(templates: ((name: string) => string)[], name: string): string {
  return templates[Math.floor(Math.random() * templates.length)](name);
}

const PILLARS = [
  {
    icon: Database,
    title: "Built on real data",
    body: "University, program, tuition, and admissions facts come from a structured database with sources and verification dates — never invented.",
  },
  {
    icon: Brain,
    title: "AI that explains, not guesses",
    body: "Specialist analysts evaluate your academics, activities, and major fit. Classification into Reach, Target, or Likely is computed, not improvised.",
  },
  {
    icon: MessageCircle,
    title: "An advisor that knows your profile",
    body: "Every estimate comes with the reasoning behind it — strengths, gaps, and what to do next, tied to that specific university rather than generic advice.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfileByUserId(user.id) : null;
  const fullName = user ? await getUserFullName(user.id) : null;
  const firstName = fullName?.split(" ")[0] ?? null;
  const primaryHref = user ? "/onboarding" : "/signup";

  let academic: AcademicAnalysis | null = null;
  let extracurricular: ExtracurricularAnalysis | null = null;
  if (profile && profile.profileStrength != null) {
    const [academicRow, extracurricularRow] = await Promise.all([
      getLatestAnalysis(profile.id, "academic"),
      getLatestAnalysis(profile.id, "extracurricular"),
    ]);
    academic = (academicRow?.output as AcademicAnalysis) ?? null;
    extracurricular = (extracurricularRow?.output as ExtracurricularAnalysis) ?? null;
  }

  if (profile && profile.profileStrength != null && academic && extracurricular) {
    const strengths = [...academic.strengths, ...extracurricular.strengths];
    const weaknesses = [...academic.weaknesses, ...extracurricular.weaknesses];

    return (
      <div className="flex flex-1 flex-col overflow-x-clip">
        <section className="relative w-full px-6 py-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] opacity-60"
            style={{
              background:
                "radial-gradient(50% 45% at 50% 8%, color-mix(in oklch, var(--primary), transparent 84%), transparent)",
            }}
          />
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
            <div className="text-center">
              <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
                {firstName ? randomGreeting(RETURNING_GREETINGS, firstName) : "Welcome back"}
              </span>
              {/* The wordmark carries over to the signed-in homepage too, so the
                  brand is present rather than only appearing to logged-out
                  visitors. Sized well below the logged-out hero so it sits above
                  "Your profile at a glance" without competing with it. */}
              <p className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                e<BrandN className="drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary),transparent_70%)]" />route
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your profile at a glance</h1>
              {profile.fieldOfInterest && (
                <p className="mt-2 text-muted-foreground">Interested in {profile.fieldOfInterest.name}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-3">
                <Progress value={profile.profileStrength * 10} className="flex-1" />
                <span className="text-sm font-medium">{profile.profileStrength.toFixed(1)} / 10</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Profile strength -- a composite of your academic and extracurricular analyses, not an
                admission probability.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 className="size-4" /> Why this rating -- strengths
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-400">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400">
                  <AlertCircle className="size-4" /> Why this rating -- areas to strengthen
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {weaknesses.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-400">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-12 gap-2 px-8 text-base shadow-[0_0_18px_-8px_var(--primary)] transition-shadow hover:shadow-[0_0_28px_-6px_var(--primary)]"
                nativeButton={false}
                render={
                  <Link href="/onboarding">
                    Re-analyse your profile <ArrowRight className="size-4" />
                  </Link>
                }
              />
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-border px-8 text-base hover:border-primary/50 hover:bg-primary/10"
                nativeButton={false}
                render={<Link href="/universities">Browse universities</Link>}
              />
            </div>
          </div>
        </section>

        <FounderSection />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      {/* Scroll-scrubbed opening sequence: one pinned timeline the scrollbar
          scrubs, replacing the previous static hero. Everything below it is
          unchanged and resumes normal page flow. */}
      <HomeScrollHero
        primaryHref={primaryHref}
        greeting={firstName ? randomGreeting(FIRST_TIME_GREETINGS, firstName) : null}
      />

      <section className="relative w-full border-t border-border bg-gradient-to-b from-transparent to-primary/5 px-6 py-28">
        <div className="mx-auto grid w-full max-w-6xl gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/40"
            >
              <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />
              <p.icon className="size-8 text-primary" strokeWidth={1.75} />
              <h2 className="mt-5 text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <FounderSection />
    </div>
  );
}
