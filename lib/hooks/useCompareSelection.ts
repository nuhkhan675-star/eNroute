"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "enroute-compare-selection";
const MAX_COMPARE = 4;

function readSelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeSelection(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("enroute-compare-change"));
}

function subscribe(callback: () => void) {
  window.addEventListener("enroute-compare-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("enroute-compare-change", callback);
    window.removeEventListener("storage", callback);
  };
}

// Client-only selection store shared across every card on the page (and the
// floating compare bar) via localStorage + a custom event, so toggling one
// card's checkbox is instantly reflected everywhere without prop drilling
// through the server-rendered grid.
export function useCompareSelection() {
  const ids = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY) ?? "[]",
    () => "[]"
  );
  const parsedIds: string[] = (() => {
    try {
      const parsed = JSON.parse(ids);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const toggle = useCallback((id: string) => {
    const current = readSelection();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : current.length < MAX_COMPARE
        ? [...current, id]
        : current;
    writeSelection(next);
  }, []);

  const clear = useCallback(() => writeSelection([]), []);

  return { ids: parsedIds, toggle, clear, max: MAX_COMPARE };
}
