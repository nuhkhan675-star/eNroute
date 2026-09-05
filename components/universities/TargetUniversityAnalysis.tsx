"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface Suggestion {
  id: string;
  name: string;
  city: string | null;
  countryName: string;
}

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
    default:
      return { text: "No acceptance-rate data on record -- low-confidence estimate", isEstimate: true };
  }
}

export function TargetUniversityAnalysis() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<UniversityAnalysisRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skipNextLookup = useRef(false);

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    const term = query.trim();
    const controller = new AbortController();
    // All state updates happen inside the debounce callback, never
    // synchronously in the effect body (which would cascade renders).
    const timer = setTimeout(() => {
      if (term.length < 2) {
        setSuggestions([]);
        return;
      }
      fetch(`/api/universities/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setSuggestions(d.results ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const analyze = async (universityId: string, name: string) => {
    skipNextLookup.current = true;
    setQuery(name);
    setSuggestions([]);
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/analyze/${universityId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeTopMatch = () => {
    if (suggestions.length > 0) analyze(suggestions[0].id, suggestions[0].name);
    else setError(`No university matching "${query.trim()}" is in our database yet.`);
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

        <div className="relative flex gap-2">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  analyzeTopMatch();
                }
              }}
              placeholder="e.g. Northumbria University"
              disabled={analyzing}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => analyze(s.id, s.name)}
                      className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-accent"
                    >
                      <span className="text-sm">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[s.city, s.countryName].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button onClick={analyzeTopMatch} disabled={analyzing || query.trim().length < 2}>
            {analyzing ? "Analyzing…" : "Analyze"}
          </Button>
        </div>

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
