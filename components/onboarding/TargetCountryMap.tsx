"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * A dot-matrix world map that lights up the countries a student has picked.
 *
 * Landmass is described as latitude/longitude boxes and rasterised at render
 * time, rather than as hand-drawn cell spans. Boxes are far easier to reason
 * about ("Iberia is 36-44N, 10W-3E") and, more usefully, the resolution
 * becomes a single constant -- the first version was locked to its 6-degree
 * grid and looked it.
 */
const CELL_DEG = 3;
const COLS = 360 / CELL_DEG; // 120
const ROWS = 180 / CELL_DEG; // 60
// Rows below this are Antarctic ocean and empty; cropping keeps the map from
// floating in dead space.
const VISIBLE_ROWS = Math.round((90 - -60) / CELL_DEG);

/** [latMin, latMax, lonMin, lonMax] */
type Box = [number, number, number, number];

const LAND: Box[] = [
  // --- North America
  [55, 71, -168, -141], // Alaska
  [49, 70, -140, -95], // western Canada
  [49, 62, -95, -75], // central Canada
  [45, 62, -80, -55], // eastern Canada / Quebec
  [68, 80, -100, -62], // Arctic archipelago
  [60, 83, -55, -20], // Greenland
  [25, 49, -125, -67], // continental US
  [30, 49, -95, -75], // US midwest/east fill
  [15, 32, -117, -87], // Mexico
  [7, 18, -92, -77], // Central America
  [18, 23, -85, -74], // Caribbean

  // --- South America
  [-4, 12, -79, -60], // Colombia / Venezuela
  [-33, 5, -74, -35], // Brazil
  [-55, 0, -77, -66], // Andes / Peru / Chile
  [-40, -21, -73, -54], // Argentina north
  [-55, -40, -74, -62], // Patagonia

  // --- Europe
  [36, 44, -10, 3], // Iberia
  [43, 51, -5, 8], // France
  [45, 55, 5, 24], // central Europe
  [37, 47, 7, 18], // Italy
  [39, 48, 15, 30], // Balkans
  [50, 59, -6, 2], // Great Britain
  [51, 55, -10, -6], // Ireland
  [55, 71, 5, 31], // Scandinavia
  [45, 60, 24, 40], // eastern Europe

  // --- Asia
  [50, 70, 30, 60], // western Russia
  [50, 73, 60, 180], // Siberia
  [42, 52, 60, 140], // Russian steppe / Mongolia
  [36, 50, 50, 80], // central Asia
  [20, 45, 75, 123], // China
  [31, 45, 130, 146], // Japan
  [34, 43, 125, 130], // Korea
  [20, 45, 100, 123], // eastern China fill
  [8, 35, 68, 90], // India
  [5, 23, 92, 110], // mainland SE Asia
  [-10, 7, 95, 141], // Indonesia
  [5, 19, 117, 126], // Philippines
  [12, 40, 34, 60], // Middle East
  [12, 32, 34, 56], // Arabia

  // --- Africa
  [20, 37, -17, 35], // north Africa
  [4, 20, -17, 25], // Sahel / west Africa
  [-12, 18, 25, 51], // east Africa / Horn
  [-13, 5, 8, 31], // central Africa
  [-35, -13, 12, 41], // southern Africa
  [-26, -12, 43, 51], // Madagascar

  // --- Oceania
  [-39, -11, 113, 154], // Australia
  [-43, -39, 144, 149], // Tasmania
  [-47, -34, 166, 179], // New Zealand
  [-11, -1, 131, 151], // Papua New Guinea
];

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

function isLand(lat: number, lon: number): boolean {
  for (const [latMin, latMax, lonMin, lonMax] of LAND) {
    if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) return true;
  }
  return false;
}

interface Props {
  /** Countries currently selected, in the order the picker lists them. */
  selected: { isoCode: string; name: string }[];
  className?: string;
}

export function TargetCountryMap({ selected, className }: Props) {
  // ~7,000 point-in-box tests; trivial, but there's no reason to redo it on
  // every re-render as the student toggles countries.
  const landCells = useMemo(() => {
    const cells: { x: number; y: number }[] = [];
    for (let r = 0; r < VISIBLE_ROWS; r++) {
      const lat = 90 - (r + 0.5) * CELL_DEG;
      for (let c = 0; c < COLS; c++) {
        const lon = -180 + (c + 0.5) * CELL_DEG;
        if (isLand(lat, lon)) cells.push({ x: c + 0.5, y: r + 0.5 });
      }
    }
    return cells;
  }, []);

  const markers = selected
    .map((c) => ({ ...c, coord: COORDS[c.isoCode] }))
    .filter((c) => c.coord)
    .map((c) => ({ ...c, ...project(c.coord![0], c.coord![1]) }));

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-muted/30", className)}>
      <svg
        viewBox={`0 0 ${COLS} ${VISIBLE_ROWS}`}
        className="w-full"
        role="img"
        aria-label="World map of your target countries"
      >
        {landCells.map((cell, i) => (
          <circle key={i} cx={cell.x} cy={cell.y} r={0.32} className="fill-muted-foreground/25" />
        ))}

        {markers.map((m) => (
          <g key={m.isoCode}>
            {/* Halo first so it sits under the solid dot. */}
            <circle cx={m.x} cy={m.y} r={2.6} className="fill-primary/20">
              <animate attributeName="r" values="1.9;3.6;1.9" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0.05;0.55" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={m.x} cy={m.y} r={1.15} className="fill-primary" />
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
