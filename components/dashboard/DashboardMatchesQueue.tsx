"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardMatchCard } from "@/lib/db/dashboard";
import type { UniversityAnalysisRecord } from "@/lib/db/analyses";
import { UniversityMatchCard } from "@/components/dashboard/UniversityMatchCard";
import { Progress } from "@/components/ui/progress";
import { PROGRAM_ANALYSIS_BATCH_SIZE } from "@/lib/ai/prediction/scoringEngine";

const GROUPS = [
  { key: "high_reach" as const, title: "High Reach", description: "Very difficult admission even for highly competitive applicants." },
  { key: "reach" as const, title: "Reach", description: "You're competitive, but admission remains highly uncertain." },
  { key: "target" as const, title: "Target", description: "You appear reasonably competitive relative to the available evidence." },
  { key: "likely" as const, title: "Likely", description: "You appear substantially above the competitive threshold." },
];

const STATUS_MESSAGES = [
  "Evaluating your academic profile…",
  "Assessing your extracurriculars and leadership…",
  "Matching your profile against each university…",
  "Comparing university selectivity…",
  "Generating strengths, gaps, and recommendations…",
  "Finalizing your university matches…",
];

interface Props {
  initialMatches: DashboardMatchCard[];
  pending: string[];
  savedUniversityIds?: string[];
}

// Same bounded-concurrency background-queue pattern as UniversityGrid.tsx:
// render whatever's already analyzed immediately, then work through the
// rest client-side so this page never blocks on one giant request and
// survives a reload (whatever's already saved to university_analysis just
// re-appears; whatever's still pending gets re-queued).
export function DashboardMatchesQueue({ initialMatches, pending, savedUniversityIds }: Props) {
  const savedSet = new Set(savedUniversityIds ?? []);
  const [matches, setMatches] = useState(initialMatches);
  const [pendingCount, setPendingCount] = useState(pending.length);
  const [statusIndex, setStatusIndex] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (pendingCount === 0) return;
    const interval = setInterval(() => setStatusIndex((i) => (i + 1) % STATUS_MESSAGES.length), 2200);
    return () => clearInterval(interval);
  }, [pendingCount]);

  useEffect(() => {
    if (started.current || pending.length === 0) return;
    started.current = true;

    // Chunk into the same batch size the server groups into one Gemini
    // call (see PROGRAM_ANALYSIS_BATCH_SIZE) -- one fetch per chunk, not
    // one fetch per university, so the profile is sent to the server once
    // per chunk rather than duplicated across dozens of requests.
    const chunks: string[][] = [];
    for (let i = 0; i < pending.length; i += PROGRAM_ANALYSIS_BATCH_SIZE) {
      chunks.push(pending.slice(i, i + PROGRAM_ANALYSIS_BATCH_SIZE));
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
            setMatches((prev) => [
              ...prev,
              ...results.map((result: UniversityAnalysisRecord) => ({
                universityId: result.universityId,
                universityName: result.universityName,
                city: result.city,
                countryName: result.countryName,
                photoUrl: result.photoUrl,
                category: result.category,
                chanceMin: result.chanceMin,
                chanceMax: result.chanceMax,
                confidence: result.confidence,
                reasoning: result.reasoning,
              })),
            ]);
          }
        } catch {
          // Swallowed -- that chunk's universities just stay absent rather
          // than breaking the rest of the queue.
        } finally {
          setPendingCount((n) => n - chunk.length);
        }
      }
    }

    for (let i = 0; i < CONCURRENCY; i++) worker();
  }, [pending]);

  return (
    <div className="mt-8 flex flex-col gap-8">
      {pendingCount > 0 && (
        // Real progress, not a simulated timer: we know exactly how many
        // universities were queued and decrement as each batch resolves.
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{STATUS_MESSAGES[statusIndex]}</span>
            <span className="shrink-0 tabular-nums">
              {pending.length - pendingCount} of {pending.length} universities analysed
            </span>
          </div>
          <Progress value={((pending.length - pendingCount) / Math.max(1, pending.length)) * 100} />
        </div>
      )}
      {matches.length === 0 && pendingCount === 0 && (
        <p className="text-sm text-muted-foreground">
          We don&apos;t have any universities matching your field of interest yet. Browse universities
          below to check specific schools.
        </p>
      )}
      {GROUPS.map((group) => {
        const groupMatches = matches.filter((m) => m.category === group.key);
        if (groupMatches.length === 0) return null;
        return (
          <div key={group.key}>
            <h2 className="text-lg font-medium">{group.title}</h2>
            <p className="text-sm text-muted-foreground">{group.description}</p>
            <div className="mt-3 flex flex-col gap-3">
              {groupMatches.map((m) => (
                <UniversityMatchCard
                  key={m.universityId}
                  card={m}
                  initialSaved={savedSet.has(m.universityId)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
