"use client";

import { useState, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SAVED_STATUS_LABELS, type SavedStatus } from "@/lib/types/saved";
import { setSavedUniversityStatus } from "@/lib/actions/saved";

export function SavedStatusSelect({ universityId, status }: { universityId: string; status: SavedStatus }) {
  const [value, setValue] = useState<SavedStatus>(status);
  const [, startTransition] = useTransition();

  return (
    <Select
      items={SAVED_STATUS_LABELS}
      value={value}
      onValueChange={(v) => {
        if (!v) return;
        const next = v as SavedStatus;
        setValue(next);
        startTransition(() => {
          setSavedUniversityStatus(universityId, next);
        });
      }}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(SAVED_STATUS_LABELS) as SavedStatus[]).map((s) => (
          <SelectItem key={s} value={s}>
            {SAVED_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
