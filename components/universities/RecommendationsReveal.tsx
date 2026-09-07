"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

/**
 * Gates the recommended-matches list behind an explicit click.
 *
 * The children are server-rendered but not mounted until the student asks for
 * them, which matters for more than tidiness: DashboardMatchesQueue starts
 * analysing pending universities as soon as it mounts, so leaving it rendered
 * spent AI calls on students who never scrolled that far.
 */
export function RecommendationsReveal({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);

  if (shown) return <>{children}</>;

  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">
        We&apos;ll rank universities across your target countries by how well they fit your profile.
      </p>
      <Button onClick={() => setShown(true)} className="gap-2">
        <Sparkles className="size-4" /> Find recommendations for you
      </Button>
    </div>
  );
}
