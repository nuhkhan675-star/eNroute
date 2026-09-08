import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Gauge, Plus, ScaleIcon, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQs · eNroute",
  description: "How to read the numbers eNroute gives you, and what sits behind them.",
};

// Questions students actually hit while using this specific product -- what a
// number means, why two similar schools differ, why a figure moved -- rather
// than a generic product FAQ. Where a capability doesn't exist yet, the answer
// says so instead of implying a button that isn't there.
type Faq = { q: string; a: React.ReactNode };
type Group = { title: string; icon: React.ReactNode; blurb: string; items: Faq[] };

const GROUPS: Group[] = [
  {
    title: "Reading your results",
    icon: <Gauge className="size-4 text-sky-400" />,
    blurb: "What the numbers on a university card are telling you, and what they aren't.",
    items: [
      {
        q: "What does the percentage on a university actually mean?",
        a: (
          <>
            It&apos;s our estimate of how you compare with the people who typically get in there,
            expressed as a chance. It is not a prediction of a decision, and it isn&apos;t an average of
            anything. Read it the way you&apos;d read a weather forecast: useful for planning, not a
            promise about Tuesday.
          </>
        ),
      },
      {
        q: "Why does one university show an acceptance rate and another just says “our estimate”?",
        a: (
          <>
            Because one published its numbers and the other didn&apos;t. We use the strongest evidence
            available for each university, in a fixed order: a real published acceptance rate first, then
            its world ranking as a proxy, then our own model. The label on the card always tells you which
            of those you&apos;re looking at, and estimates carry lower confidence on purpose. The{" "}
            <Link href="/data-sources" className="text-primary underline underline-offset-4">
              methodology page
            </Link>{" "}
            sets out the full hierarchy.
          </>
        ),
      },
      {
        q: "Two universities are ranked about the same. Why are my chances so different?",
        a: (
          <>
            Usually because ranking and selectivity aren&apos;t the same thing &mdash; a strong research
            university can admit a large share of applicants, and a smaller teaching-focused one can be
            far harder to get into. It can also be subject fit: if one of them actually teaches your field
            and the other doesn&apos;t, that moves the number.
          </>
        ),
      },
      {
        q: "My profile strength says 7.7/10. Is that my chance of getting in?",
        a: (
          <>
            No &mdash; those are separate things. Profile strength summarises your academics and activities
            on their own, with no university involved. Your chances are that profile measured against one
            specific university&apos;s selectivity. A strong profile can still be a reach at a school that
            admits four percent of applicants.
          </>
        ),
      },
    ],
  },
  {
    title: "How you're assessed",
    icon: <ScaleIcon className="size-4 text-emerald-400" />,
    blurb: "What we look at in your profile, and why the same record scores differently in different places.",
    items: [
      {
        q: "How do you read HL versus SL, or grades from different boards?",
        a: (
          <>
            On each system&apos;s own terms. An IB 6 at Higher Level, an A Level B and an 85% on a CBSE
            board exam are not converted into a shared GPA and compared &mdash; they&apos;re assessed
            against what each actually signals, including whether you took a subject at the level your
            field expects. Maths at SL when you&apos;re applying for finance is a fit issue, and we&apos;ll
            say so.
          </>
        ),
      },
      {
        q: "Does the same profile get judged differently in different countries?",
        a: (
          <>
            Yes, deliberately. UK offers hinge largely on subject-specific grades and your stated course.
            Indian admission is mostly performance against a cutoff. US admission weighs a broader picture
            including activities. We weight those factors differently per country rather than applying one
            formula everywhere, because applying one formula everywhere would be wrong in five of them.
          </>
        ),
      },
      {
        q: "It listed something as a weakness that I think is a good grade.",
        a: (
          <>
            Then it was a bug, and it&apos;s fixed. A grade only counts against you in absolute terms
            &mdash; roughly an IB 4 or below, a C or below, or under about 60%. A 6 sitting next to a 7, or
            an A next to an A*, is an excellent result and will never be listed as a weakness.
            Subject-choice gaps that genuinely matter for your field are still raised, because those are
            about fit rather than performance.
          </>
        ),
      },
      {
        q: "I edited my profile and my percentages moved. Did something break?",
        a: (
          <>
            No. Analyses are calculated from your profile as it stood, so adding a subject, a test score or
            an activity re-scores you. Adding real detail usually helps; removing it usually doesn&apos;t
            hurt so much as leave us with less to credit you for. If a number moves a long way from one
            small edit, we&apos;d genuinely like to know &mdash; that&apos;s worth an email.
          </>
        ),
      },
    ],
  },
  {
    title: "Using eNroute",
    icon: <Compass className="size-4 text-violet-400" />,
    blurb: "Finding universities, and what gets checked for you automatically.",
    items: [
      {
        q: "I can't find a university in the search box.",
        a: (
          <>
            Try its short form &mdash; NUS, HKU, IIT, LSE all work, and so do partial names. If it still
            isn&apos;t there, it may not be in our catalogue yet; tell us and we&apos;ll look at adding it.
            Any university we do hold can be analysed on demand, whether or not it appears in your
            recommendations.
          </>
        ),
      },
      {
        q: "How many universities do you check for me?",
        a: (
          <>
            Around twenty, chosen to span the range from comfortable to genuine reach across every country
            you&apos;ve selected &mdash; not the twenty most famous, and not twenty safe bets. You can
            analyse any other university yourself from{" "}
            <Link href="/universities" className="text-primary underline underline-offset-4">
              Explore universities
            </Link>
            , and the result is saved so looking at it again is instant.
          </>
        ),
      },
    ],
  },
  {
    title: "Your data and account",
    icon: <ShieldCheck className="size-4 text-amber-400" />,
    blurb: "Who sees what you enter, what it costs, and how to leave.",
    items: [
      {
        q: "Who sees what I type in?",
        a: (
          <>
            Your profile is stored against your account and used to produce your own analyses. Writing that
            assessment means sending the relevant academic and activity details to an AI provider, without
            your name or email attached. Nothing goes to universities, agents or advertisers, and nothing
            is sold. The full detail is on the{" "}
            <Link href="/terms" className="text-primary underline underline-offset-4">
              terms and privacy
            </Link>{" "}
            page.
          </>
        ),
      },
      {
        q: "What does it cost, and how do I get my account removed?",
        a: (
          <>
            It&apos;s free. To have your account and everything attached to it deleted, email{" "}
            <a
              href="mailto:enrouteuniadvisor@gmail.com"
              className="text-primary underline underline-offset-4"
            >
              enrouteuniadvisor@gmail.com
            </a>{" "}
            from the address you signed up with &mdash; we do it by hand, as there&apos;s no self-serve
            button for it yet.
          </>
        ),
      },
    ],
  },
];

export default function FaqsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Questions students ask us</h1>
      <p className="mt-2 text-muted-foreground">
        Mostly about how to read the numbers. Anything missing? Email{" "}
        <a href="mailto:enrouteuniadvisor@gmail.com" className="text-primary underline underline-offset-4">
          enrouteuniadvisor@gmail.com
        </a>
        .
      </p>

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {group.icon}
            {group.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{group.blurb}</p>

          <div className="mt-4 flex flex-col gap-3">
            {group.items.map((item) => (
              // Native <details> rather than a JS accordion: it opens without
              // hydration, is keyboard- and screen-reader-accessible for free,
              // and browser find-in-page can reach the answers.
              <details
                key={item.q}
                className="group rounded-xl border border-border bg-card transition-colors open:border-primary/40"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <Plus className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45" />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
