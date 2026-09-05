// Populates university_admission_requirements with SAT/ACT score bands from
// the U.S. Dept of Education's College Scorecard, for universities already
// imported by import-college-scorecard.mjs (matched on ipeds_unit_id).
//
// These are the 25th-75th percentile ranges of ADMITTED students -- the
// middle 50%, not a cutoff. They're stored and described as such so nothing
// downstream can present them as a hard minimum.
//
// Idempotent: upserts on (university_id, requirement_type).
//
// Usage:
//   node scripts/import-scorecard-requirements.mjs --dry-run
//   node scripts/import-scorecard-requirements.mjs

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const SCORECARD_KEY = process.env.COLLEGE_SCORECARD_API_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_NAME = "U.S. Dept of Education College Scorecard (IPEDS)";

const F = {
  satReadLo: "latest.admissions.sat_scores.25th_percentile.critical_reading",
  satReadHi: "latest.admissions.sat_scores.75th_percentile.critical_reading",
  satMathLo: "latest.admissions.sat_scores.25th_percentile.math",
  satMathHi: "latest.admissions.sat_scores.75th_percentile.math",
  satAvg: "latest.admissions.sat_scores.average.overall",
  actLo: "latest.admissions.act_scores.25th_percentile.cumulative",
  actHi: "latest.admissions.act_scores.75th_percentile.cumulative",
};

async function fetchAll() {
  const fields = ["id", "school.name", ...Object.values(F)].join(",");
  const out = [];
  for (let page = 0; page < 30; page++) {
    const url =
      `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${SCORECARD_KEY}` +
      `&school.degrees_awarded.predominant=3&school.operating=1&school.ownership__range=1..2` +
      `&latest.student.size__range=2000..&fields=${fields}&per_page=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Scorecard API ${res.status}`);
    const json = await res.json();
    const rows = json.results ?? [];
    out.push(...rows);
    if (rows.length < 100) break;
  }
  return out;
}

function buildRequirements(r) {
  const reqs = [];
  const push = (type, lo, hi, description) => {
    if (lo == null && hi == null) return;
    reqs.push({ requirement_type: type, min_value: lo, max_value: hi, description });
  };

  push(
    "sat_reading",
    r[F.satReadLo],
    r[F.satReadHi],
    `Admitted students' middle 50% scored ${r[F.satReadLo]}-${r[F.satReadHi]} on SAT Reading/Writing`
  );
  push(
    "sat_math",
    r[F.satMathLo],
    r[F.satMathHi],
    `Admitted students' middle 50% scored ${r[F.satMathLo]}-${r[F.satMathHi]} on SAT Math`
  );
  // Section percentiles can't simply be summed into a total range, so the
  // total is only recorded where Scorecard publishes an actual average.
  if (r[F.satAvg] != null) {
    reqs.push({
      requirement_type: "sat_total",
      min_value: r[F.satAvg],
      max_value: r[F.satAvg],
      description: `Average admitted SAT total: ${r[F.satAvg]}`,
    });
  }
  push(
    "act_composite",
    r[F.actLo],
    r[F.actHi],
    `Admitted students' middle 50% scored ${r[F.actLo]}-${r[F.actHi]} on the ACT composite`
  );

  return reqs.filter((x) => x.min_value != null || x.max_value != null);
}

async function main() {
  if (!SCORECARD_KEY) throw new Error("COLLEGE_SCORECARD_API_KEY not set in .env.local");

  const { data: source } = await supabase.from("data_sources").select("id").eq("name", SOURCE_NAME).maybeSingle();
  if (!source && !DRY_RUN) throw new Error(`Data source "${SOURCE_NAME}" not found -- run import-college-scorecard.mjs first`);

  // Only universities we already imported, matched on the stable IPEDS key.
  const byIpeds = new Map();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("universities")
      .select("id, ipeds_unit_id")
      .not("ipeds_unit_id", "is", null)
      .range(from, from + 999);
    for (const u of data ?? []) byIpeds.set(u.ipeds_unit_id, u.id);
    if ((data ?? []).length < 1000) break;
  }
  console.log(`${byIpeds.size} universities on file with an IPEDS id.`);

  const rows = await fetchAll();
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  let universitiesWithData = 0;
  let requirementRows = 0;
  let skippedNoScores = 0;
  let notInDb = 0;
  const batch = [];

  for (const r of rows) {
    const universityId = byIpeds.get(r.id);
    if (!universityId) {
      notInDb++;
      continue;
    }
    const reqs = buildRequirements(r);
    if (reqs.length === 0) {
      skippedNoScores++;
      continue;
    }
    universitiesWithData++;
    requirementRows += reqs.length;
    for (const req of reqs) {
      batch.push({
        university_id: universityId,
        ...req,
        data_source_id: source?.id ?? null,
        data_year: year,
        last_verified_at: today,
      });
    }
  }

  console.log(
    `Scorecard rows: ${rows.length} | in our DB: ${rows.length - notInDb} | ` +
      `with score data: ${universitiesWithData} | no scores published: ${skippedNoScores}`
  );
  console.log(`Requirement rows to write: ${requirementRows}`);

  if (DRY_RUN) {
    console.log("\n[dry-run] sample:");
    batch.slice(0, 6).forEach((b) => console.log(`  ${b.requirement_type}: ${b.description}`));
    return;
  }

  for (let i = 0; i < batch.length; i += 500) {
    const chunk = batch.slice(i, i + 500);
    const { error } = await supabase
      .from("university_admission_requirements")
      .upsert(chunk, { onConflict: "university_id,requirement_type" });
    if (error) console.error(`  ERROR on chunk ${i}: ${error.message}`);
    else process.stdout.write(`\r  written ${Math.min(i + 500, batch.length)}/${batch.length}`);
  }
  console.log(`\nDone. ${requirementRows} requirement rows across ${universitiesWithData} universities.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
