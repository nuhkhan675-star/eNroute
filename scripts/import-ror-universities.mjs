// Bulk-imports university IDENTITY data (name, city, website) for the five
// non-US countries from the Research Organization Registry (ROR), which is
// released under CC0 -- no licensing constraint, unlike the ranking companies
// and the state admissions centres we had to rule out.
//
// This is the equivalent of what College Scorecard did for the US, with one
// honest difference: ROR carries NO acceptance rates. Nothing here writes a
// rate, a ranking, or any quantitative claim -- purely structural facts. Rates
// for these schools come separately from the per-university sourced lookup.
//
// Idempotent: matches existing rows on a normalized name within the same
// country, so re-running updates rather than duplicating.
//
// Usage:
//   node scripts/import-ror-universities.mjs --dry-run
//   node scripts/import-ror-universities.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

const COUNTRIES = [
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
];

// ROR's "education" type covers everything from research universities down to
// small private training providers. Keep it to degree-granting institutions a
// student would actually apply to, rather than importing hundreds of FE
// colleges and tutoring outfits that would bloat the catalogue and the
// typeahead.
const UNIVERSITY_NAME = /\b(university|universiti|vishwavidyalaya|vidyapeeth|institute of (technology|engineering|science)|indian institute|national institute of technology|polytechnic university|college of engineering|school of economics)\b/i;
// Explicit exclusions for well-known non-degree or non-teaching bodies.
const EXCLUDE = /\b(hospitals?|clinics?|polyclinics?|heart centre|cancer institute|health (board|system|authority|centre|center)|medical cent(re|er)|nhs|virtual university|children's university|third age|councils?|consortium|confederation|federation|associations?|society|grants committee|libraries|library|awards|museums?|trust|academy trust|further education|sixth form|university press|university systems|university colleges|language (school|centre)|training (centre|provider)|centre for|center for)\b/i;

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchAllRor(code) {
  const out = [];
  let page = 1;
  for (;;) {
    // NOTE: deliberately NOT filtering on types:education. That facet is
    // incomplete -- Thapar Institute of Engineering & Technology is absent
    // from it entirely despite being tagged "education" on its own record,
    // and O. P. Jindal Global University is missing while a different "OP
    // Jindal University" is present. Fetching the whole country and relying
    // on UNIVERSITY_NAME/EXCLUDE below is slower but actually complete.
    const url = `https://api.ror.org/v2/organizations?filter=country.country_code:${code}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ROR ${code} page ${page}: ${res.status}`);
    const json = await res.json();
    const items = json.items ?? [];
    if (items.length === 0) break;
    out.push(...items);
    if (out.length >= (json.number_of_results ?? 0)) break;
    page++;
    if (page > 500) break; // ROR pages are 20 items; India alone has 2,106
  }
  return out;
}

function toRow(item) {
  const display = item.names?.find((n) => n.types?.includes("ror_display"))?.value
    ?? item.names?.[0]?.value ?? null;
  if (!display) return null;
  const loc = item.locations?.[0]?.geonames_details ?? null;
  const website = item.links?.find((l) => l.type === "website")?.value ?? null;
  return { name: display, city: loc?.name ?? null, website, rorId: item.id ?? null };
}

const { data: countryRows, error: cErr } = await supabase.from("countries").select("id, name");
if (cErr) throw cErr;

let grandNew = 0, grandExisting = 0;
for (const country of COUNTRIES) {
  const countryRow = countryRows.find((c) => c.name === country.name);
  if (!countryRow) { console.log(`!! no countries row named "${country.name}" -- skipped`); continue; }

  const items = await fetchAllRor(country.code);
  const candidates = items
    .map(toRow)
    .filter((r) => r && UNIVERSITY_NAME.test(r.name) && !EXCLUDE.test(r.name));

  const { data: existing } = await supabase
    .from("universities").select("id, name").eq("country_id", countryRow.id);
  const existingByNorm = new Map((existing ?? []).map((u) => [normalizeName(u.name), u]));

  const toInsert = [];
  const seen = new Set();
  for (const c of candidates) {
    const key = normalizeName(c.name);
    if (seen.has(key)) continue;      // dedupe within ROR itself
    seen.add(key);
    if (existingByNorm.has(key)) continue;  // already in our catalogue
    toInsert.push(c);
  }

  console.log(
    `${country.name.padEnd(16)} ROR education=${String(items.length).padStart(4)}` +
    `  university-like=${String(candidates.length).padStart(4)}` +
    `  already have=${String(existing?.length ?? 0).padStart(3)}` +
    `  NEW=${String(toInsert.length).padStart(4)}`
  );
  grandNew += toInsert.length;
  grandExisting += existing?.length ?? 0;

  if (!DRY_RUN && toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 200) {
      const chunk = toInsert.slice(i, i + 200).map((c) => ({
        name: c.name, city: c.city, website: c.website, country_id: countryRow.id,
      }));
      const { error } = await supabase.from("universities").insert(chunk);
      if (error) throw error;
    }
    console.log(`${"".padEnd(16)} inserted ${toInsert.length}`);
  } else if (DRY_RUN && toInsert.length) {
    console.log(`${"".padEnd(16)} sample: ${toInsert.slice(0, 5).map((c) => c.name).join(" | ")}`);
  }
}
console.log(`\n${DRY_RUN ? "[DRY RUN] would add" : "added"} ${grandNew} universities (existing across these 5: ${grandExisting})`);
