// Bulk-imports US universities + their overall acceptance rate from the
// U.S. Dept of Education's College Scorecard API (built on IPEDS) into
// universities + university_admission_statistics (university-id-keyed,
// never requires a university_programs row to exist) + data_sources.
//
// Idempotent: upserts on universities.ipeds_unit_id (the Scorecard/IPEDS
// "id" field), so re-running this script updates existing rows instead of
// duplicating them.
//
// Usage:
//   node scripts/import-college-scorecard.mjs --limit=20                    (test batch)
//   node scripts/import-college-scorecard.mjs --limit=20 --dry-run          (print only, no writes)
//   node scripts/import-college-scorecard.mjs --min-enrollment=2000         (narrow to recognizable 4-yr schools)
//   node scripts/import-college-scorecard.mjs                               (full run, all matching schools)
//
// Requires COLLEGE_SCORECARD_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SCORECARD_KEY = process.env.COLLEGE_SCORECARD_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const DRY_RUN = !!args["dry-run"];
// Keeps the catalog to schools a student would plausibly recognize and
// search for, rather than every tiny niche college in the IPEDS universe.
const MIN_ENROLLMENT = args["min-enrollment"] ? parseInt(args["min-enrollment"], 10) : 2000;

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.school_url",
  "school.ownership",
  "latest.admissions.admission_rate.overall",
  "latest.student.size",
].join(",");

const SOURCE_NAME = "U.S. Dept of Education College Scorecard (IPEDS)";

async function fetchPage(page, perPage) {
  const url =
    `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${SCORECARD_KEY}` +
    `&school.degrees_awarded.predominant=3&school.operating=1&school.ownership__range=1..2` +
    `&latest.student.size__range=${MIN_ENROLLMENT}..` +
    `&fields=${FIELDS}&per_page=${perPage}&page=${page}&sort=school.name:asc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scorecard API ${res.status}: ${await res.text()}`);
  return res.json();
}

function normalizeUrl(raw) {
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// Reconciles Scorecard's naming against names already in our DB so a school
// we already have doesn't get inserted a second time. Scorecard uses
// "Purdue University-Main Campus" / "Columbia University in the City of New
// York" / "The University of Texas at Austin" where we have the short form.
// Deterministic string rules only -- no fuzzy matching, which risks pairing
// genuinely different schools ("Columbia College" vs "Columbia University").
function normalizeName(n) {
  return n
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\(.*?\)/g, "")
    .replace(
      /\s*[-–]\s*(main campus|twin cities|ann arbor|seattle campus|pittsburgh campus|college station|bloomington|columbus|amherst|chapel hill|newark|new brunswick).*/,
      ""
    )
    .replace(/\s+campus immersion$/, "")
    .replace(/\s+in the city of new york$/, "")
    .replace(/\buniversity of\b/g, "")
    .replace(/\buniversity\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function ensureDataSource() {
  const { data: existing } = await supabase.from("data_sources").select("id").eq("name", SOURCE_NAME).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase
    .from("data_sources")
    .insert({ name: SOURCE_NAME, url: "https://collegescorecard.ed.gov/", source_type: "official", reliability_tier: "high" })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  if (!SCORECARD_KEY) throw new Error("COLLEGE_SCORECARD_API_KEY not set in .env.local");

  const { data: usCountry } = await supabase.from("countries").select("id").eq("iso_code", "US").single();
  const dataSourceId = DRY_RUN ? null : await ensureDataSource();

  // Everything already on file for the US, indexed by normalized name, so an
  // existing row gets UPDATED rather than duplicated.
  const { data: existingRows } = await supabase
    .from("universities")
    .select("id, name, ipeds_unit_id")
    .eq("country_id", usCountry.id);
  const existingByName = new Map();
  for (const row of existingRows ?? []) existingByName.set(normalizeName(row.name), row);
  console.log(`Reconciling against ${existingRows?.length ?? 0} US universities already on file.\n`);
  let updatedExisting = 0;
  let insertedNew = 0;

  const perPage = LIMIT ? Math.min(LIMIT, 100) : 100;
  let page = 0;
  let fetched = 0;
  let written = 0;
  let skippedNoRate = 0;
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  for (;;) {
    const json = await fetchPage(page, perPage);
    const results = json.results ?? [];
    if (results.length === 0) break;

    for (const r of results) {
      if (LIMIT && fetched >= LIMIT) break;
      fetched++;

      const name = r["school.name"];
      const city = r["school.city"];
      const website = normalizeUrl(r["school.school_url"]);
      const ownership = r["school.ownership"];
      const acceptanceRateRaw = r["latest.admissions.admission_rate.overall"];
      const acceptanceRate = acceptanceRateRaw != null ? Math.round(acceptanceRateRaw * 1000) / 10 : null;
      const ipedsId = r.id;

      console.log(
        `${DRY_RUN ? "[dry-run] " : ""}${name} (${city}, ${r["school.state"]}) -- ipeds:${ipedsId} -- ` +
          `type:${ownership === 1 ? "public" : "private"} -- acceptance_rate:${acceptanceRate ?? "none"}`
      );

      if (acceptanceRate == null) {
        skippedNoRate++;
        continue; // don't write a university row with no real statistic to attach -- nothing to gain over what's already there
      }

      if (DRY_RUN) {
        written++;
        continue;
      }

      const existing = existingByName.get(normalizeName(name));
      let uni;

      if (existing) {
        // Keep OUR display name (the short, familiar form students search
        // for) and only fill in what we're missing plus the stable IPEDS key.
        const { data, error } = await supabase
          .from("universities")
          .update({
            ipeds_unit_id: ipedsId,
            city,
            website,
            university_type: ownership === 1 ? "public" : "private",
            data_year: year,
            last_verified_at: today,
          })
          .eq("id", existing.id)
          .select("id")
          .single();
        if (error) {
          console.error(`  ERROR updating ${name}: ${error.message}`);
          continue;
        }
        uni = data;
        updatedExisting++;
      } else {
        const { data, error } = await supabase
          .from("universities")
          .upsert(
            {
              ipeds_unit_id: ipedsId,
              name,
              country_id: usCountry.id,
              city,
              website,
              university_type: ownership === 1 ? "public" : "private",
              data_source_id: dataSourceId,
              data_year: year,
              last_verified_at: today,
            },
            { onConflict: "ipeds_unit_id" }
          )
          .select("id")
          .single();
        if (error) {
          console.error(`  ERROR inserting ${name}: ${error.message}`);
          continue;
        }
        uni = data;
        insertedNew++;
      }

      // University-level rate, keyed straight to the university -- no
      // university_programs row needs to exist for this to be usable by the
      // prediction engine (that's the whole point of the university-level
      // model).
      const { error: statErr } = await supabase.from("university_admission_statistics").upsert(
        {
          university_id: uni.id,
          year,
          acceptance_rate: acceptanceRate,
          confidence: "high",
          data_source_id: dataSourceId,
          last_verified_at: today,
        },
        { onConflict: "university_id,year" }
      );
      if (statErr) console.error(`  ERROR upserting stats for ${name}: ${statErr.message}`);

      written++;
    }

    if (LIMIT && fetched >= LIMIT) break;
    if (results.length < perPage) break;
    page++;
  }

  console.log(
    `\nDone. Fetched ${fetched} | updated existing: ${updatedExisting} | inserted new: ${insertedNew} | ` +
      `total written: ${written} | skipped (no published rate): ${skippedNoRate}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
