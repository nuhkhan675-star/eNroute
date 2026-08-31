import Link from "next/link";
import { Database, Brain, MessageCircle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
    body: "Chat with an advisor that has your full profile and prior analyses in context — not a generic chatbot starting from zero.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const primaryHref = user ? "/onboarding" : "/signup";

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden">
      <section className="relative flex min-h-[92vh] w-full flex-col items-center justify-center gap-8 px-6 text-center">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] opacity-70"
          style={{
            background:
              "radial-gradient(50% 45% at 50% 8%, color-mix(in oklch, var(--primary), transparent 35%), transparent)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 -z-20 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary uppercase">
          AI-Powered University Admissions Advisor
        </span>

        <h1 className="max-w-5xl text-6xl leading-[1.05] font-bold tracking-tight sm:text-7xl md:text-8xl">
          e<span className="text-primary drop-shadow-[0_0_40px_color-mix(in_oklch,var(--primary),transparent_30%)]">N</span>
          route
        </h1>

        <p className="max-w-xl text-2xl font-medium text-foreground/90 sm:text-3xl">
          Know where you stand. Know where you fit.
        </p>

        <p className="max-w-2xl text-lg text-muted-foreground">
          Build your academic and extracurricular profile once, and get university
          recommendations grounded in real program data — with transparent,
          confidence-rated admission estimates and a personal AI advisor to talk it through.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Button
            size="lg"
            className="h-12 gap-2 px-8 text-base shadow-[0_0_30px_-6px_var(--primary)] transition-shadow hover:shadow-[0_0_45px_-4px_var(--primary)]"
            nativeButton={false}
            render={
              <Link href={primaryHref}>
                Analyse your profile <ArrowRight className="size-4" />
              </Link>
            }
          />
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-white/15 px-8 text-base hover:border-primary/50 hover:bg-primary/10"
            nativeButton={false}
            render={<Link href="/universities">Search a specific university</Link>}
          />
        </div>
      </section>

      <section className="relative w-full border-t border-white/10 bg-gradient-to-b from-transparent to-primary/5 px-6 py-28">
        <div className="mx-auto grid w-full max-w-6xl gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card p-8 transition-colors hover:border-primary/40"
            >
              <div className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />
              <p.icon className="size-8 text-primary" strokeWidth={1.75} />
              <h2 className="mt-5 text-lg font-semibold">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full border-t border-white/10 px-6 py-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <span className="text-xs font-medium tracking-widest text-primary uppercase">Meet the Founder</span>
          <div className="flex size-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xl font-semibold text-primary">
            NK
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Nuh Khan</h2>
          <p className="max-w-xl leading-relaxed text-muted-foreground">
            I&rsquo;m a student passionate about business, technology, and creating solutions that make
            life easier for others. I founded eNroute to simplify the college admissions process and
            make reliable information more accessible to students. As a student myself, I know how
            confusing and time-consuming researching universities can be — so I built something to make
            that journey clearer, faster, and more approachable.
          </p>
        </div>
      </section>
    </div>
  );
}
