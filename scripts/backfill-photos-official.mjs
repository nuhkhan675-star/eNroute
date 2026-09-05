import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// A university's own homepage almost always sets its social-share preview
// image (og:image) to a real, on-brand campus/building photo -- that's
// exactly what it's for. This is far more reliable than keyword-matching
// random Wikimedia Commons category members (which let through a public
// library bookshelf for "...Kowloon Public Library..." matching "library",
// and a car photographed at a gate for "...South Gate..." matching "gate").
const OG_IMAGE_RE = /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i;
const OG_IMAGE_RE_REV = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::secure_url)?["']/i;
const TWITTER_IMAGE_RE = /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i;
const TWITTER_IMAGE_RE_REV = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["']/i;

// Reject anything that reads as a logo/icon/favicon/placeholder rather than
// an actual photo -- same "wrong is worse than missing" bar as the Wikimedia
// pass, applied to the image URL itself.
const EXCLUDE_URL_RE = /logo|favicon|icon|placeholder|default[-_]?(image|share|og)|sprite|badge|crest|seal/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithTimeout(url, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; eNroute-admissions-app/1.0; +https://enroute.example; contact: admin@enroute.example)",
        Accept: "text/html",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function getOfficialSiteImage(websiteUrl) {
  let res;
  try {
    res = await fetchWithTimeout(websiteUrl);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return null;

  // Only read the head of the document -- og/twitter meta tags are always
  // in <head>, and this avoids downloading huge full pages.
  const reader = res.body?.getReader();
  let html = "";
  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    while (bytes < 200_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      bytes += value.length;
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
  } else {
    html = await res.text();
  }

  const match =
    html.match(OG_IMAGE_RE) ?? html.match(OG_IMAGE_RE_REV) ?? html.match(TWITTER_IMAGE_RE) ?? html.match(TWITTER_IMAGE_RE_REV);
  if (!match) return null;

  let imageUrl;
  try {
    imageUrl = new URL(match[1], res.url).toString();
  } catch {
    return null;
  }
  if (EXCLUDE_URL_RE.test(imageUrl)) return null;
  return imageUrl;
}

async function fetchAllUniversities() {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("universities")
      .select("id, name, website")
      .not("website", "is", null)
      .range(from, from + pageSize - 1);
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
  console.log(`Trying official-website photos for ${universities.length} universities.`);

  let updated = 0;
  let failed = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const u of universities) {
    try {
      const imageUrl = await getOfficialSiteImage(u.website);
      if (!imageUrl) {
        failed++;
        continue;
      }
      const { error } = await supabase
        .from("universities")
        .update({
          photo_url: imageUrl,
          photo_attribution: `Official website: ${new URL(u.website).hostname}`,
          photo_source_type: "official_website",
          photo_source_url: u.website,
          photo_last_verified_at: today,
        })
        .eq("id", u.id);
      if (error) {
        console.error(`DB update failed for ${u.name}:`, error.message);
        failed++;
        continue;
      }
      updated++;
      if (updated % 25 === 0) console.log(`...${updated} updated so far`);
    } catch (err) {
      console.error(`Error for ${u.name}:`, err instanceof Error ? err.message : err);
      failed++;
    }
    await sleep(150);
  }
  console.log(`Done. Official-website photo found for ${updated}, not found/usable for ${failed}.`);
}

main();
