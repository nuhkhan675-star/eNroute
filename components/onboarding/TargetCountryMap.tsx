"use client";

import { cn } from "@/lib/utils";
import { COUNTRY_PATHS, MAP_HEIGHT, MAP_WIDTH, WORLD_PATH } from "@/lib/content/worldMap";

/**
 * World map that fills in the countries a student has picked.
 *
 * Outlines are real Natural Earth geometry (public domain), projected
 * equirectangular at authoring time by scripts/generate-world-map.mjs -- the
 * app ships a few path strings, not a mapping library. Earlier versions drew
 * the landmass as a dot grid from hand-written cell spans and then from
 * lat/lon boxes; boxes rasterise to rectangles, which is exactly what it
 * looked like.
 *
 * Singapore and Hong Kong are absent from the 110m dataset -- at that
 * resolution a city-state is smaller than a pixel -- so they're drawn as
 * markers instead, which is the honest representation anyway.
 */
const MARKER_ONLY: Record<string, [number, number]> = {
  SG: [1.3, 103.8],
  HK: [22.3, 114.2],
};

// Matches the equirectangular projection used by the generator, so a marker
// lands where the outline would have been.
function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: MAP_WIDTH / 2 + (lon * MAP_WIDTH) / 360,
    y: MAP_HEIGHT / 2 - (lat * MAP_HEIGHT) / 180,
  };
}

interface Props {
  /** Countries currently selected, in the order the picker lists them. */
  selected: { isoCode: string; name: string }[];
  className?: string;
}

export function TargetCountryMap({ selected, className }: Props) {
  const shapes = selected.filter((c) => COUNTRY_PATHS[c.isoCode]);
  const markers = selected
    .filter((c) => MARKER_ONLY[c.isoCode])
    .map((c) => ({ ...c, ...project(MARKER_ONLY[c.isoCode][0], MARKER_ONLY[c.isoCode][1]) }));

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-muted/30", className)}>
      <svg
        viewBox={`0 40 ${MAP_WIDTH} ${MAP_HEIGHT - 90}`}
        className="w-full"
        role="img"
        aria-label="World map of your target countries"
      >
        {/* Every country we don't support, as one quiet silhouette. */}
        <path d={WORLD_PATH} className="fill-muted-foreground/20 stroke-muted-foreground/25" strokeWidth={0.5} />

        {/* Supported countries sit above it so an unselected one still reads
            as part of the map rather than a hole in it. */}
        {Object.entries(COUNTRY_PATHS).map(([iso, d]) => {
          const isSelected = shapes.some((c) => c.isoCode === iso);
          return (
            <path
              key={iso}
              d={d}
              className={cn(
                "transition-colors duration-300",
                isSelected
                  ? "fill-primary/70 stroke-primary"
                  : "fill-muted-foreground/20 stroke-muted-foreground/25"
              )}
              strokeWidth={0.5}
            />
          );
        })}

        {markers.map((m) => (
          <g key={m.isoCode}>
            <circle cx={m.x} cy={m.y} r={9} className="fill-primary/25">
              <animate attributeName="r" values="7;14;7" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.05;0.6" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={m.x} cy={m.y} r={4} className="fill-primary" />
          </g>
        ))}
      </svg>

      {selected.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Pick a country to light up the map
        </p>
      )}
    </div>
  );
}
