"use client";

import Link from "next/link";
import { useCompareSelection } from "@/lib/hooks/useCompareSelection";
import { Button } from "@/components/ui/button";

export function CompareBar() {
  const { ids, clear } = useCompareSelection();
  if (ids.length < 2) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-card px-5 py-3 shadow-lg">
      <span className="text-sm font-medium">{ids.length} selected</span>
      <Button size="sm" nativeButton={false} render={<Link href={`/universities/compare?ids=${ids.join(",")}`}>Compare</Link>} />
      <Button size="sm" variant="ghost" onClick={clear}>
        Clear
      </Button>
    </div>
  );
}
