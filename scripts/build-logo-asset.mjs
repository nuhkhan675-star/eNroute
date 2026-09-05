// Turns a generated eNroute logo (flat dark-navy background baked in) into a
// tight, transparent PNG. Two modes, because the two source artworks need
// genuinely different treatment -- both choices are measured, not guessed.
//
//   --mode=flood  (the inline "N" glyph)
//     That artwork sits on a GRIDDED background, and its grid lines measure
//     ~35 from the background colour while the darkest part of the tassel
//     measures ~29 -- they overlap, so no colour-distance threshold can split
//     them. What does split them is BLUENESS: background and grid are strongly
//     blue (B-R ~23-25) while the mortarboard and tassel are neutral (B-R ~-4
//     to +1). Filling inward from the borders on that predicate removes only
//     background actually connected to the edge, so interior darks survive.
//
//   --mode=key  (the navbar lockup)
//     Flat background, no grid, and every structural pixel is far from it
//     (background spread <=5, nearest logo pixel 26). A plain colour key is
//     therefore safe -- and unlike a flood fill it also hollows out ENCLOSED
//     counters, such as the loop inside the "e", which a flood fill would
//     leave filled with opaque navy.
//
// Both modes then drop small disconnected islands (the decorative sparkle in
// the corner) and crop to the remaining content. Islands are removed by size
// rather than by keeping only the largest component, so a lockup whose cap and
// lettering are not touching survives intact.
//
// Usage:
//   node scripts/build-logo-asset.mjs <source.png> --out=public/brand/x.png [--mode=key|flood] [--tol=16]
import sharp from "sharp";

const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith("--"));
const get = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split("=")[1] : d; };
const OUT = get("out");
const MODE = get("mode", "flood");
const TOL = Number(get("tol", 16));
const MIN_ISLAND = Number(get("min-island", 2000));
if (!src || !OUT) { console.error("usage: build-logo-asset.mjs <source.png> --out=<path> [--mode=key|flood]"); process.exit(1); }

const img = sharp(src).ensureAlpha();
const { width: W, height: H } = await img.metadata();
const raw = await img.raw().toBuffer();
const N = W * H;

const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]];
const seed = [0, 1, 2].map((c) => Math.round(corners.reduce((s, [x, y]) => s + raw[((y * W + x) * 4) + c], 0) / 4));
console.log(`source ${W}x${H}  mode=${MODE}  background seed rgb(${seed.join(",")})`);

const bg = new Uint8Array(N);

if (MODE === "key") {
  const isBg = (p) => {
    const i = p * 4;
    const dr = raw[i] - seed[0], dg = raw[i + 1] - seed[1], db = raw[i + 2] - seed[2];
    return Math.sqrt(dr * dr + dg * dg + db * db) <= TOL;
  };
  for (let p = 0; p < N; p++) if (isBg(p)) bg[p] = 1;
} else {
  const BLUE_MIN = 12, BLUE_MAX = 45, LUMA_MAX = 75;
  const isBg = (p) => {
    const i = p * 4, r = raw[i], g = raw[i + 1], b = raw[i + 2];
    const blueness = b - r;
    return blueness >= BLUE_MIN && blueness <= BLUE_MAX && Math.max(r, g, b) < LUMA_MAX;
  };
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (bg[p] || !isBg(p)) continue;
    bg[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
}

// Drop small islands (decorative sparkle etc), keep every substantial part.
const seen = new Uint8Array(N);
const keep = new Uint8Array(N);
let kept = 0, dropped = 0;
for (let p0 = 0; p0 < N; p0++) {
  if (bg[p0] || seen[p0]) continue;
  const comp = [];
  const st = [p0];
  seen[p0] = 1;
  while (st.length) {
    const p = st.pop();
    comp.push(p);
    const x = p % W, y = (p / W) | 0;
    const nb = [];
    if (x > 0) nb.push(p - 1);
    if (x < W - 1) nb.push(p + 1);
    if (y > 0) nb.push(p - W);
    if (y < H - 1) nb.push(p + W);
    for (const np of nb) if (!bg[np] && !seen[np]) { seen[np] = 1; st.push(np); }
  }
  if (comp.length >= MIN_ISLAND) { for (const p of comp) keep[p] = 1; kept++; }
  else dropped++;
}
console.log(`components kept: ${kept}   small islands dropped: ${dropped}`);

let minX = W, minY = H, maxX = 0, maxY = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (keep[p]) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  else raw[p * 4 + 3] = 0;
}
const cw = maxX - minX + 1, ch = maxY - minY + 1;
console.log(`crop box: ${cw}x${ch} at (${minX},${minY})`);

await sharp(raw, { raw: { width: W, height: H, channels: 4 } })
  .extract({ left: minX, top: minY, width: cw, height: ch })
  .png({ compressionLevel: 9 })
  .toFile(OUT);
const m = await sharp(OUT).metadata();
console.log(`wrote ${OUT}  ${m.width}x${m.height}`);
