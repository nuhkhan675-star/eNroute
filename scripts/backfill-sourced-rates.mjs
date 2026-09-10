// Finds REAL, citable acceptance rates for universities that currently have
// neither a published rate nor a ranking, and stores them with their source.
//
// Runs the EXACT code the app runs -- imports findSourcedAcceptanceRateWith
// from lib/ai/sourcedRateCore.ts rather than reimplementing it, so the
// citation cross-check can never drift between the two paths.
//
// Ordering is oldest-first by created_at, which puts the originally curated
// catalogue (NUS, NTU, the IITs, the UK Russell Group) ahead of the long tail
// imported in bulk from ROR. Those are the schools students actually search
// for, so a partial run still buys most of the value.
//
// Resumable and safe to re-run: anything that already has a rate is skipped,
// so an interrupted run simply continues where it stopped.
//
// Usage:
//   node --experimental-strip-types scripts/backfill-sourced-rates.mjs --limit=25
//   node --experimental-strip-types scripts/backfill-sourced-rates.mjs --limit=25 --dry-run
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { findSourcedAcceptanceRateWith, isFatalApiError } from "../lib/ai/sourcedRateCore.ts";
dotenv.config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";

const args = process.argv.slice(2);
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 25);
const DRY_RUN = args.includes("--dry-run");
const COUNTRY = args.find((a) => a.startsWith("--country="))?.split("=")[1] ?? null;

const { data: countries } = await sb.from("countries").select("id, name");
const nameOf = (id) => countries.find((c) => c.id === id)?.name ?? "";

// Page past PostgREST's 1000-row cap -- an unbounded select would silently
// truncate and skew which universities ever get looked at.
const rows = [];
for (let from = 0; ; from += 1000) {
  let q = sb
    .from("universities")
    .select("id, name, country_id, created_at, university_admission_statistics(acceptance_rate), university_rankings(ranking_value, ranking_type)")
    .order("created_at", { ascending: true })
    .range(from, from + 999);
  const { data, error } = await q;
  if (error) throw error;
  rows.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}

// By default a university with a world ranking is left alone, on the grounds
// that the rank proxy will place it. That assumption is now known to be bad:
// rankings measure research, not selectivity, so Edinburgh (rank ~30, 53%
// offer rate) and York (~75%) were both treated as far more selective than
// they are. --include-ranked reaches those universities too, and they are
// usually the well-known ones a student actually looks up.
const INCLUDE_RANKED = args.includes("--include-ranked");

const candidates = rows.filter((u) => {
  const hasRate = (u.university_admission_statistics ?? []).some((s) => s.acceptance_rate != null);
  const hasRank = (u.university_rankings ?? []).some((r) => r.ranking_type === "global" && r.ranking_value != null);
  if (hasRate) return false;
  if (hasRank && !INCLUDE_RANKED) return false;
  if (COUNTRY && nameOf(u.country_id) !== COUNTRY) return false;
  return true;
});

console.log(`${candidates.length} universities have neither a rate nor a ranking`);
console.log(`processing ${Math.min(LIMIT, candidates.length)} this run (oldest first)\n`);

let found = 0, declined = 0, failed = 0;
const batch = candidates.slice(0, LIMIT);

for (const [i, uni] of batch.entries()) {
  const country = nameOf(uni.country_id);
  const label = `[${String(i + 1).padStart(3)}/${batch.length}] ${uni.name.slice(0, 44).padEnd(44)} ${country.padEnd(16)}`;
  try {
    const sourced = await findSourcedAcceptanceRateWith(openai, MODEL, uni.name, country);
    if (!sourced) {
      declined++;
      console.log(label + "no citable figures");
      continue;
    }
    found++;
    console.log(label + `${sourced.acceptanceRate}% (${sourced.year})  <- ${sourced.sourceUrl.slice(0, 70)}`);
    if (!DRY_RUN) {
      const { data: existing } = await sb.from("data_sources").select("id").eq("url", sourced.sourceUrl).maybeSingle();
      let dataSourceId = existing?.id ?? null;
      if (!dataSourceId) {
        const { data: ins, error } = await sb.from("data_sources").insert({
          name: sourced.sourceTitle.slice(0, 200), url: sourced.sourceUrl,
          source_type: "other", reliability_tier: "medium",
        }).select("id").single();
        if (error) throw error;
        dataSourceId = ins.id;
      }
      const { error: statErr } = await sb.from("university_admission_statistics").upsert({
        university_id: uni.id, year: sourced.year, acceptance_rate: sourced.acceptanceRate,
        applicant_count: sourced.applicants, admitted_count: sourced.admitted,
        confidence: "moderate", data_source_id: dataSourceId,
        last_verified_at: new Date().toISOString(),
      }, { onConflict: "university_id,year" });
      if (statErr) throw statErr;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // An exhausted balance or rejected key will not fix itself by moving to
    // the next university. The previous version paused 60s and carried on,
    // so a run that lost its credits at university 18 spent hours logging
    // "no citable figures" for a thousand universities it never looked up.
    if (isFatalApiError(err)) {
      console.log(label + "FATAL " + msg.slice(0, 120));
      console.log("\nStopping: this is an account-level problem, not a data one.");
      console.log(`Saved ${found} rates before stopping. Nothing after this point was actually checked.`);
      break;
    }

    failed++;
    console.log(label + "ERROR " + msg.slice(0, 90));
    if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
      console.log("       rate limited -- pausing 60s");
      await new Promise((r) => setTimeout(r, 60000));
    }
  }
  // Space the calls out: each lookup is two requests and pulls a lot of search
  // context into the window.
  await new Promise((r) => setTimeout(r, 3000));
}

console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}found ${found}  |  no citable data ${declined}  |  errors ${failed}`);
console.log(`hit rate: ${batch.length ? Math.round((100 * found) / batch.length) : 0}%`);
console.log(`remaining unknown after this run: ${candidates.length - found}`);
