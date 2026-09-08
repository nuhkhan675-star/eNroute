import type { Metadata } from "next";
import { Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "FAQs · eNroute",
  description: "How eNroute estimates your admission chances, what data it uses, and what it can't tell you.",
};

// Answers are written against what the product actually does. Where a
// capability doesn't exist yet (self-serve account deletion), the answer says
// how to get it done rather than implying a button that isn't there.
const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is eNroute?",
    a: (
      <>
        An admissions advisor for 11th and 12th graders applying abroad. You enter your curriculum,
        grades and activities once, and eNroute estimates your chances at universities across six
        countries &mdash; with the reasoning behind every number, not just the number.
      </>
    ),
  },
  {
    q: "How is my chance percentage worked out?",
    a: (
      <>
        In two stages. First we place the university on a selectivity scale using the best evidence
        available for it: a published acceptance rate where one exists, otherwise its world ranking,
        otherwise our own estimate. Then we score your profile across academics, subject fit,
        extracurriculars and entry requirements, and combine those into one figure anchored to that
        university&apos;s real selectivity. The weighting differs by country, because what matters
        differs by country &mdash; UK admissions turn heavily on subject-specific grades, Indian ones
        largely on exam performance against a cutoff, US ones on a broader picture.
      </>
    ),
  },
  {
    q: "Does a high percentage mean I'll get in?",
    a: (
      <>
        No, and you should be sceptical of any tool that implies otherwise. It&apos;s an estimate built
        from published data and what you told us. Admissions committees weigh essays, recommendations,
        interviews and context we simply can&apos;t see. We&apos;re deliberately strict at the most
        selective universities &mdash; a number that looks too generous there is a broken model, not
        good news.
      </>
    ),
  },
  {
    q: "Which curricula can I enter?",
    a: (
      <>
        IB Diploma, A Levels, AP, the American High School Diploma, the Australian Curriculum, CBSE,
        ICSE and ISC. You can also add Grade 9, 10 and 11 results from your secondary board, which are
        assessed as evidence in their own right rather than as background.
      </>
    ),
  },
  {
    q: "Which countries does eNroute cover?",
    a: (
      <>
        The United States, United Kingdom, India, Australia, Singapore and Hong Kong &mdash; over 2,000
        universities in total. You pick which of them you&apos;re targeting, and recommendations are
        ranked across all of your choices at once rather than one country at a time.
      </>
    ),
  },
  {
    q: "Where does the data come from?",
    a: (
      <>
        Official and government sources wherever they publish: the U.S. Department of Education&apos;s
        College Scorecard, Australia&apos;s TISC application statistics, Hong Kong&apos;s UGC programme
        list, and universities&apos; own published admissions figures. Every acceptance rate we store is
        tied to the source it came from.
      </>
    ),
  },
  {
    q: "What if there's no published data for a university?",
    a: (
      <>
        We say so, on the card. Most countries&apos; registries publish enrolment but never application
        numbers, so a real acceptance rate genuinely doesn&apos;t exist for many universities. In those
        cases the estimate is labelled as ours &mdash; derived from world ranking, or from the model
        itself &mdash; and carries lower confidence. It is never dressed up as a published figure.
      </>
    ),
  },
  {
    q: "Is my information private?",
    a: (
      <>
        Your profile and results are stored against your account and used only to produce your own
        analyses. We don&apos;t sell your data or share it with universities, agents or advertisers.
      </>
    ),
  },
  {
    q: "Does it cost anything?",
    a: <>No. eNroute is free to use.</>,
  },
  {
    q: "Can I delete my account and everything in it?",
    a: (
      <>
        Yes &mdash; email{" "}
        <a
          href="mailto:enrouteuniadvisor@gmail.com"
          className="text-primary underline underline-offset-4"
        >
          enrouteuniadvisor@gmail.com
        </a>{" "}
        from the address you signed up with and your account and profile will be removed. There
        isn&apos;t a self-serve button for this yet.
      </>
    ),
  },
];

export default function FaqsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h1>
      <p className="mt-2 text-muted-foreground">
        Can&apos;t find what you&apos;re looking for? Email{" "}
        <a
          href="mailto:enrouteuniadvisor@gmail.com"
          className="text-primary underline underline-offset-4"
        >
          enrouteuniadvisor@gmail.com
        </a>
        .
      </p>

      <div className="mt-10 flex flex-col gap-3">
        {FAQS.map((item) => (
          // Native <details> rather than a JS accordion: it opens without
          // hydration, is keyboard- and screen-reader-accessible for free, and
          // browser find-in-page can reach the answers.
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
    </div>
  );
}
