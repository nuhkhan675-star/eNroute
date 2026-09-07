"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

/**
 * Gates the recommended-matches list behind an explicit click.
 *
 * The children are server-rendered but not mounted until the student asks for
 * them, which matters for more than tidiness: DashboardMatchesQueue starts
 * analysing pending universities as soon as it mounts, so leaving it rendered
 * spent AI calls on students who never scrolled that far.
 *
 * Revealing twenty university cards at once is a heavy render, so the state
 * change goes through a transition and the button reports progress instead of
 * appearing to do nothing.
 */
export function RecommendationsReveal({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (shown) return <>{children}</>;

  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        We&apos;ll rank universities across your target countries by how well they fit your profile.
      </p>
      <Button
        onClick={() => startTransition(() => setShown(true))}
        disabled={isPending}
        className="gap-2"
      >
        <Sparkles className="size-4" />
        {isPending ? "Finding your matches…" : "Find recommendations for you"}
      </Button>
      {isPending && (
        // Indeterminate: this covers React rendering the cards, before the
        // queue's own real progress bar takes over for the analyses.
        <Progress value={null} className="mt-1 w-48" />
      )}
    </div>
  );
}
