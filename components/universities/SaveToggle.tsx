"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSavedUniversity } from "@/lib/actions/saved";

export function SaveToggle({ universityId, initialSaved }: { universityId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved schools" : "Save school"}
      aria-pressed={saved}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          const res = await toggleSavedUniversity(universityId, saved);
          if (res.error) setSaved(!next);
        });
      }}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border backdrop-blur transition-colors",
        saved
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/20 bg-[#081a2f]/70 text-white hover:border-primary/60",
        pending && "opacity-70"
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}
