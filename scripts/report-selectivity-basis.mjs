// Read-only. Reports, per country, which selectivity basis each university
// WOULD resolve to under lib/ai/prediction/selectivity.ts's priority order:
//
//   acceptance_rate  ->  rank_proxy  ->  ai_estimate  ->  unknown
//
// Mirrors getUniversitiesForAnalysis() exactly (real rate from
// university_admission_statistics; rank from university_rankings filtered to
// ranking_type='global'), so the counts here match what the pipeline will
// actually do rather than approximating it.
//
// "eligible_for_ai" is the addressable population: universities with neither
// a real rate nor a global ranking. How many of those ACTUALLY become
// ai_estimate depends on whether the model returns a number or declines with
// null for each one -- that is measured separately by
// scripts/sample-ai-estimate.mjs, never assumed here.
//
// Usage: node scripts/report-selectivity-basis.mjs [--country=India] [--all-countries]
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const argv = process.argv.slice(2);
const only = argv.find((a) => a.startsWith("--country="))?.split("=")[1] ?? null;
const showAll = argv.includes("--all-countries");

const { data: countries, error } = await supabase.from("countries").select("id, name").order("name");
if (error) throw error;

// Pull every university once, plus its real rate and its GLOBAL ranking.
// PostgREST caps an unbounded select at 1000 rows, silently. With the
// catalogue now over that, an unpaged query under-reported every country and
// made Hong Kong vanish entirely -- page explicitly rather than trusting the
// default.
const PAGE = 1000;
const unis = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from("universities")
    .select(
      "id, name, country_id, university_admission_statistics(acceptance_rate), university_rankings(ranking_value, ranking_type)"
    )
    .order("id")
    .range(from, from + PAGE - 1);
  if (error) throw error;
  unis.push(...(data ?? []));
  if (!data || data.length < PAGE) break;
}

const byCountry = new Map();
for (const u of unis) {
  const hasRate = (u.university_admission_statistics ?? []).some((s) => s.acceptance_rate != null);
  const hasGlobalRank = (u.university_rankings ?? []).some(
    (r) => r.ranking_type === "global" && r.ranking_value != null
  );
  const basis = hasRate ? "acceptance_rate" : hasGlobalRank ? "rank_proxy" : "eligible_for_ai";
  if (!byCountry.has(u.country_id)) byCountry.set(u.country_id, { total: 0, acceptance_rate: 0, rank_proxy: 0, eligible_for_ai: 0, names: [] });
  const row = byCountry.get(u.country_id);
  row.total++;
  row[basis]++;
  if (basis === "eligible_for_ai") row.names.push(u.name);
}

const totals = { total: 0, acceptance_rate: 0, rank_proxy: 0, eligible_for_ai: 0 };
console.log("country            total   real rate   rank proxy   eligible for AI estimate");
console.log("-".repeat(78));
for (const c of countries) {
  const r = byCountry.get(c.id);
  if (!r) continue;
  totals.total += r.total;
  totals.acceptance_rate += r.acceptance_rate;
  totals.rank_proxy += r.rank_proxy;
  totals.eligible_for_ai += r.eligible_for_ai;
  if (!showAll && only && c.name !== only) continue;
  if (!showAll && !only && r.total === 0) continue;
  console.log(
    c.name.padEnd(18) +
      String(r.total).padStart(5) +
      String(r.acceptance_rate).padStart(12) +
      String(r.rank_proxy).padStart(13) +
      String(r.eligible_for_ai).padStart(27)
  );
  if (only && c.name === only) for (const n of r.names) console.log("      - " + n);
}
console.log("-".repeat(78));
console.log(
  "TOTAL".padEnd(18) +
    String(totals.total).padStart(5) +
    String(totals.acceptance_rate).padStart(12) +
    String(totals.rank_proxy).padStart(13) +
    String(totals.eligible_for_ai).padStart(27)
);
