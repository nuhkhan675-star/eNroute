import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// The database has real duplicate university rows (same institution, two
// ids) -- e.g. "King's College London" and a second near-identical row with
// no website, or "Indian Institute of Technology Bombay" vs "...Technology,
// Bombay" with a comma. Left alone, this both inflates per-country counts
// and would waste real research effort adding a program to one twin while
// the other keeps showing "no programs recorded."
const norm = (n) => n.toLowerCase().replace(/[,.']/g, "").replace(/\s+/g, " ").trim();

const CHILD_TABLES = [
  { table: "university_programs", col: "university_id" },
  { table: "university_rankings", col: "university_id" },
  { table: "scholarships", col: "university_id" },
];

async function main() {
  const { data: unis, error } = await supabase
    .from("universities")
    .select("id, name, website, photo_url, description, country_id, created_at");
  if (error) throw error;

  const groups = new Map();
  for (const u of unis) {
    const key = norm(u.name) + "|" + u.country_id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  }
  const dupeGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(`Found ${dupeGroups.length} duplicate groups.`);

  let merged = 0;
  for (const group of dupeGroups) {
    // Prefer: has website > has photo > has description > older (more likely original import).
    const score = (u) => (u.website ? 4 : 0) + (u.photo_url ? 2 : 0) + (u.description ? 1 : 0);
    const sorted = [...group].sort((a, b) => score(b) - score(a) || new Date(a.created_at) - new Date(b.created_at));
    const keeper = sorted[0];
    const losers = sorted.slice(1);

    // Backfill any field the keeper is missing from a loser before deleting it.
    const patch = {};
    for (const loser of losers) {
      if (!keeper.website && loser.website) patch.website = loser.website;
      if (!keeper.photo_url && loser.photo_url) patch.photo_url = loser.photo_url;
      if (!keeper.description && loser.description) patch.description = loser.description;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("universities").update(patch).eq("id", keeper.id);
      Object.assign(keeper, patch);
    }

    for (const loser of losers) {
      // Re-point any child rows referencing the loser onto the keeper instead
      // of losing them.
      for (const { table, col } of CHILD_TABLES) {
        const { data: rows } = await supabase.from(table).select("id").eq(col, loser.id);
        if (rows && rows.length > 0) {
          await supabase.from(table).update({ [col]: keeper.id }).eq(col, loser.id);
          console.log(`  Re-pointed ${rows.length} row(s) in ${table} from ${loser.id} -> ${keeper.id}`);
        }
      }
      const { error: delErr } = await supabase.from("universities").delete().eq("id", loser.id);
      if (delErr) {
        console.error(`Failed to delete duplicate ${loser.id} (${loser.name}):`, delErr.message);
        continue;
      }
      merged++;
    }
    console.log(`Merged "${keeper.name}": kept ${keeper.id}, removed ${losers.map((l) => l.id).join(", ")}`);
  }
  console.log(`Done. Removed ${merged} duplicate university rows.`);
}

main();
