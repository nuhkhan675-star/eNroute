import type { Metadata } from "next";
import { Database, Layers, ShieldCheck, TriangleAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Data sources & methodology · eNroute",
  description:
    "Where eNroute's admissions data comes from, how a chance estimate is produced, and what the numbers can't tell you.",
};

const SOURCES: { region: string; source: string; note: string }[] = [
  {
    region: "United States",
    source: "U.S. Department of Education — College Scorecard (IPEDS)",
    note: "Applications, admissions and enrolment reported by institutions themselves. The only national dataset in our coverage that publishes application counts, which is why US acceptance rates are the most solid figures we hold.",
  },
  {
    region: "Australia",
    source: "TISC application statistics",
    note: "Published admission figures for the current cycle, used where an institution-level rate is derivable.",
  },
  {
    region: "Hong Kong",
    source: "University Grants Committee programme list, via data.gov.hk",
    note: "The full list of UGC-funded programmes, which is what tells us which fields each Hong Kong university actually teaches.",
  },
  {
    region: "All countries",
    source: "Institutions' own published admissions statistics",
    note: "Common Data Set filings and figures published directly by universities. Each rate is stored against the source it was taken from.",
  },
  {
    region: "All countries",
    source: "Research Organization Registry (ROR) and official institution websites",
    note: "Used to establish which institutions exist, their country and their web presence — not for selectivity.",
  },
];

export default function DataSourcesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Data sources &amp; methodology</h1>
      <p className="mt-2 text-muted-foreground">
        What sits behind a number on this site, and how much weight it deserves.
      </p>

      <Section icon={<Database className="size-4 text-sky-400" />} title="Where the data comes from">
        <p>
          Official and government publications wherever they exist, and universities&apos; own published
          figures where they don&apos;t. Every acceptance rate we store is recorded against its source,
          so a figure can always be traced back.
        </p>
        <div className="mt-5 flex flex-col gap-4">
          {SOURCES.map((s) => (
            <div key={s.source} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.region}</p>
              <p className="mt-1 text-sm font-medium text-foreground">{s.source}</p>
              <p className="mt-1 text-sm">{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<TriangleAlert className="size-4 text-amber-400" />} title="A limitation worth stating plainly">
        <p>
          National education registries almost everywhere publish <em>enrolment</em> — how many students
          started — but never <em>applications</em>. Without both numbers an acceptance rate cannot be
          calculated. The United States is the exception, because IPEDS requires institutions to report
          applications received.
        </p>
        <p className="mt-3">
          So for a large share of universities outside the US, a published acceptance rate genuinely does
          not exist anywhere. We would rather say that than manufacture a figure.
        </p>
      </Section>

      <Section icon={<Layers className="size-4 text-emerald-400" />} title="How an estimate is produced">
        <p>Two stages, in this order.</p>
        <p className="mt-3">
          <strong className="text-foreground">1. Place the university.</strong> We establish how selective
          it is using the strongest evidence available, in strict priority: a published acceptance rate
          first; failing that, its world ranking as a proxy; failing that, a model estimate. Real data
          always wins — a lower tier is only ever reached when the one above it is empty.
        </p>
        <p className="mt-3">
          <strong className="text-foreground">2. Place you against it.</strong> Your profile is scored on
          academic performance, subject fit for your field, extracurricular evidence and how you meet
          stated entry requirements. Those are combined using weights that differ by country, because
          admissions differ by country: UK decisions turn heavily on subject-specific grades, Indian ones
          largely on exam performance against a cutoff, US ones on a wider picture. The result is anchored
          to the university&apos;s real selectivity rather than floating free.
        </p>
      </Section>

      <Section icon={<ShieldCheck className="size-4 text-violet-400" />} title="How confident we are, and how you can tell">
        <p>
          Every estimate carries the basis it rests on, in plain words on the card. A figure derived from
          a published acceptance rate is described as such. One derived from world ranking says so. One
          produced by the model says so, and carries low confidence. Nothing we estimate is ever presented
          as a published statistic.
        </p>
        <p className="mt-3">
          The model is deliberately strict at the most selective universities. If a tool tells a strong
          but ordinary applicant they have a comfortable chance at a single-digit-admit-rate school, the
          tool is broken. An estimate that errs low is recoverable; one that errs high costs someone a
          place on their list.
        </p>
      </Section>

      <Section icon={<TriangleAlert className="size-4 text-amber-400" />} title="What this cannot tell you">
        <p>
          Essays, recommendations, interviews, portfolios, demonstrated interest, an admissions
          committee&apos;s priorities in a given year, and your personal context are all invisible to us.
          They routinely decide outcomes. Treat every number here as a way to build a balanced list, never
          as a prediction of a decision.
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
