import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Globe2, ScaleIcon, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Why we built eNroute",
  description: "Why eNroute exists, who builds it, and the principles behind every number it shows.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Why we built eNroute</h1>
      <p className="mt-2 text-muted-foreground">
        Built by a student who was in the middle of this, for students still in it.
      </p>

      <div className="mt-8 flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
          NK
        </div>
        <div>
          <p className="text-sm font-semibold">Nuh Khan</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            A student and founder who believes the choices we make today shape the opportunities we
            have tomorrow. I built eNroute to help students move forward with clarity, not
            uncertainty.
          </p>
        </div>
      </div>

      <Section icon={<Compass className="size-4 text-sky-400" />} title="The problem">
        <p>
          Applying abroad, the honest answer to &ldquo;do I have a chance here?&rdquo; is
          surprisingly hard to get. Counsellors are stretched, consultants are expensive, and the
          free tools online are built almost entirely around US applicants with a US GPA. If your
          record is IB points, A Level grades or a CBSE percentage, most of them either refuse it or
          quietly convert it into something it isn&apos;t.
        </p>
        <p className="mt-3">
          So students end up guessing &mdash; applying to a list that&apos;s all reaches, or all safe
          bets, and finding out which in April.
        </p>
      </Section>

      <Section icon={<ScaleIcon className="size-4 text-emerald-400" />} title="Reading each system on its own terms">
        <p>
          An IB 6 at Higher Level, an A Level B and an 85% on a board exam are not the same thing,
          and flattening them into one number loses exactly the information that matters. eNroute
          assesses each against what it actually signals, including whether you took a subject at the
          level your field expects.
        </p>
        <p className="mt-3">
          The same applies to countries. A UK offer turns on subject-specific grades and your stated
          course; Indian admission is largely performance against a cutoff; US admission weighs a
          broader picture. One formula applied everywhere would be wrong in five of six places, so we
          weight the factors differently per country.
        </p>
      </Section>

      <Section icon={<ShieldCheck className="size-4 text-violet-400" />} title="Honest before impressive">
        <p>
          It would be easy to show a confident number for every university. It would also be useless.
          Where a real published acceptance rate exists we use it; where it doesn&apos;t, the card
          says the figure is our estimate and carries lower confidence. Nothing we derive is ever
          dressed up as a published statistic.
        </p>
        <p className="mt-3">
          We&apos;re also deliberately strict at the most selective universities. A tool that tells a
          strong but ordinary applicant they&apos;re comfortable at a four-percent-admit school
          isn&apos;t being encouraging, it&apos;s being wrong in the direction that costs someone a
          place on their list. How each figure is produced is set out on the{" "}
          <Link href="/data-sources" className="text-primary underline underline-offset-4">
            data sources and methodology
          </Link>{" "}
          page.
        </p>
      </Section>

      <Section icon={<Globe2 className="size-4 text-amber-400" />} title="Where it's going">
        <p>
          Six countries today &mdash; the United States, United Kingdom, India, Australia, Singapore
          and Hong Kong &mdash; and over 2,000 universities. It is still growing, and it is still one
          person building it.
        </p>
        <p className="mt-3">
          If something is wrong, missing, or just confusing, I&apos;d genuinely rather hear it than
          not. You can{" "}
          <Link href="/contact" className="text-primary underline underline-offset-4">
            get in touch here
          </Link>
          .
        </p>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </h2>
      <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
