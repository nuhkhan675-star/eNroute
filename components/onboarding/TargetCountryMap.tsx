"use client";

import { cn } from "@/lib/utils";

/**
 * A dot-matrix world map that lights up the countries a student has picked.
 *
 * The landmass is a hand-authored mask rather than real geodata: at this
 * resolution (60x30 cells, 6 degrees each) a proper projection would buy
 * nothing a reader could see, and it keeps the component dependency-free.
 * Rows are described as spans instead of 60-character strings so the shape
 * stays legible and editable.
 */
const COLS = 60;
const ROWS = 30;

// row -> [startCol, endCol] spans of land. Row 0 is 90..84N, each row 6
// degrees south of the last; col 0 is 180..174W, each col 6 degrees east.
const LAND: Record<number, [number, number][]> = {
  1: [[21, 25]],
  2: [[8, 18], [20, 26], [45, 58]],
  3: [[3, 19], [21, 25], [30, 33], [34, 59]],
  4: [[2, 20], [22, 25], [29, 33], [34, 59]],
  5: [[5, 20], [28, 32], [33, 59]],
  6: [[6, 20], [28, 29], [30, 35], [36, 59]],
  7: [[7, 20], [28, 37], [38, 59]],
  8: [[7, 21], [28, 36], [37, 59]],
  9: [[8, 21], [28, 39], [39, 44], [45, 58]],
  10: [[10, 17], [27, 39], [39, 43], [47, 50], [51, 58]],
  11: [[12, 17], [27, 39], [39, 43], [46, 50], [51, 56]],
  12: [[14, 19], [27, 39], [46, 50], [51, 56]],
  13: [[18, 24], [27, 40], [47, 49], [52, 57]],
  14: [[17, 25], [28, 40], [52, 58]],
  15: [[17, 25], [29, 39], [52, 58]],
  16: [[17, 25], [29, 38], [52, 58]],
  17: [[17, 24], [29, 37], [50, 56]],
  18: [[18, 24], [30, 37], [48, 56]],
  19: [[19, 24], [30, 36], [48, 56]],
  20: [[19, 23], [31, 35], [49, 55]],
  21: [[20, 22], [50, 54], [57, 58]],
  22: [[20, 22], [57, 58]],
  23: [[20, 21]],
  24: [[20, 21]],
  // Antarctica is deliberately omitted: as a straight band of dots across the
  // bottom it read as a rendering artefact rather than a continent, and no
  // supported country sits near it.
};

// iso -> [latitude, longitude], roughly the population centre.
const COORDS: Record<string, [number, number]> = {
  US: [39, -98],
  GB: [54, -2],
  IN: [22, 79],
  AU: [-25, 134],
  SG: [1.3, 103.8],
  HK: [22.3, 114.2],
  DE: [51, 10],
  FR: [46.5, 2.5],
  CA: [56, -106],
  NZ: [-41, 174],
};

function project(lat: number, lon: number): { x: number; y: number } {
  return { x: ((lon + 180) / 360) * COLS, y: ((90 - lat) / 180) * ROWS };
}

const LAND_CELLS: { x: number; y: number }[] = [];
for (const [row, spans] of Object.entries(LAND)) {
  for (const [from, to] of spans) {
    for (let c = from; c <= to; c++) LAND_CELLS.push({ x: c + 0.5, y: Number(row) + 0.5 });
  }
}

interface Props {
  /** Countries currently selected, in the order the picker lists them. */
  selected: { isoCode: string; name: string }[];
  className?: string;
}

export function TargetCountryMap({ selected, className }: Props) {
  const markers = selected
    .map((c) => ({ ...c, coord: COORDS[c.isoCode] }))
    .filter((c) => c.coord)
    .map((c) => ({ ...c, ...project(c.coord![0], c.coord![1]) }));

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-muted/30", className)}>
      <svg viewBox="0 0 60 26" className="w-full" role="img" aria-label="World map of your target countries">
        {LAND_CELLS.map((cell, i) => (
          <circle key={i} cx={cell.x} cy={cell.y} r={0.26} className="fill-muted-foreground/25" />
        ))}

        {markers.map((m) => (
          <g key={m.isoCode}>
            {/* Halo first so it sits under the solid dot. */}
            <circle cx={m.x} cy={m.y} r={1.4} className="fill-primary/20">
              <animate attributeName="r" values="1;1.9;1" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0.05;0.55" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={m.x} cy={m.y} r={0.62} className="fill-primary" />
          </g>
        ))}
      </svg>

      {markers.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Pick a country to light up the map
        </p>
      )}
    </div>
  );
}
