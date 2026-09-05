"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { RankingBadge } from "@/components/universities/RankingBadge";
import { CompareToggle } from "@/components/universities/CompareToggle";
import { SaveToggle } from "@/components/universities/SaveToggle";
import { Award, ChevronDown } from "lucide-react";
import type { UniversitySearchResult, UniversityCardExtras } from "@/lib/db/universities";
import type { UniversityAnalysisRecord } from "@/lib/db/analyses";
import { CATEGORY_LABELS, PROGRAM_ANALYSIS_BATCH_SIZE, chancePoint } from "@/lib/ai/prediction/scoringEngine";

const CATEGORY_STYLES: Record<string, string> = {
  high_reach: "bg-red-500/15 text-red-300 border border-red-500/40",
  reach: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
  target: "bg-blue-500/15 text-blue-300 border border-blue-500/40",
  likely: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
};

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

interface Props {
  universities: UniversitySearchResult[];
  initialEstimates: Record<string, UniversityAnalysisRecord>;
  extras: Record<string, UniversityCardExtras>;
  pendingAnalysis: string[];
  savedUniversityIds?: string[];
}

// Cards render immediately from whatever's already cached. Any university
// not analyzed yet for this profile fills in progressively in the
// background at bounded concurrency, instead of the whole page blocking on
// every AI call before it can render anything -- that design made a country
// with many universities take minutes to load, and a single Gemini
// free-tier 429 could stall the entire page.
export function UniversityGrid({ universities, initialEstimates, extras, pendingAnalysis, savedUniversityIds }: Props) {
  const savedSet = new Set(savedUniversityIds ?? []);
  const [estimates, setEstimates] = useState(initialEstimates);
  const [analyzing, setAnalyzing] = useState<Set<string>>(() => new Set(pendingAnalysis));
  const started = useRef(false);

  useEffect(() => {
    if (started.current || pendingAnalysis.length === 0) return;
    started.current = true;

    // One fetch per batch (matching the server's Gemini batch size), not
    // one fetch per card -- the profile is sent once per batch, not
    // duplicated across dozens of independent requests.
    const chunks: string[][] = [];
    for (let i = 0; i < pendingAnalysis.length; i += PROGRAM_ANALYSIS_BATCH_SIZE) {
      chunks.push(pendingAnalysis.slice(i, i + PROGRAM_ANALYSIS_BATCH_SIZE));
    }

    let index = 0;
    const CONCURRENCY = 2;

    async function worker() {
      for (;;) {
        const chunk = chunks[index++];
        if (!chunk) return;
        try {
          const res = await fetch("/api/analyze/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ universityIds: chunk }),
          });
          if (res.ok) {
            const { results } = await res.json();
            setEstimates((prev) => {
              const next = { ...prev };
              for (const result of results as UniversityAnalysisRecord[]) next[result.universityId] = result;
              return next;
            });
          }
        } catch {
          // Swallowed -- these cards just stay without an estimate rather
          // than breaking the others.
        } finally {
          setAnalyzing((prev) => {
            const next = new Set(prev);
            for (const universityId of chunk) next.delete(universityId);
            return next;
          });
        }
      }
    }

    for (let i = 0; i < CONCURRENCY; i++) worker();
  }, [pendingAnalysis]);

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {universities.map((u) => (
        <UniversityGridCard
          key={u.id}
          university={u}
          estimate={estimates[u.id]}
          extras={extras[u.id]}
          isAnalyzing={analyzing.has(u.id)}
          initialSaved={savedSet.has(u.id)}
        />
      ))}
    </div>
  );
}

function UniversityGridCard({
  university,
  estimate,
  extras,
  isAnalyzing,
  initialSaved,
}: {
  university: UniversitySearchResult;
  estimate?: UniversityAnalysisRecord;
  extras?: UniversityCardExtras;
  isAnalyzing?: boolean;
  initialSaved: boolean;
}) {
  const [showOdds, setShowOdds] = useState(false);
  const topRecommendations = [...(estimate?.recommendations ?? [])]
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
    .slice(0, 3);

  return (
    <div className="relative h-full">
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        <CompareToggle universityId={university.id} />
        <SaveToggle universityId={university.id} initialSaved={initialSaved} />
      </div>
      <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/40">
        <Link href={`/universities/${university.id}`}>
          <UniversityPhoto
            photoUrl={university.photoUrl}
            alt={university.name}
            className="h-32 w-full"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            iconClassName="size-8"
          />
        </Link>
        <CardContent className="flex flex-1 flex-col gap-2 py-4">
          <Link href={`/universities/${university.id}`}>
            <p className="line-clamp-2 font-medium leading-snug">{university.name}</p>
            <p className="text-sm text-muted-foreground">{university.city ?? university.countryName}</p>
          </Link>

          {extras?.ranking && <RankingBadge ranking={extras.ranking} />}

          {estimate ? (
            <div className="flex flex-col gap-1">
              <Badge className={`w-fit gap-1 ${CATEGORY_STYLES[estimate.category]}`}>
                {CATEGORY_LABELS[estimate.category]} · {chancePoint(estimate.chanceMin, estimate.chanceMax)}%
              </Badge>
              <p className="text-xs text-muted-foreground">{estimate.confidence} confidence</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{estimate.reasoning}</p>
            </div>
          ) : isAnalyzing ? (
            <p className="text-xs text-muted-foreground">Estimating your chances…</p>
          ) : null}

          <div className="mt-auto flex flex-col gap-1 pt-1 text-xs text-muted-foreground">
            {extras?.cheapestTuitionAmount != null && (
              <p>
                From {extras.cheapestTuitionAmount.toLocaleString()} {extras.cheapestTuitionCurrency}/yr
              </p>
            )}
            {extras?.hasScholarships && (
              <p className="flex items-center gap-1 text-primary">
                <Award className="size-3.5" /> Scholarships available
              </p>
            )}
          </div>

          {topRecommendations.length > 0 && (
            <div className="border-t border-border pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowOdds((v) => !v);
                }}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <ChevronDown className={`size-3.5 transition-transform ${showOdds ? "rotate-180" : ""}`} />
                Improve your odds here
              </button>
              {showOdds && (
                <ul className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
                  {topRecommendations.map((r, i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-primary">•</span> {r.tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Link
            href={`/universities/${university.id}`}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Explore more →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
