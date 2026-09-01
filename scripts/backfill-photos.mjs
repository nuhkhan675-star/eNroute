import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Crests/seals/logos are almost always SVG line art or have these words in
// the filename -- we want an actual campus photograph, not a coat of arms.
const EXCLUDE_NAME_RE = /seal|crest|logo|shield|coat.?of.?arms|flag|emblem|wordmark|monogram|insignia|sign\.jpg|garden|bird/i;
// Reject narrative/candid-photography titles (people, moments, events) even
// when they mention the campus -- we want a clean establishing shot of a
// building, not a photojournalism-style slice-of-life photo.
const EXCLUDE_CANDID_RE =
  /life at|moment|solitude|scene|walking|sitting|standing|protest|rally|ceremony|convocation|graduation|class of|celebrat|festival|event\b|portrait|selfie|group photo|students?\b|people\b|crowd|interview|speech|lecture|opening|visit|tour\b|meeting|concert|match\b|game\b|parade|workshop|seminar|conference|award|team\b|player|athlete|flood|snow|night\b|during\b/i;
const PHOTO_EXT_RE = /\.(jpe?g|png)$/i;
// Deliberately strict: a filename must clearly read as an architectural
// establishing shot -- exterior/facade/aerial/gate/tower/named-building --
// or we skip it entirely. Wrong (or merely off-tone) is worse than missing.
const PREFER_RE = /\b(campus|building|hall|library|tower|aerial|panorama|quad|gate|block|wing|facade|façade|exterior)\b/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Wikimedia's API throttles anonymous/generic traffic aggressively -- a
// proper contact-info User-Agent plus retry-with-backoff on 429/5xx is
// required or most requests silently fail after the first handful.
async function fetchJson(url, attempt = 1) {
  const res = await fetch(url, {
    headers: { "User-Agent": "eNroute-admissions-app/1.0 (https://enroute.example; contact: admin@enroute.example)" },
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 4) {
      console.error(`Giving up after ${attempt} attempts: ${res.status} ${url}`);
      return null;
    }
    await sleep(500 * attempt);
    return fetchJson(url, attempt + 1);
  }
  if (!res.ok) {
    console.error(`Non-retryable status ${res.status}: ${url}`);
    return null;
  }
  return res.json();
}

function pickBestFilename(filenames) {
  const candidates = filenames.filter(
    (f) => PHOTO_EXT_RE.test(f) && !EXCLUDE_NAME_RE.test(f) && !EXCLUDE_CANDID_RE.test(f) && PREFER_RE.test(f)
  );
  return candidates[0] ?? null;
}

async function getCommonsCategoryFilenames(title) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
    "Category:" + title
  )}&cmtype=file&cmlimit=50&format=json`;
  const json = await fetchJson(url);
  const members = json?.query?.categorymembers ?? [];
  return members.map((m) => m.title.replace(/^File:/, ""));
}

async function getWikipediaArticleImageFilenames(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    title
  )}&prop=images&imlimit=50&format=json&redirects=1`;
  const json = await fetchJson(url);
  const pages = json?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return [];
  return (page.images ?? []).map((i) => i.title.replace(/^File:/, ""));
}

async function resolveCommonsFileUrl(filename) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
    "File:" + filename
  )}&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json`;
  const json = await fetchJson(url);
  const pages = json?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  return info.thumburl ?? info.url ?? null;
}

async function getUniversityCampusPhoto(name) {
  let filenames = await getCommonsCategoryFilenames(name);
  let best = pickBestFilename(filenames);

  if (!best) {
    filenames = await getWikipediaArticleImageFilenames(name);
    best = pickBestFilename(filenames);
  }
  if (!best) return null;

  const fileUrl = await resolveCommonsFileUrl(best);
  if (!fileUrl) return null;
  return { url: fileUrl, filename: best };
}

async function fetchAllUniversities() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase.from("universities").select("id, name").range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  let universities = await fetchAllUniversities();
  if (process.env.LIMIT) universities = universities.slice(0, Number(process.env.LIMIT));
  console.log(`Re-checking ${universities.length} universities for real campus photos (not crests/logos).`);

  let updated = 0;
  let skipped = 0;
  for (const u of universities) {
    try {
      const result = await getUniversityCampusPhoto(u.name);
      if (!result) {
        // Explicitly clear any bad photo (crest, unrelated snapshot) from a
        // previous run rather than leaving it in place -- no photo beats a
        // wrong one.
        await supabase.from("universities").update({ photo_url: null, photo_attribution: null }).eq("id", u.id);
        skipped++;
        continue;
      }
      const { error } = await supabase
        .from("universities")
        .update({ photo_url: result.url, photo_attribution: `Wikimedia Commons: ${result.filename}` })
        .eq("id", u.id);
      if (error) {
        console.error(`Failed to update ${u.name}:`, error.message);
        skipped++;
        continue;
      }
      updated++;
      if (updated % 25 === 0) console.log(`...${updated} updated so far`);
    } catch (err) {
      console.error(`Error for ${u.name}:`, err.message);
      skipped++;
    }
    await sleep(120); // be polite to the Wikimedia API
  }
  console.log(`Done. Updated ${updated}, skipped ${skipped} (no verifiable campus photo found).`);
}

main();
