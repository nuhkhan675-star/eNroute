// Populates universities.acronym so short-form searches ("nus", "ntu", "mit",
// "bits") match. Deterministic and re-runnable -- no AI, no external calls.
//
// The acronym is the initials of each significant word, which covers the vast
// majority of cases (National University of Singapore -> NUS). A small
// override map handles the well-known names whose common short form ISN'T the
// initials -- "The University of Hong Kong" is universally HKU, never TUOHK.
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY_RUN = process.argv.includes("--dry-run");

// Words that never contribute a letter to a spoken acronym.
const STOP = new Set(["of", "the", "and", "for", "in", "at", "de", "a", "an", "&"]);

const OVERRIDES = new Map(Object.entries({
  "the university of hong kong": "HKU",
  "the hong kong university of science and technology": "HKUST",
  "the chinese university of hong kong": "CUHK",
  "the hong kong polytechnic university": "PolyU",
  "city university of hong kong": "CityU",
  "university college london": "UCL",
  "london school of economics and political science": "LSE",
  "california institute of technology": "Caltech",
  "birla institute of technology and science, pilani": "BITS",
  "o. p. jindal global university": "JGU",
  "flame university": "FLAME",
}));

function computeAcronym(name) {
  const words = name
    .replace(/[.,()]/g, " ")
    .split(/[\s\-\/]+/)
    .filter(Boolean)
    .filter((w) => !STOP.has(w.toLowerCase()));
  const letters = words.map((w) => w[0]).filter((c) => /[A-Za-z]/.test(c));
  if (letters.length < 2) return null;
  return letters.join("").toUpperCase().slice(0, 12);
}

const PAGE = 1000;
const rows = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await sb.from("universities").select("id, name, acronym").order("id").range(from, from + PAGE - 1);
  if (error) throw error;
  rows.push(...(data ?? []));
  if (!data || data.length < PAGE) break;
}
console.log(`scanned ${rows.length} universities`);

const updates = [];
for (const u of rows) {
  const acronym = OVERRIDES.get(u.name.trim().toLowerCase()) ?? computeAcronym(u.name);
  if (acronym && acronym !== u.acronym) updates.push({ id: u.id, acronym });
}
console.log(`${DRY_RUN ? "[DRY RUN] would update" : "updating"} ${updates.length}`);
for (const s of ["National University of Singapore", "Nanyang Technological University", "Massachusetts Institute of Technology", "The University of Hong Kong", "Birla Institute of Technology and Science, Pilani", "Flame University"]) {
  const u = rows.find((r) => r.name === s);
  if (u) console.log(`  ${s.padEnd(52)} -> ${OVERRIDES.get(s.toLowerCase()) ?? computeAcronym(s)}`);
}

if (!DRY_RUN) {
  for (let i = 0; i < updates.length; i += 500) {
    const chunk = updates.slice(i, i + 500);
    await Promise.all(chunk.map((u) => sb.from("universities").update({ acronym: u.acronym }).eq("id", u.id)));
    process.stdout.write(`\r  ${Math.min(i + 500, updates.length)}/${updates.length}`);
  }
  console.log("\ndone");
}
