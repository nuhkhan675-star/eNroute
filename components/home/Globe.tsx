"use client";

import { useEffect, useRef } from "react";
import { LAND_GRID_BITS, LAND_GRID_COLS, LAND_GRID_ROWS, LAND_GRID_STEP } from "@/lib/content/worldMap";

/**
 * Slowly rotating dot-globe with the six supported countries pinned and joined
 * by great-circle arcs.
 *
 * Canvas with a hand-rolled orthographic projection rather than a 3D library:
 * the whole scene is ~2,400 points and six arcs, which is not worth shipping
 * three.js for. Land comes from the packed grid in lib/content/worldMap.ts,
 * generated from the same Natural Earth data as the 2D map.
 *
 * Purely decorative, so it sits behind the hero at low opacity and is hidden
 * from assistive tech.
 */
const COUNTRIES: { iso: string; lat: number; lon: number }[] = [
  { iso: "US", lat: 39, lon: -98 },
  { iso: "GB", lat: 54, lon: -2 },
  { iso: "IN", lat: 22, lon: 79 },
  { iso: "SG", lat: 1.3, lon: 103.8 },
  { iso: "HK", lat: 22.3, lon: 114.2 },
  { iso: "AU", lat: -25, lon: 134 },
];

// A ring rather than every pair: six nodes fully connected is fifteen arcs,
// which reads as a scribble at this size.
const LINKS = [0, 1, 2, 3, 4, 5].map((i, _, arr) => [arr[i], arr[(i + 1) % arr.length]] as const);

const TILT = (18 * Math.PI) / 180;
const LAND = "148,163,184";
const ACCENT = "165,180,252";

type Vec = [number, number, number];

function toVector(lat: number, lon: number): Vec {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  return [Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda)];
}

/** Spherical interpolation, so a link follows the surface rather than cutting through it. */
function slerp(a: Vec, b: Vec, t: number): Vec {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a;
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

function decodeLand(): Vec[] {
  const bytes =
    typeof atob === "function"
      ? Uint8Array.from(atob(LAND_GRID_BITS), (c) => c.charCodeAt(0))
      : new Uint8Array(0);
  const points: Vec[] = [];
  for (let r = 0; r < LAND_GRID_ROWS; r++) {
    const lat = 90 - (r + 0.5) * LAND_GRID_STEP;
    // Meridians converge at the poles, so a fixed-column grid packs Greenland
    // into dense rings while the equator looks sparse. Thinning by 1/cos(lat)
    // restores roughly even spacing on the sphere's surface.
    const stride = Math.max(1, Math.round(1 / Math.max(0.08, Math.cos((lat * Math.PI) / 180))));
    for (let c = 0; c < LAND_GRID_COLS; c++) {
      if (c % stride !== 0) continue;
      const i = r * LAND_GRID_COLS + c;
      if (!(bytes[i >> 3] & (1 << (i & 7)))) continue;
      points.push(toVector(lat, -180 + (c + 0.5) * LAND_GRID_STEP));
    }
  }
  return points;
}

export function Globe({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const land = decodeLand();
    const nodes = COUNTRIES.map((c) => toVector(c.lat, c.lon));

    let w = 0;
    let h = 0;
    let radius = 0;
    let raf = 0;
    let spin = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(w, h) * 0.42;
    };

    // Rotate about Y by `spin`, then tilt about X, and drop the depth term.
    const project = (v: Vec) => {
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      const x1 = v[0] * cosS + v[2] * sinS;
      const z1 = -v[0] * sinS + v[2] * cosS;
      const y2 = v[1] * Math.cos(TILT) - z1 * Math.sin(TILT);
      const z2 = v[1] * Math.sin(TILT) + z1 * Math.cos(TILT);
      return { x: w / 2 + x1 * radius, y: h / 2 - y2 * radius, z: z2 };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // The limb, plus a soft fill. Without an edge the dots read as scattered
      // confetti rather than as the surface of a sphere.
      const glow = ctx.createRadialGradient(w / 2, h / 2, radius * 0.2, w / 2, h / 2, radius);
      glow.addColorStop(0, `rgba(${ACCENT},0.05)`);
      glow.addColorStop(1, `rgba(${ACCENT},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = `rgb(${ACCENT})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (const p of land) {
        const { x, y, z } = project(p);
        if (z <= 0) continue; // back of the sphere
        ctx.globalAlpha = 0.18 + z * 0.42;
        ctx.fillStyle = `rgb(${LAND})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.05, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 1;
      for (const [a, b] of LINKS) {
        const from = nodes[a];
        const to = nodes[b];
        let drawing = false;
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 1 / 48) {
          const { x, y, z } = project(slerp(from, to, t));
          if (z <= 0.02) {
            drawing = false;
            continue;
          }
          if (!drawing) {
            ctx.moveTo(x, y);
            drawing = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = `rgb(${ACCENT})`;
        ctx.stroke();
      }

      for (const n of nodes) {
        const { x, y, z } = project(n);
        if (z <= 0) continue;
        ctx.globalAlpha = 0.25 + z * 0.5;
        ctx.fillStyle = `rgb(${ACCENT})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.14 * z;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      if (!reduced) {
        spin += 0.0016;
        raf = requestAnimationFrame(draw);
      }
    };

    resize();
    draw();

    const onResize = () => {
      resize();
      if (reduced) draw();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
