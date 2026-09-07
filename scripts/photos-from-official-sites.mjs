// Sources campus photos from each university's own website.
//
// Wikimedia was the previous source and it was wrong in a way that only shows
// up visually: its categories collect anything ever tagged with the
// institution, so City University of Hong Kong got a bouquet of flowers,
// Edinburgh an 18th-century engraving and Aberdeen a Canaletto painting. A
// university's own homepage, by contrast, leads with a photo it chose to
// represent itself.
//
// Candidates are taken in order of how deliberate they are: og:image is the
// image the site explicitly nominates for sharing, then twitter:image, then
// link[rel=image_src], then the largest hero <img> we can find. Every
// candidate must survive the logo filter and a real fetch.
import fs from "node:fs";

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_a-z0-9]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
});
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0);
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").split("=")[1];

const UA = {
  "User-Agent": "Mozilla/5.0 (compatible; eNrouteBot/1.0; +https://enroute.app)",
  Accept: "text/html,application/xhtml+xml",
};

// Logos, crests and icons are images of the institution's *branding*, not of
// the institution. They read as broken to a student scanning a card grid.
const NOT_A_PHOTO = /logo|icon|favicon|crest|wordmark|sprite|placeholder|avatar|banner-?ad|shield|emblem/i;
const MIN_BYTES = 18_000; // logos are small; campus photography is not

function absolutise(src, base) {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

function candidatesFrom(html, base) {
  const out = [];
  const push = (s) => {
    const abs = s && absolutise(s.replace(/&amp;/g, "&"), base);
    if (abs && !out.includes(abs)) out.push(abs);
  };

  for (const prop of ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) {
    const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]*>', "gi");
    for (const tag of html.match(re) || []) push((tag.match(/content=["']([^"']+)["']/i) || [])[1]);
  }
  const linkImg = html.match(/<link[^>]+rel=["']image_src["'][^>]*>/i);
  if (linkImg) push((linkImg[0].match(/href=["']([^"']+)["']/i) || [])[1]);

  // Hero images: any <img> whose src looks like real photography.
  for (const tag of (html.match(/<img[^>]+>/gi) || []).slice(0, 60)) {
    const src = (tag.match(/(?:data-src|srcset|src)=["']([^"'\s]+)/i) || [])[1];
    if (src && /\.(jpe?g|webp)(\?|$)/i.test(src)) push(src);
  }
  return out.filter((u) => !NOT_A_PHOTO.test(u) && !/\.svg(\?|$)/i.test(u));
}

// File size alone lets 320x240 blog thumbnails through, so read the real
// dimensions out of the image header. Cards render ~200px wide on a 2x
// display, and anything below this looks soft or is a thumbnail, not a hero.
const MIN_W = 480;
const MIN_H = 270;

function dimensions(buf) {
  // PNG: IHDR width/height are big-endian at bytes 16..24.
  if (buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG") {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // WebP: VP8X / VP8 / VP8L each store size differently.
  if (buf.length > 30 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const fmt = buf.toString("ascii", 12, 16);
    if (fmt === "VP8X") return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
    if (fmt === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
    if (fmt === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG: walk the segment chain to the first SOF marker.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

async function validate(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA["User-Agent"] },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const type = r.headers.get("content-type") || "";
    if (!/^image\/(jpeg|jpg|png|webp)/i.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < MIN_BYTES) return null;
    const d = dimensions(buf);
    // An unreadable header means an unusual encoding, not necessarily a bad
    // photo -- but we can't verify it, so skip rather than risk another
    // bouquet-of-flowers situation.
    if (!d || d.w < MIN_W || d.h < MIN_H) return null;
    return { url, bytes: buf.length, w: d.w, h: d.h };
  } catch {
    return null;
  }
}

async function photoFor(site) {
  let base = site;
  if (!/^https?:\/\//i.test(base)) base = "https://" + base;
  let html;
  try {
    const r = await fetch(base, { headers: UA, redirect: "follow", signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return { error: "HTTP " + r.status };
    base = r.url;
    html = await r.text();
  } catch (e) {
    return { error: (e.cause?.code || e.message || "fetch failed").toString().slice(0, 40) };
  }
  for (const c of candidatesFrom(html, base).slice(0, 6)) {
    const ok = await validate(c);
    if (ok) return { photo: ok.url, bytes: ok.bytes, w: ok.w, h: ok.h };
  }
  return { error: "no usable image" };
}

async function getAll(path) {
  const out = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(U + "/rest/v1/" + path + "&limit=1000&offset=" + o, { headers: H });
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

let unis = await getAll("universities?select=id,name,website,photo_url,photo_source_type&order=name");
unis = unis.filter((u) => u.website);
if (ONLY) unis = unis.filter((u) => u.name.toLowerCase().includes(ONLY.toLowerCase()));
if (process.argv.includes("--missing")) unis = unis.filter((u) => !u.photo_url);
if (LIMIT) unis = unis.slice(0, LIMIT);

console.log("attempting " + unis.length + " universities\n");

let found = 0;
let done = 0;
const failures = [];
const CONCURRENCY = 16;

// A worker pool rather than batched Promise.all: batching makes every worker
// wait on the slowest site in its group, and plenty of these domains are dead
// or hang until the timeout fires.
let cursor = 0;
async function worker() {
  for (;;) {
    const u = unis[cursor++];
    if (!u) return;
    const res = await photoFor(u.website);
    done++;
    if (res.photo) {
      found++;
      console.log(
        "OK   " + u.name + "\n       " + res.photo + "  (" + res.w + "x" + res.h + ", " + Math.round(res.bytes / 1024) + "kb)",
      );
      if (APPLY) {
        await fetch(U + "/rest/v1/universities?id=eq." + u.id, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({
            photo_url: res.photo,
            photo_source_type: "official_website",
            photo_source_url: u.website,
            photo_attribution: u.name + " (official website)",
            photo_last_verified_at: new Date().toISOString(),
          }),
        });
      }
    } else {
      failures.push(u.name + "  --  " + res.error);
    }
    if (done % 100 === 0) console.log("... " + done + "/" + unis.length + "  (" + found + " found)");
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log("\n=== " + found + " found, " + failures.length + " failed, of " + unis.length + " ===");
console.log("\nfailures (first 25):");
failures.slice(0, 25).forEach((f) => console.log("  " + f));
if (!APPLY) console.log("\nDRY RUN. re-run with --apply to write.");
