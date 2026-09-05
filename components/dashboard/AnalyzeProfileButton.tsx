"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// Roughly how long a profile analysis takes end to end (two Gemini calls run
// in parallel, then a deterministic composite score). Used only to pace the
// bar -- the real completion is driven by the request finishing.
const EXPECTED_MS = 30_000;
/** The bar eases toward this and waits there; only a real response finishes it. */
const CEILING = 92;

// Each label corresponds to work that genuinely happens, in order, so the
// text isn't decorative filler -- see lib/ai/orchestrator.ts's analyzeProfile.
const STAGES = [
  "Reading your subjects and grades…",
  "Evaluating your academic record…",
  "Assessing your extracurriculars and leadership…",
  "Scoring your overall profile strength…",
  "Finishing up…",
];

export function AnalyzeProfileButton({ label = "Analyze My Profile" }: { label?: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isAnalyzing) return;
    const startedAt = Date.now();
    // Ease toward CEILING: fast at first, slower as it approaches, so it
    // never looks stuck at 100% while the request is still in flight.
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(CEILING * (1 - Math.exp(-2.2 * (elapsed / EXPECTED_MS))));
    }, 200);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  const handleClick = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setError(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setProgress(100);
      toast.success("Profile analyzed.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stage = STAGES[Math.min(STAGES.length - 1, Math.floor((progress / CEILING) * STAGES.length))];

  if (isAnalyzing) {
    return (
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Progress value={progress} />
        <p className="text-xs text-muted-foreground">{stage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleClick}>{label}</Button>
      {error && <p className="max-w-sm text-right text-sm text-destructive">{error}</p>}
    </div>
  );
}
