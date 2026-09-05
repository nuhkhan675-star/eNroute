import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// A `universities.website` value can itself be wrong (e.g. a stale/parked
// domain that isn't actually the university's site -- caught this for
// Allahabad University, which had "alldunivpio.org" instead of the real
// allduniv.ac.in). If that happens, the official-website photo backfill
// would confidently attach a completely unrelated site's photo and label it
// "official" -- worse than the Wikimedia mismatches, since it's silent.
// This re-fetches each official_website-sourced page's <title> and requires
// it to plausibly reference the university's own name before keeping the
// photo; otherwise it's cleared rather than left possibly-wrong.
const STOPWORDS = new Set([
  "university", "college", "institute", "institution", "school", "of", "the", "and", "for", "at", "in",
]);

function significantWords(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

async function fetchTitle(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; eNroute-admissions-app/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, website, photo_source_url")
    .eq("photo_source_type", "official_website");
  if (error) throw error;
  console.log(`Validating ${data.length} official-website-sourced photos.`);

  let kept = 0;
  let cleared = 0;
  for (const u of data) {
    const words = significantWords(u.name);
    if (words.length === 0) {
      kept++;
      continue;
    }
    const title = await fetchTitle(u.photo_source_url ?? u.website);
    const matches = title && words.some((w) => title.includes(w));
    if (!matches) {
      await supabase
        .from("universities")
        .update({
          photo_url: null,
          photo_attribution: null,
          photo_source_type: null,
          photo_source_url: null,
          photo_last_verified_at: null,
        })
        .eq("id", u.id);
      console.log(`Cleared (title mismatch): ${u.name} -- page title: ${title ?? "(unreachable)"}`);
      cleared++;
    } else {
      kept++;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  console.log(`Done. Kept ${kept}, cleared ${cleared}.`);
}

main();
