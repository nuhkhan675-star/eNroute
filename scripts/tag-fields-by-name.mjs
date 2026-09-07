// Tags universities whose NAME unambiguously states their field -- medical
// colleges, law universities, institutes of technology, design schools, and so
// on. This is the long tail that no bulk programme feed covers.
//
// Deliberately conservative: a rule only fires when the name leaves no real
// doubt. A generic "University of X" gets nothing, because guessing a field for
// a comprehensive university is worse than leaving it blank -- it would put the
// school in front of students it does not actually suit.
import fs from "node:fs";

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
});
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");

// [regex on the university name] -> categories to attach.
const RULES = [
  [/\bmedical\b|\bmedicine\b|\bmbbs\b|health sciences? (university|institute)/i,
    ["Medicine", "Biomedical Sciences", "Public Health"]],
  [/\bdental\b|dentistry/i, ["Dentistry", "Medicine"]],
  [/\bnursing\b/i, ["Nursing", "Public Health"]],
  [/\bpharmac/i, ["Pharmacy", "Chemistry"]],
  [/\bveterinary\b/i, ["Biology", "Biomedical Sciences"]],
  [/\blaw\b|\blaws\b|judicial academy|legal studies/i, ["Law", "Corporate Law", "International Law"]],
  [/institute of technolog|institutes? of technolog|\bpolytechnic\b|technological university|university of technolog/i,
    ["Engineering", "Computer Science", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering"]],
  [/\bengineering\b/i, ["Engineering", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering"]],
  [/institute of management|school of management|business school|school of business|management studies|management institute/i,
    ["Management", "Business Administration", "Finance", "Marketing"]],
  [/\bcommerce\b/i, ["Accounting", "Business Administration", "Economics"]],
  [/\barchitecture\b|school of planning/i, ["Architecture"]],
  [/\bagricultur|\bhorticultur/i, ["Environmental Science", "Biology"]],
  [/journalism|mass communication/i, ["Journalism", "Communications"]],
  [/\bfashion\b/i, ["Fashion Design"]],
  [/institute of design|school of design|\bdesign\b/i, ["Industrial Design", "Graphic Design"]],
  [/fine arts?|school of art\b|academy of art|\bmusic\b|performing arts/i, ["Fine Arts"]],
  [/\bfilm\b|cinema|film and television/i, ["Film"]],
  [/hotel management|hospitality/i, ["Hospitality Management", "Tourism Management"]],
  [/\btourism\b/i, ["Tourism Management"]],
  [/\bactuarial\b/i, ["Actuarial Science", "Mathematics", "Data Science"]],
  [/statistical institute|\bstatistics\b/i, ["Mathematics", "Data Science"]],
  [/\bmaritime\b|\bnautical\b/i, ["Supply Chain Management", "Engineering"]],
  [/\bsanskrit\b|language university|institute of languages|\blinguistic/i, ["Languages", "Literature"]],
  [/social sciences?|social work/i, ["Sociology", "Public Policy"]],
  [/\bmining\b|school of mines/i, ["Engineering", "Environmental Engineering"]],
  [/petroleum|\benergy studies\b/i, ["Chemical Engineering", "Engineering"]],
  [/information technology|\bIIIT\b/i, ["Information Technology", "Computer Science", "Software Engineering"]],
  [/\bscience(s)? (university|college|institute)|institute of science\b/i, ["Physics", "Chemistry", "Biology", "Mathematics"]],
  [/\beconomics\b/i, ["Economics"]],
  [/public health/i, ["Public Health"]],
  [/physiotherap|rehabilitation/i, ["Physiotherapy"]],
  [/\bpsycholog/i, ["Psychology"]],
];

async function get(path) {
  const r = await fetch(U + "/rest/v1/" + path, { headers: H });
  if (!r.ok) throw new Error(path + " -> " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}

// PostgREST silently caps unbounded selects at 1000 rows, so page explicitly.
async function getAll(path) {
  const out = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const r = await fetch(U + "/rest/v1/" + path + "&limit=" + size + "&offset=" + from, { headers: H });
    if (!r.ok) throw new Error(path + " -> " + r.status);
    const page = await r.json();
    out.push(...page);
    if (page.length < size) break;
  }
  return out;
}

const cats = await get("program_categories?select=id,name");
const catByName = new Map(cats.map((c) => [c.name, c.id]));
for (const [, names] of RULES) {
  for (const n of names) if (!catByName.has(n)) throw new Error("rule references unknown category: " + n);
}

const unis = await getAll("universities?select=id,name,countries(name)&order=name");
const existing = await getAll("university_specialities?select=university_id,category_id&order=university_id");
const have = new Set(existing.map((e) => e.university_id + "::" + e.category_id));
const taggedBefore = new Set(existing.map((e) => e.university_id));

console.log("universities: " + unis.length);
console.log("already have >=1 field: " + taggedBefore.size);

const toInsert = [];
const newlyTagged = new Set();
const byCountry = new Map();
const samples = [];

for (const u of unis) {
  const hits = new Set();
  for (const [re, names] of RULES) {
    if (re.test(u.name)) names.forEach((n) => hits.add(n));
  }
  if (!hits.size) continue;
  let addedForThis = 0;
  for (const name of hits) {
    const categoryId = catByName.get(name);
    const key = u.id + "::" + categoryId;
    if (have.has(key)) continue;
    have.add(key);
    toInsert.push({ university_id: u.id, category_id: categoryId });
    addedForThis++;
  }
  if (!taggedBefore.has(u.id)) {
    newlyTagged.add(u.id);
    const c = u.countries?.name ?? "unknown";
    byCountry.set(c, (byCountry.get(c) ?? 0) + 1);
    if (samples.length < 15) samples.push(u.name + "  ->  " + [...hits].join(", "));
  }
  void addedForThis;
}

console.log("\nuniversities newly gaining fields: " + newlyTagged.size);
console.log("new speciality rows: " + toInsert.length);
console.log("\nby country:");
[...byCountry.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log("  " + c + ": " + n));
console.log("\nsamples:");
samples.forEach((s) => console.log("  " + s));

const after = taggedBefore.size + newlyTagged.size;
console.log(
  "\ncoverage: " + taggedBefore.size + " -> " + after + " of " + unis.length +
  "  (" + Math.round((taggedBefore.size / unis.length) * 100) + "% -> " + Math.round((after / unis.length) * 100) + "%)",
);

if (!APPLY) {
  console.log("\nDRY RUN. re-run with --apply to write.");
} else {
  for (let i = 0; i < toInsert.length; i += 500) {
    const r = await fetch(U + "/rest/v1/university_specialities", {
      method: "POST",
      headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(toInsert.slice(i, i + 500)),
    });
    if (!r.ok) throw new Error("insert failed: " + r.status + " " + (await r.text()).slice(0, 300));
  }
  console.log("\nWROTE " + toInsert.length + " speciality rows.");
}
