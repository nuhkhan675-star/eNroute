"use client";

import { useState } from "react";
import { COUNTRY_GUIDES } from "@/lib/content/applicationInfo";
import { Card, CardContent } from "@/components/ui/card";
import {
  Link2,
  ListChecks,
  Trophy,
  FileText,
  PenLine,
  Target,
  ExternalLink,
} from "lucide-react";

export default function ApplicationInfoPage() {
  const [active, setActive] = useState(COUNTRY_GUIDES[0].slug);
  const guide = COUNTRY_GUIDES.find((g) => g.slug === active) ?? COUNTRY_GUIDES[0];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Application info</h1>
      <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
        How to apply, what each country actually looks at, and what to prepare — researched per
        country, not official policy from any specific university. Always check your target
        school&apos;s own admissions page too.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {COUNTRY_GUIDES.map((g) => (
          <button
            key={g.slug}
            type="button"
            onClick={() => setActive(g.slug)}
            className={
              "rounded-full border px-4 py-1.5 text-sm transition-colors " +
              (g.slug === active
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground")
            }
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <Card>
          <CardContent className="py-6">
            <h2 className="text-lg font-semibold">{guide.name}</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{guide.overview}</p>

            <p className="text-primary mt-5 flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Link2 className="size-3.5" />
              </span>
              Application platform
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm">{guide.platform.note}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.platform.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="border-border hover:border-primary/40 hover:text-foreground text-muted-foreground inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors"
                >
                  {l.label} <ExternalLink className="size-3" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        <Section icon={<ListChecks className="size-3.5" />} title="What you'll need" tone="bg-sky-400/10 text-sky-300">
          <ul className="text-muted-foreground flex flex-col gap-1.5 text-sm">
            {guide.needs.map((n) => (
              <li key={n} className="flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {n}
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={<Trophy className="size-3.5" />} title="Extracurriculars" tone="bg-amber-400/10 text-amber-300">
          <p className="text-muted-foreground text-sm leading-relaxed">{guide.extracurriculars}</p>
        </Section>

        <Section icon={<FileText className="size-3.5" />} title="Required tests" tone="bg-violet-400/10 text-violet-300">
          <p className="text-muted-foreground text-sm leading-relaxed">{guide.tests}</p>
        </Section>

        <Section icon={<PenLine className="size-3.5" />} title="Essays" tone="bg-rose-400/10 text-rose-300">
          <p className="text-muted-foreground text-sm leading-relaxed">{guide.essays}</p>
        </Section>

        <Card className="border-primary/30 bg-primary/[0.04]">
          <CardContent className="py-5">
            <p className="text-primary flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Target className="size-3.5" />
              </span>
              What {guide.name} actually prioritises
            </p>
            <p className="text-foreground/90 mt-2 text-sm leading-relaxed">{guide.priorities}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** Per-section accent, so the page can be scanned by colour, not just read. */
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-foreground flex items-center gap-2 text-sm font-medium">
          <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-lg ${tone}`}>
            {icon}
          </span>
          {title}
        </p>
        <div className="mt-2.5">{children}</div>
      </CardContent>
    </Card>
  );
}
