"use client";

import { useEffect, useRef } from "react";
import { LAND_GRID_BITS, LAND_GRID_COLS, LAND_GRID_ROWS, LAND_GRID_STEP } from "@/lib/content/worldMap";

/**
 * Rotating dot-globe with the six supported countries pinned, labelled, and
 * joined by great-circle arcs. Drag it to spin.
 *
 * Canvas with a hand-rolled orthographic projection rather than three.js: the
 * scene is a few thousand points and six arcs. Land comes from the packed bit
 * grid in lib/content/worldMap.ts, generated from the same Natural Earth data
 * as the 2D map.
 */
const COUNTRIES: { label: string; lat: number; lon: number }[] = [
  { label: "USA", lat: 39, lon: -98 },
  { label: "UK", lat: 54, lon: -2 },
  { label: "INDIA", lat: 22, lon: 79 },
  { label: "SINGAPORE", lat: 1.3, lon: 103.8 },
  { label: "HONG KONG", lat: 22.3, lon: 114.2 },
  { label: "AUSTRALIA", lat: -25, lon: 134 },
];

// A ring rather than every pair: six nodes fully connected is fifteen arcs,
// which reads as a scribble at this size.
const LINKS = COUNTRIES.map((_, i) => [i, (i + 1) % COUNTRIES.length] as const);

const LAND = "148,163,184";
const ACCENT = "165,180,252";
const AUTO_SPIN = 0.0014;

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
    const stride = Math.max(1, Math.round(1 / Math.max(0.06, Math.cos((lat * Math.PI) / 180))));
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
    let spin = -0.6;
    let tilt = (18 * Math.PI) / 180;
    // Carried after release so a flick keeps going, then settles back into the
    // idle drift instead of stopping dead.
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(w, h) * 0.44;
    };

    // Rotate about Y by `spin`, tilt about X, then drop the depth term.
    const project = (v: Vec) => {
      const cosS = Math.cos(spin);
      const sinS = Math.sin(spin);
      const x1 = v[0] * cosS + v[2] * sinS;
      const z1 = -v[0] * sinS + v[2] * cosS;
      const y2 = v[1] * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = v[1] * Math.sin(tilt) + z1 * Math.cos(tilt);
      return { x: w / 2 + x1 * radius, y: h / 2 - y2 * radius, z: z2 };
    };

    const drawLabel = (text: string, x: number, y: number, alpha: number) => {
      ctx.font = "600 10px ui-sans-serif, system-ui, sans-serif";
      const padX = 6;
      const tw = ctx.measureText(text).width;
      const bx = x + 9;
      const by = y - 9;
      ctx.globalAlpha = alpha * 0.85;
      ctx.fillStyle = "rgba(15,23,42,0.85)";
      ctx.beginPath();
      ctx.roundRect(bx, by, tw + padX * 2, 18, 9);
      ctx.fill();
      ctx.globalAlpha = alpha * 0.35;
      ctx.strokeStyle = `rgb(${ACCENT})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${ACCENT})`;
      ctx.fillText(text, bx + padX, by + 12.5);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // The limb, plus a soft fill. Without an edge the dots read as scattered
      // confetti rather than as the surface of a sphere.
      const glow = ctx.createRadialGradient(w / 2, h / 2, radius * 0.2, w / 2, h / 2, radius);
      glow.addColorStop(0, `rgba(${ACCENT},0.06)`);
      glow.addColorStop(1, `rgba(${ACCENT},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = `rgb(${ACCENT})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (const p of land) {
        const { x, y, z } = project(p);
        if (z <= 0) continue; // back of the sphere
        ctx.globalAlpha = 0.16 + z * 0.44;
        ctx.fillStyle = `rgb(${LAND})`;
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 1;
      for (const [a, b] of LINKS) {
        let drawing = false;
        ctx.beginPath();
        for (let t = 0; t <= 1.0001; t += 1 / 64) {
          const { x, y, z } = project(slerp(nodes[a], nodes[b], t));
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
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = `rgb(${ACCENT})`;
        ctx.stroke();
      }

      nodes.forEach((n, i) => {
        const { x, y, z } = project(n);
        if (z <= 0) return;
        ctx.globalAlpha = 0.3 + z * 0.55;
        ctx.fillStyle = `rgb(${ACCENT})`;
        ctx.beginPath();
        ctx.arc(x, y, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.12 * z;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        // Fade the label out as the pin rounds the edge, so it doesn't sit on
        // the limb detached from its dot.
        if (z > 0.22) drawLabel(COUNTRIES[i].label, x, y, Math.min(1, (z - 0.22) * 3));
      });

      ctx.globalAlpha = 1;

      if (!dragging) {
        if (Math.abs(velocity) > 0.0002) {
          spin += velocity;
          velocity *= 0.94;
        } else if (!reduced) {
          spin += AUTO_SPIN;
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      spin += dx * 0.006;
      velocity = dx * 0.006;
      // Clamped so you can tip the globe without flipping it inside out.
      tilt = Math.max(-0.9, Math.min(0.9, tilt + dy * 0.004));
    };
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
      canvas.style.cursor = "grab";
    };

    resize();
    canvas.style.cursor = "grab";
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}
