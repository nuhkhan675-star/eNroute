"use client";

import { useCompareSelection } from "@/lib/hooks/useCompareSelection";
import { cn } from "@/lib/utils";
import { Check, Plus } from "lucide-react";

export function CompareToggle({ universityId }: { universityId: string }) {
  const { ids, toggle, max } = useCompareSelection();
  const checked = ids.includes(universityId);
  const disabled = !checked && ids.length >= max;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(universityId);
      }}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur transition-colors",
        checked
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/20 bg-black/50 text-white hover:border-white/40",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      {checked ? <Check className="size-3" /> : <Plus className="size-3" />}
      {checked ? "Comparing" : "Compare"}
    </button>
  );
}
