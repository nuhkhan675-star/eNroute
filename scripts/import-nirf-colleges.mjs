// Adds the Indian colleges students actually search for.
//
// The ROR import keeps India to institutions whose names say "university" or
// "institute of technology", which is why the catalogue held 1,100 Indian
// universities and still lacked St. Xavier's College, VJTI, NMIMS and TISS.
// NIRF's College, Engineering and Management lists are the shortest honest
// answer to "which colleges matter": every entry is an institution the
// Ministry of Education ranked, so nothing here is a tutoring outfit.
//
// Only NAMES and CITIES are taken from NIRF -- plain facts, not the ranking
// itself, which is why no rank or score is stored. Websites come from ROR
// (CC0) where it knows the institution; without one the photo scrape has
// nowhere to look and the row stays searchable but photo-less, which is the
// intended behaviour: a university without a photo is never recommended,
// only found when searched for by name.
//
// Usage:
//   node scripts/import-nirf-colleges.mjs --dry-run
//   node scripts/import-nirf-colleges.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");
const YEAR = 2025;

// The top 100 of each list is a ranked table with an institute ID per row;
// 101-150 and 151-200 are unranked bands on separate pages with just name,
// city and state. Management only publishes to 150.
const PAGES = [
  ["College", ""], ["College", "150"], ["College", "200"],
  ["Engineering", ""], ["Engineering", "150"], ["Engineering", "200"],
  ["Management", ""], ["Management", "150"],
];

const ID_RE = /<td[^>]*>\s*(IR-[A-Z]-[A-Z]-\d+)\s*<\/td>/g;
const CELL_RE = /<td[^>]*>([\s\S]*?)<\/td>/g;
const ROW_RE = /<tr[^>]*>([\s\S]*?)<\/tr>/g;

function clean(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tidyName(n) {
  return n.replace(/\s*More Details.*$/i, "").replace(/[`’]/g, "'").trim();
}

function normalizeName(n) {
  return clean(n)
    .toLowerCase()
    .replace(/[`'’]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\b(the|of|and|&)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchPage(list, suffix) {
  const url = `https://www.nirfindia.org/Rankings/${YEAR}/${list}Ranking${suffix}.html`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`${list}${suffix}: ${res.status}`);
  const html = await res.text();
  const out = [];

  if (suffix === "") {
    // Ranked table. The name cell holds a nested "More Details" table with
    // its own </tr>, so rows can't be split on </tr>; split at each ID and
    // read the cells that follow: name, four sub-scores, city, state, score,
    // rank -- city is fourth from last.
    const ids = [...html.matchAll(ID_RE)];
    for (let i = 0; i < ids.length; i++) {
      const from = ids[i].index + ids[i][0].length;
      const to = i + 1 < ids.length ? ids[i + 1].index : html.length;
      const cells = [...html.slice(from, to).matchAll(CELL_RE)].map((c) => clean(c[1]));
      if (cells.length < 5) continue;
      const name = tidyName(cells[0]);
      if (name) out.push({ name, city: cells[cells.length - 4] || null, list });
    }
  } else {
    // Band table: plain rows of name, city, state.
    for (const m of html.matchAll(ROW_RE)) {
      const cells = [...m[1].matchAll(CELL_RE)].map((c) => clean(c[1]));
      if (cells.length !== 3) continue;
      const name = tidyName(cells[0]);
      if (name) out.push({ name, city: cells[1] || null, list });
    }
  }
  return out;
}

// ROR is asked only to supply a website for a name NIRF gave us. The top hit
// is trusted on an exact normalised name, or on a same-city hit whose name
// shares its first two words -- enough to tell "St. Xavier's College" in
// Kolkata from the one in Palayamkottai without inventing a match.
async function rorWebsite(name, city) {
  try {
    const res = await fetch(
      `https://api.ror.org/v2/organizations?query=${encodeURIComponent(name)}&filter=country.country_code:IN`,
    );
    if (!res.ok) return null;
    const hit = (await res.json()).items?.[0];
    if (!hit) return null;
    const display = hit.names?.find((n) => n.types?.includes("ror_display"))?.value ?? "";
    const a = normalizeName(display), b = normalizeName(name);
    const hitCity = (hit.locations?.[0]?.geonames_details?.name ?? "").toLowerCase();
    // A city disagreement is disqualifying even on an exact name: there are
    // St. Xavier's Colleges in Kolkata, Mumbai and Ahmedabad, and the first
    // version of this handed all three the Kolkata website.
    if (city && hitCity && hitCity !== city.toLowerCase()) return null;
    const sameCity = city && hitCity && hitCity === city.toLowerCase();
    const sameStart = a.split(" ").slice(0, 2).join(" ") === b.split(" ").slice(0, 2).join(" ");
    if (a !== b && !(sameCity && sameStart)) return null;
    return hit.links?.find((l) => l.type === "website")?.value ?? null;
  } catch {
    return null;
  }
}

const { data: countries } = await sb.from("countries").select("id, name");
const INDIA = countries.find((c) => c.name === "India").id;

const existing = [];
for (let f = 0; ; f += 1000) {
  const { data } = await sb.from("universities").select("name").eq("country_id", INDIA).range(f, f + 999);
  existing.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}
const have = new Set(existing.map((u) => normalizeName(u.name)));

const seen = new Set();
const candidates = [];
for (const [list, suffix] of PAGES) {
  const rows = await fetchPage(list, suffix);
  console.log(`${list}${suffix || " top 100"}: ${rows.length} rows`);
  for (const r of rows) {
    // Same-named colleges in different cities are different institutions.
    const key = normalizeName(r.name) + "|" + (r.city ?? "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (have.has(normalizeName(r.name))) continue;
    candidates.push(r);
  }
}
console.log(`\n${candidates.length} not yet in the catalogue\n`);

let inserted = 0, withSite = 0;
for (const c of candidates) {
  const website = await rorWebsite(c.name, c.city);
  if (website) withSite++;
  console.log(`${DRY_RUN ? "[dry-run] " : ""}${c.name.slice(0, 66).padEnd(66)} ${String(c.city ?? "").padEnd(18)} ${website ?? "-"}`);
  if (DRY_RUN) continue;
  const { error } = await sb.from("universities").insert({ name: c.name, country_id: INDIA, city: c.city, website });
  if (error) { console.log("   ERROR " + error.message); continue; }
  inserted++;
}
console.log(`\n${DRY_RUN ? "[dry-run] would insert" : "inserted"} ${DRY_RUN ? candidates.length : inserted}  |  with a website: ${withSite}`);
