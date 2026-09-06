"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsible "What can I add here?" helper.
 *
 * Prompting with concrete examples on demand does the job that long labels and
 * multiple textareas were doing before, without putting that text on screen
 * permanently. Students told us the section read as too much writing; the
 * guidance is the same, it is just no longer all visible at once.
 */
export function FieldHint({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
      >
        What can I add here?
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="text-muted-foreground mt-2 flex flex-col gap-1 text-xs">
          {items.map((t) => (
            <li key={t} className="flex gap-2">
              <span className="text-primary shrink-0">•</span>
              {t}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
