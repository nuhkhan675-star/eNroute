"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AnalyzeProfileButton({ label = "Analyze My Profile" }: { label?: string }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClick = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      toast.success(`Analyzed ${data.analyzedCount} matched universities.`);
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
    <div className="flex flex-col items-end gap-2">
      <Button onClick={handleClick} disabled={isAnalyzing}>
        {isAnalyzing ? "Analyzing your profile…" : label}
      </Button>
      {error && <p className="max-w-sm text-right text-sm text-destructive">{error}</p>}
    </div>
  );
}
