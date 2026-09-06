// Re-scores every stored university_analysis row under the CURRENT country
// weighting profiles, without any AI calls.
//
// The six dimension scores on each row come from the model and are unaffected
// by the weights; only the composite built from them changes. So the whole
// catalogue can be brought onto new weights arithmetically -- imports
// recomputePrediction from the engine itself rather than reimplementing the
// math, so this can never drift from what the app computes live.
//
// Idempotent: running it twice produces the same values.
//
// Usage:
//   node --experimental-strip-types scripts/rescore-analyses.mjs --dry-run
//   node --experimental-strip-types scripts/rescore-analyses.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { recomputePrediction } from "../lib/ai/prediction/scoringEngine.ts";
dotenv.config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from("university_analysis")
    .select(
      "id, university_id, confidence, selectivity_basis, selectivity_level, selectivity_rate, " +
        "academic_score, program_fit_score, extracurricular_score, leadership_score, " +
        "achievement_score, requirements_fit_score, chance_min, chance_max, category, " +
        "universities(name, countries(name))"
    )
    .order("id")
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}
console.log(`${rows.length} stored analyses\n`);

let changed = 0, same = 0;
const byCountry = {};

for (const r of rows) {
  const country = r.universities?.countries?.name ?? null;
  const next = recomputePrediction(
    {
      academicScore: r.academic_score,
      programFitScore: r.program_fit_score,
      extracurricularScore: r.extracurricular_score,
      leadershipScore: r.leadership_score,
      achievementScore: r.achievement_score,
      requirementsFitScore: r.requirements_fit_score,
    },
    { tier: r.selectivity_level, basis: r.selectivity_basis, rate: r.selectivity_rate },
    r.confidence,
    country
  );

  const moved =
    next.chanceMin !== r.chance_min || next.chanceMax !== r.chance_max || next.category !== r.category;
  byCountry[country ?? "(none)"] ??= { total: 0, changed: 0 };
  byCountry[country ?? "(none)"].total++;

  if (!moved) { same++; continue; }
  changed++;
  byCountry[country ?? "(none)"].changed++;
  console.log(
    `  ${(r.universities?.name ?? "?").slice(0, 40).padEnd(40)} ${String(country).padEnd(15)}` +
      `${r.chance_min}-${r.chance_max}% ${r.category}  ->  ${next.chanceMin}-${next.chanceMax}% ${next.category}`
  );

  if (!DRY_RUN) {
    const { error } = await sb
      .from("university_analysis")
      .update({ chance_min: next.chanceMin, chance_max: next.chanceMax, category: next.category })
      .eq("id", r.id);
    if (error) throw error;
  }
}

console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}${changed} changed, ${same} unchanged`);
console.log("by country:");
for (const [c, v] of Object.entries(byCountry).sort((a, b) => b[1].changed - a[1].changed)) {
  console.log(`  ${c.padEnd(18)} ${String(v.changed).padStart(3)} of ${v.total} re-scored`);
}
