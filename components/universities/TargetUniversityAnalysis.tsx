"use client";

import { useState } from "react";
import Link from "next/link";
import { UniversitySearchCombobox, type UniversitySuggestion } from "@/components/universities/UniversitySearchCombobox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { UniversityAnalysisRecord } from "@/lib/db/analyses";
import { CATEGORY_LABELS, chancePoint } from "@/lib/ai/prediction/scoringEngine";
import { Search, TrendingUp, TriangleAlert, Sparkles, Info, ArrowRight } from "lucide-react";

const CATEGORY_STYLES: Record<string, string> = {
  high_reach: "bg-red-500/15 text-red-300 border border-red-500/40",
  reach: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
  target: "bg-blue-500/15 text-blue-300 border border-blue-500/40",
  likely: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
};

// How the acceptance-rate line is worded depends entirely on where the
// number came from -- a published rate is stated plainly, anything derived
// is explicitly marked as our estimate, and "no data" says so rather than
// showing a confident-looking number.
function selectivityLine(analysis: UniversityAnalysisRecord): { text: string; isEstimate: boolean } {
  const rate = analysis.selectivityRate;
  switch (analysis.selectivityBasis) {
    case "acceptance_rate":
      return { text: rate != null ? `Acceptance rate ${rate}%` : "Published acceptance rate on record", isEstimate: false };
    case "rank_proxy":
      return { text: "Selectivity estimated from world ranking (our estimate)", isEstimate: true };
    case "ai_estimate":
      // Deliberately the loudest label of the four. This figure has less
      // behind it than a rank proxy -- no published rate, no ranking, just
      // the model's general knowledge -- so it says so in plain words and
      // never renders the bare number as though it were sourced.
      return {
        text:
          rate != null
            ? `AI-estimated acceptance rate ~${rate}% -- not from a published source`
            : "AI-estimated selectivity -- not from a published source",
        isEstimate: true,
      };
    default:
      return { text: "No acceptance-rate data on record -- low-confidence estimate", isEstimate: true };
  }
}

export function TargetUniversityAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<UniversityAnalysisRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only ever called with a real university the student picked from the
  // dropdown, so there is no "guess the top match" path left to get wrong.
  const analyze = async (u: UniversitySuggestion) => {
    setAnalyzing(true);
    setError(null);
    // Clear any previous school's result up front. Leaving it mounted was why
    // a failed lookup still rendered an unrelated university's card beneath
    // the error message.
    setResult(null);
    try {
      const res = await fetch(`/api/analyze/${u.id}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setResult(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const line = result ? selectivityLine(result) : null;

  return (
    <Card className="mt-6">
      <CardContent className="flex flex-col gap-3 py-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Search className="size-3.5" /> Target university analysis
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Get a school-specific breakdown: your odds, strengths, gaps, and exactly what to do about
            them.
          </p>
        </div>

        <div className="flex gap-2">
          <UniversitySearchCombobox onSelect={analyze} disabled={analyzing} />
        </div>
        {analyzing && <p className="text-sm text-muted-foreground">Analyzing…</p>}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && line && (
          <div className="mt-2 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/universities/${result.universityId}`}
                className="text-lg font-semibold hover:text-primary"
              >
                {result.universityName}
              </Link>
              <Badge className={CATEGORY_STYLES[result.category]}>
                {CATEGORY_LABELS[result.category]} · {chancePoint(result.chanceMin, result.chanceMax)}%
              </Badge>
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {line.isEstimate && <Info className="size-3.5 shrink-0" />}
              {line.text}
            </p>

            <p className="text-sm">{result.reasoning}</p>

            <div className="grid gap-5 pt-1 sm:grid-cols-3">
              <Column
                icon={<TrendingUp className="size-3.5" />}
                label="Strengths"
                labelClass="text-emerald-300"
                items={result.strengths}
                empty="No standout strengths identified yet."
              />
              <Column
                icon={<TriangleAlert className="size-3.5" />}
                label="Weaknesses"
                labelClass="text-orange-300"
                items={result.gaps}
                empty="No major gaps identified."
              />
              <Column
                icon={<Sparkles className="size-3.5" />}
                label="Action steps"
                labelClass="text-primary"
                items={result.recommendations.map((r) => r.tip)}
                empty="No further actions suggested."
              />
            </div>

            <Link
              href={`/universities/${result.universityId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Full breakdown <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Column({
  icon,
  label,
  labelClass,
  items,
  empty,
}: {
  icon: React.ReactNode;
  label: string;
  labelClass: string;
  items: string[];
  empty: string;
}) {
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${labelClass}`}>
        {icon} {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
          {items.map((t, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="shrink-0">•</span> {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
