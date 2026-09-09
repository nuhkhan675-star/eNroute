// Looks at every stored university photo and clears the ones that aren't of a
// campus.
//
// The scraper takes whatever a university's homepage leads with, and
// universities lead with news: press conferences, graduation hugs, a man
// holding a microphone, promo graphics with text baked in. URL patterns cannot
// catch this -- scoring all 1,454 against news/people keywords flagged one of
// eleven known-bad examples, because the filenames are innocent. The only
// signal is the image itself.
//
// A graduation-cap placeholder reads as deliberate. A stranger's face on a
// university card reads as broken, so when in doubt this clears.
import fs from "node:fs";

fs.readFileSync(".env.local", "utf8").split(/\r?\n/).forEach((l) => {
  const m = l.match(/^([A-Z_a-z0-9]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
});
const U = process.env.NEXT_PUBLIC_SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: K, Authorization: "Bearer " + K, "Content-Type": "application/json" };
const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0);

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";

const BATCH = 6;
const CONCURRENCY = 3;

const PROMPT = `You are checking photos used on university cards in a student admissions app.

For each image, answer KEEP or DROP.

KEEP only if the image is primarily of a university's physical campus: buildings,
architecture, grounds, quads, libraries, an aerial or exterior view, a campus
landmark or entrance sign. People may appear incidentally at a distance.

DROP if the image is primarily any of these:
- people (portraits, headshots, groups, students posing, graduation, hugs, handshakes)
- an event, press conference, panel, ceremony, sports match or performance
- a promotional graphic, poster or banner with large text or a logo
- a screenshot, chart, abstract pattern, or stock imagery not of that campus
- an indoor room with no architectural character
- anything too dark, blurry or cropped to read as a campus photo

When unsure, answer DROP.

Reply with one line per image, in order, formatted exactly:
1: KEEP
2: DROP
...`;

async function fetchImage(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; eNrouteBot/1.0; +https://enroute.app)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") || "").split(";")[0];
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    // Gemini caps inline request payloads; a single oversized hero would fail
    // the whole batch, so skip it rather than lose five good verdicts with it.
    if (buf.length > 3_500_000) return null;
    return { mime: type, b64: buf.toString("base64") };
  } catch {
    return null;
  }
}

function parseVerdicts(text, expected) {
  const verdicts = new Array(expected).fill(null);
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s*[:.)-]\s*(KEEP|DROP)/i);
    if (!m) continue;
    const idx = Number(m[1]) - 1;
    if (idx >= 0 && idx < expected) verdicts[idx] = m[2].toUpperCase();
  }
  return verdicts;
}

async function classifyGemini(images) {
  const parts = [{ text: PROMPT }];
  images.forEach((img, i) => {
    parts.push({ text: `Image ${i + 1}:` });
    parts.push({ inline_data: { mime_type: img.mime, data: img.b64 } });
  });
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0 } }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  if (!r.ok) throw new Error("gemini " + r.status + " " + (await r.text()).slice(0, 160));
  const j = await r.json();
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("\n");
  return parseVerdicts(text, images.length);
}

async function classifyOpenAI(images) {
  const content = [{ type: "text", text: PROMPT }];
  images.forEach((img, i) => {
    content.push({ type: "text", text: `Image ${i + 1}:` });
    content.push({ type: "image_url", image_url: { url: `data:${img.mime};base64,${img.b64}` } });
  });
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + OPENAI_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ model: OPENAI_MODEL, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error("openai " + r.status + " " + (await r.text()).slice(0, 160));
  const j = await r.json();
  return parseVerdicts(j.choices?.[0]?.message?.content ?? "", images.length);
}

let geminiDead = false;
async function classify(images) {
  if (GEMINI_KEY && !geminiDead) {
    try {
      return await classifyGemini(images);
    } catch (err) {
      console.log("   gemini failed (" + String(err.message).slice(0, 90) + ")");
      // A 429 or a dead model won't fix itself mid-run; stop trying it and
      // spend the rest of the run on OpenAI rather than doubling every call.
      if (/429|quota|404|not found|RESOURCE_EXHAUSTED/i.test(String(err.message))) {
        console.log("   -> switching to OpenAI for the rest of the run");
        geminiDead = true;
      }
    }
  }
  if (!OPENAI_KEY) throw new Error("no usable AI provider");
  return classifyOpenAI(images);
}

async function getAll(path) {
  const out = [];
  for (let o = 0; ; o += 1000) {
    const r = await fetch(U + "/rest/v1/" + path + "&limit=1000&offset=" + o, { headers: H });
    const page = await r.json();
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

let unis = (await getAll("universities?select=id,name,photo_url&order=name")).filter((u) => u.photo_url);
if (LIMIT) unis = unis.slice(0, LIMIT);
console.log(`vetting ${unis.length} photos, ${BATCH} per call\n`);

const batches = [];
for (let i = 0; i < unis.length; i += BATCH) batches.push(unis.slice(i, i + BATCH));

let kept = 0;
let dropped = 0;
let unreadable = 0;
let done = 0;
const droppedNames = [];

let cursor = 0;
async function worker() {
  for (;;) {
    const batch = batches[cursor++];
    if (!batch) return;

    const fetched = await Promise.all(batch.map((u) => fetchImage(u.photo_url)));
    const usable = batch.map((u, i) => ({ uni: u, img: fetched[i] })).filter((x) => x.img);

    // An image we can't even download is already broken for students.
    for (const { uni } of batch.map((u, i) => ({ uni: u, img: fetched[i] })).filter((x) => !x.img)) {
      unreadable++;
      droppedNames.push(uni.name + "  (unreadable)");
      if (APPLY) await clearPhoto(uni.id);
    }
    if (usable.length === 0) {
      done += batch.length;
      continue;
    }

    let verdicts;
    try {
      verdicts = await classify(usable.map((x) => x.img));
    } catch (err) {
      console.log("   batch failed, leaving as-is: " + String(err.message).slice(0, 100));
      done += batch.length;
      continue;
    }

    for (let i = 0; i < usable.length; i++) {
      const { uni } = usable[i];
      if (verdicts[i] === "KEEP") {
        kept++;
      } else {
        dropped++;
        droppedNames.push(uni.name + (verdicts[i] ? "" : "  (no verdict)"));
        if (APPLY) await clearPhoto(uni.id);
      }
    }
    done += batch.length;
    if (done % 60 < BATCH) console.log(`... ${done}/${unis.length}  kept ${kept}, dropped ${dropped}`);
  }
}

async function clearPhoto(id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(U + "/rest/v1/universities?id=eq." + id, {
        method: "PATCH",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({
          photo_url: null,
          photo_source_type: null,
          photo_source_url: null,
          photo_attribution: null,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (r.ok) return;
    } catch {
      /* retried */
    }
    await new Promise((s) => setTimeout(s, 1000 * (attempt + 1)));
  }
  console.log("   WRITE FAILED for " + id);
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\n=== kept ${kept}, dropped ${dropped}, unreadable ${unreadable}, of ${unis.length} ===`);
console.log("\ndropped (first 40):");
droppedNames.slice(0, 40).forEach((n) => console.log("  " + n));
if (!APPLY) console.log("\nDRY RUN. re-run with --apply to clear the dropped ones.");
