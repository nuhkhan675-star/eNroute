"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AnalyzeProgramButton({
  universityProgramId,
  hasExistingAnalysis = false,
}: {
  universityProgramId: string;
  hasExistingAnalysis?: boolean;
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/analyze/${universityProgramId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button onClick={handleClick} disabled={isAnalyzing}>
        {isAnalyzing
          ? "Analyzing your chances…"
          : hasExistingAnalysis
            ? "Re-analyze My Chances"
            : "Analyze My Chances"}
      </Button>
      {error && <p className="max-w-sm text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
