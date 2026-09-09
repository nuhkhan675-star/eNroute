import Link from "next/link";
import { BrandN } from "@/components/layout/Logo";
import { LandingPage } from "@/components/home/LandingPage";
import { SignedInHome } from "@/components/home/SignedInHome";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUserFullName } from "@/lib/db/users";
import { getLatestAnalysis } from "@/lib/db/analyses";
import type { AcademicAnalysis, ExtracurricularAnalysis } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";

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

export default async function Home() {
  const user = await getCurrentUser();

  const profile = user ? await getProfileByUserId(user.id) : null;
  const fullName = user ? await getUserFullName(user.id) : null;
  const firstName = fullName?.split(" ")[0] ?? null;

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
      <SignedInHome
        greeting={firstName ? randomGreeting(RETURNING_GREETINGS, firstName) : "Welcome back"}
        fieldOfInterest={profile.fieldOfInterest?.name ?? null}
        profileStrength={profile.profileStrength}
        strengths={strengths}
        weaknesses={weaknesses}
      />
    );
  }

  // Signed in, but nothing to show yet. Without this branch a logged-in
  // student with no profile landed on the same marketing hero as a stranger,
  // which is both confusing and a dead end -- the page pitched the product
  // they had already signed up for and never said what to do next.
  if (user) {
    const started = profile != null;
    return (
      <div className="flex flex-1 flex-col overflow-x-clip">
        <section className="relative w-full px-6 py-24">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] opacity-60"
            style={{
              background:
                "radial-gradient(50% 45% at 50% 8%, color-mix(in oklch, var(--primary), transparent 84%), transparent)",
            }}
          />
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 text-center">
            <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
              {firstName ? randomGreeting(FIRST_TIME_GREETINGS, firstName) : "Welcome"}
            </span>

            <p className="text-4xl font-bold tracking-tight sm:text-5xl">
              e<BrandN className="drop-shadow-[0_0_20px_color-mix(in_oklch,var(--primary),transparent_70%)]" />route
            </p>

            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {started ? "One step left" : "Let's build your profile"}
              </h1>
              <p className="mt-3 text-muted-foreground">
                {started
                  ? "You started your profile but it hasn't been analysed yet. Pick up where you left off and we'll rate it."
                  : "Tell us what you're studying and what you've done outside class. It takes a few minutes, and everything after this depends on it."}
              </p>
            </div>

            <ol className="flex w-full flex-col gap-3 text-left">
              {[
                "Your curriculum, subjects and grades — on their own scale, not converted to a GPA.",
                "Your activities, and what you actually did in them.",
                "We rate the profile, then estimate your chances at universities across six countries.",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>

            <Button
              size="lg"
              className="h-12 gap-2 px-8 text-base shadow-[0_0_18px_-8px_var(--primary)] transition-shadow hover:shadow-[0_0_28px_-6px_var(--primary)]"
              nativeButton={false}
              render={
                <Link href="/onboarding">
                  {started ? "Finish your profile" : "Start your profile"} <ArrowRight className="size-4" />
                </Link>
              }
            />
          </div>
        </section>

      </div>
    );
  }

  return <LandingPage />;
}
