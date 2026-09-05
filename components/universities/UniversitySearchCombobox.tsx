"use client";

import { useEffect, useRef, useState } from "react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface UniversitySuggestion {
  id: string;
  name: string;
  city: string | null;
  countryName: string;
}

/**
 * Live typeahead over the university catalogue.
 *
 * Typing is a plain indexed `ilike` against the database -- it never triggers
 * an AI call. Analysis only happens when the parent acts on `onSelect`.
 *
 * Built on cmdk with `shouldFilter={false}`, which matters: cmdk client-side
 * filters its items by default with its own fuzzy matcher, which would
 * re-filter (and silently drop) valid server results. Disabling it makes cmdk
 * a pure presentation layer -- we keep the server's ordering, and get arrow
 * keys, Enter, highlight and combobox ARIA roles for free.
 */
export function UniversitySearchCombobox({
  onSelect,
  disabled,
  placeholder = "Start typing a university name…",
}: {
  onSelect: (u: UniversitySuggestion) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UniversitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  // Monotonic request id. AbortController alone isn't enough -- an abort can
  // lose the race against an already-resolved response, which is exactly how
  // a stale list ends up on screen under fast typing.
  const seq = useRef(0);

  useEffect(() => {
    const term = query.trim();
    const controller = new AbortController();
    const id = ++seq.current;
    // Every state write happens inside the debounce callback, never
    // synchronously in the effect body.
    const timer = setTimeout(() => {
      if (term.length < 1) {
        setSuggestions([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/universities/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => {
          if (id !== seq.current) return; // a newer keystroke already won
          setSuggestions(d.results ?? []);
          setOpen(true);
          setLoading(false);
        })
        .catch(() => {
          if (id === seq.current) setLoading(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Dismiss on outside click, the way a real combobox behaves.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (u: UniversitySuggestion) => {
    setQuery(u.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(u);
  };

  return (
    <div ref={wrapper} className="relative flex-1">
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && (
          <div className="absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {/* ~7 rows visible, the rest scrolls. */}
            <CommandList className="max-h-64 overflow-y-auto">
              {suggestions.length === 0 && !loading && (
                <CommandEmpty className="px-3 py-3 text-sm text-muted-foreground">
                  No university matching “{query.trim()}” is in our database yet.
                </CommandEmpty>
              )}
              {suggestions.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.id}
                  onSelect={() => choose(s)}
                  className="flex cursor-pointer flex-col items-start gap-0.5 px-3 py-2"
                >
                  <span className="text-sm">{s.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[s.city, s.countryName].filter(Boolean).join(", ")}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  );
}
