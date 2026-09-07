// Tags Hong Kong universities with program_categories, derived from the UGC
// published programme list (data.gov.hk / CSDI, T&C v1.2).
//
// Deterministic keyword rules only -- no AI. A formula decides what a formula
// can decide, and the mapping stays auditable and reproducible.
import fs from "node:fs";

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
});
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");

const FEED =
  "https://portal.csdi.gov.hk/server/rest/services/common/ugc_rcd_1665536012918_39544/FeatureServer/0/query" +
  "?where=1%3D1&outFields=University_EN,Programme_Name_EN,Level_of_Study_EN&f=json&resultRecordCount=2000";

// category name -> regex. Every rule is tested against every programme and all
// hits count, so "BBA in Accounting" tags both Accounting and Business
// Administration. The bare "Engineering" catch-all sits last for readability.
const RULES = [
  ["Actuarial Science", /actuarial/i],
  ["Accounting", /accounting|accountancy/i],
  ["Aerospace Engineering", /aerospace|aeronautic/i],
  ["Animation", /animation/i],
  ["Anthropology", /anthropolog/i],
  ["Architecture", /architect|surveying/i],
  ["Artificial Intelligence", /artificial intelligence/i],
  ["Banking", /banking/i],
  ["Biomedical Engineering", /biomedical engineering|bioengineering/i],
  ["Biomedical Sciences", /biomedical science/i],
  ["Biotechnology", /biotechnolog/i],
  ["Biology", /biolog/i],
  ["Business Analytics", /business analytics|business intelligence/i],
  ["Business Administration", /business administration|\bbusiness\b/i],
  ["Chemical Engineering", /chemical engineering|chemical technology/i],
  ["Chemistry", /chemistry|chemical science/i],
  ["Civil Engineering", /civil engineering|structural engineering/i],
  ["Communications", /communication|creative media|new media|digital media/i],
  ["Computer Engineering", /computer engineering/i],
  ["Computer Science", /computer science|computing|computer studies/i],
  ["Corporate Law", /corporate law|commercial law/i],
  ["Cybersecurity", /cyber ?security|information security/i],
  ["Data Science", /data scien|big data|data analytics/i],
  ["Dentistry", /dental|dentistry/i],
  ["Economics", /economic/i],
  ["Electrical Engineering", /electrical engineering|electronic engineering|electronics/i],
  ["Environmental Engineering", /environmental engineering/i],
  ["Environmental Science", /environmental science|environmental stud|ecolog|sustainab/i],
  ["Entrepreneurship", /entrepreneur/i],
  ["English", /\benglish\b/i],
  ["Fashion Design", /fashion/i],
  ["Film", /\bfilm\b|cinema|television|broadcast/i],
  ["Finance", /\bfinance\b|financial/i],
  ["Fine Arts", /fine art|visual art/i],
  ["Graphic Design", /graphic design|visual communication/i],
  ["History", /histor/i],
  ["Hospitality Management", /hospitality|hotel management/i],
  ["Human Resources", /human resource/i],
  ["Industrial Design", /industrial design|product design/i],
  ["Industrial Engineering", /industrial engineering|systems engineering|manufacturing engineering/i],
  ["Information Systems", /information systems|management information/i],
  ["Information Technology", /information technology/i],
  ["International Business", /international business/i],
  ["International Law", /international law/i],
  ["International Relations", /international relations|international affairs|global studies/i],
  ["International Trade", /international trade/i],
  ["Journalism", /journalism/i],
  ["Languages", /linguistic|translation|\bchinese\b|\bjapanese\b|\bfrench\b|\bgerman\b|\bkorean\b|language stud/i],
  ["Law", /\blaws?\b|juris doctor|\bll\.?b\b|\bll\.?m\b/i],
  ["Literature", /literature|literary/i],
  ["Management", /\bmanagement\b/i],
  ["Marketing", /marketing/i],
  ["Mathematics", /mathematic/i],
  ["Mechanical Engineering", /mechanical engineering|mechatronic/i],
  ["Medicine", /\bmedicine\b|\bmedical\b|\bmbbs\b|surgery/i],
  ["Nursing", /nursing/i],
  ["Nutrition", /nutrition|dietetic|food science/i],
  ["Pharmacy", /pharmac/i],
  ["Philosophy", /philosoph/i],
  ["Physics", /\bphysics\b|physical science/i],
  ["Physiotherapy", /physiotherap|occupational therap|rehabilitation/i],
  ["Political Science", /political science|\bpolitics\b/i],
  ["Psychology", /psycholog/i],
  ["Public Health", /public health|community health|epidemiolog/i],
  ["Public Policy", /public policy|public administration|public affairs/i],
  ["Sociology", /sociolog|social work|social scien/i],
  ["Software Engineering", /software engineering/i],
  ["Supply Chain Management", /supply chain|logistics|operations management/i],
  ["Tourism Management", /tourism/i],
  ["Engineering", /engineering/i],
];

// UGC institution name -> catalogue name, only where the two differ.
const ALIAS = {
  "The Hong Kong Institute of Education": "The Education University of Hong Kong",
  "The Open University of Hong Kong": "Hong Kong Metropolitan University",
};

const norm = (s) => s.toLowerCase().replace(/^the /, "").replace(/[^a-z0-9]/g, "");

async function get(path) {
  const r = await fetch(U + "/rest/v1/" + path, { headers: H });
  if (!r.ok) throw new Error(path + " -> " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}

const feed = await (await fetch(FEED)).json();
const rows = (feed.features || []).map((f) => f.attributes);
console.log("UGC programmes fetched: " + rows.length);

const cats = await get("program_categories?select=id,name");
const catByName = new Map(cats.map((c) => [c.name, c.id]));

const unis = await get("universities?select=id,name,countries!inner(name)&countries.name=eq.Hong%20Kong");
const uniByNorm = new Map(unis.map((u) => [norm(u.name), u]));

const pairs = new Map();
const unmatchedUnis = new Set();
const unmatchedProgs = [];

for (const r of rows) {
  const rawUni = (r.University_EN || "").trim();
  const prog = (r.Programme_Name_EN || "").trim();
  if (!rawUni || !prog) continue;
  const uni = uniByNorm.get(norm(ALIAS[rawUni] ?? rawUni));
  if (!uni) {
    unmatchedUnis.add(rawUni);
    continue;
  }
  const hits = RULES.filter(([, re]) => re.test(prog)).map(([name]) => name);
  if (!hits.length) {
    unmatchedProgs.push(prog);
    continue;
  }
  for (const name of hits) {
    const categoryId = catByName.get(name);
    if (!categoryId) continue;
    const key = uni.id + "::" + categoryId;
    if (!pairs.has(key)) {
      pairs.set(key, { uni: uni.name, cat: name, universityId: uni.id, categoryId, examples: [] });
    }
    const e = pairs.get(key);
    if (e.examples.length < 2) e.examples.push(prog);
  }
}

console.log("programmes with no category match: " + unmatchedProgs.length);
if (unmatchedProgs.length) {
  console.log("  sample: " + unmatchedProgs.slice(0, 6).join(" | "));
}
if (unmatchedUnis.size) {
  console.log("\nUGC institutions not in catalogue (" + unmatchedUnis.size + "):");
  [...unmatchedUnis].sort().forEach((n) => console.log("  - " + n));
}

const existing = await get("university_specialities?select=university_id,category_id");
const have = new Set(existing.map((e) => e.university_id + "::" + e.category_id));
const toInsert = [...pairs.entries()].filter(([k]) => !have.has(k)).map(([, v]) => v);

const byUni = new Map();
for (const v of pairs.values()) {
  if (!byUni.has(v.uni)) byUni.set(v.uni, []);
  byUni.get(v.uni).push(v.cat);
}
console.log("\nfields derived per university:");
[...byUni.entries()].sort().forEach(([u, cs]) => console.log("  " + u + "  --  " + cs.length + " fields"));

console.log(
  "\ntotal pairs: " + pairs.size + " | already present: " + (pairs.size - toInsert.length) + " | new: " + toInsert.length,
);

if (!APPLY) {
  console.log("\nDRY RUN. sample of what would be written:");
  toInsert.slice(0, 10).forEach((v) => console.log('  ' + v.uni + " -> " + v.cat + '   e.g. "' + v.examples[0] + '"'));
  console.log("\nre-run with --apply to write.");
} else {
  for (let i = 0; i < toInsert.length; i += 200) {
    const chunk = toInsert.slice(i, i + 200).map((v) => ({ university_id: v.universityId, category_id: v.categoryId }));
    const r = await fetch(U + "/rest/v1/university_specialities", {
      method: "POST",
      headers: { ...H, Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!r.ok) throw new Error("insert failed: " + r.status + " " + (await r.text()).slice(0, 300));
  }
  console.log("\nWROTE " + toInsert.length + " speciality rows.");
}
