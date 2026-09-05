// Read-only audit: per-country university coverage and what basis each
// university's selectivity would resolve to (real rate / rank proxy /
// unknown). No writes -- safe to run against production at any time.
//
// Usage: node scripts/audit-country.mjs [Singapore] ["Hong Kong"] ...
//        node scripts/audit-country.mjs --list=Singapore   (name each university)
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const argv = process.argv.slice(2);
const listFor = argv.find((a) => a.startsWith("--list="))?.split("=")[1] ?? null;
const wanted = argv.filter((a) => !a.startsWith("--"));

const { data: countries, error: cErr } = await supabase.from("countries").select("id, name").order("name");
if (cErr) throw cErr;

const targets = countries.filter((c) => wanted.length === 0 || wanted.includes(c.name));

console.log("country            total   real-rate   rank-proxy   unknown");
console.log("-".repeat(64));

for (const country of targets) {
  const { data: unis, error } = await supabase
    .from("universities")
    .select(
      "id, name, university_admission_statistics(acceptance_rate, year), university_rankings(ranking_org, ranking_type, ranking_value, ranking_year)"
    )
    .eq("country_id", country.id)
    .order("name");
  if (error) throw error;

  let real = 0, proxy = 0, unknown = 0;
  const rows = [];
  for (const u of unis) {
    const rate = (u.university_admission_statistics ?? []).find((s) => s.acceptance_rate != null) ?? null;
    // Any overall/global ranking is enough to drive the rank_proxy path;
    // subject rankings are not a selectivity signal for the school itself.
    const rank =
      (u.university_rankings ?? [])
        .filter((r) => r.ranking_type !== "subject")
        .sort((a, b) => b.ranking_year - a.ranking_year)[0] ?? null;

    let basis;
    if (rate) { basis = "acceptance_rate"; real++; }
    else if (rank) { basis = "rank_proxy"; proxy++; }
    else { basis = "unknown"; unknown++; }
    rows.push({ name: u.name, basis, rate: rate?.acceptance_rate ?? null, rank });
  }

  console.log(
    country.name.padEnd(18) +
      String(unis.length).padStart(5) +
      String(real).padStart(12) +
      String(proxy).padStart(13) +
      String(unknown).padStart(10)
  );

  if (listFor && country.name === listFor) {
    for (const r of rows) {
      const detail = r.rate != null
        ? `rate=${r.rate}`
        : r.rank
          ? `${r.rank.ranking_org} ${r.rank.ranking_type} #${r.rank.ranking_value} (${r.rank.ranking_year})`
          : "";
      console.log("    " + r.name.padEnd(50) + r.basis.padEnd(18) + detail);
    }
  }
}
