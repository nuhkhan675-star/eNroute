import "server-only";
import OpenAI from "openai";
import { OPENAI_MODEL } from "@/lib/ai/client";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface SourcedRate {
  applicants: number | null;
  admitted: number | null;
  /** 0-100, either published directly or computed from admitted/applicants. */
  acceptanceRate: number;
  year: number;
  sourceUrl: string;
  sourceTitle: string;
}

const SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    applicants: { type: ["integer", "null"] },
    admitted: { type: ["integer", "null"] },
    acceptance_rate: { type: ["number", "null"] },
    academic_year: { type: ["integer", "null"] },
    source_url: { type: ["string", "null"] },
    source_title: { type: ["string", "null"] },
    notes: { type: "string" },
  },
  required: [
    "found", "applicants", "admitted", "acceptance_rate",
    "academic_year", "source_url", "source_title", "notes",
  ],
  additionalProperties: false,
} as const;

const SEARCH_INSTRUCTIONS = [
  "You research university admissions statistics from primary sources.",
  "",
  "Find, for the named university, real PUBLISHED undergraduate admissions numbers: how many people",
  "applied and how many were admitted or offered a place, for one specific recent year. Prefer the",
  "university own admissions or transparency pages, an official statutory publication, or the",
  "national admissions service.",
  "",
  "Rules that matter more than finding an answer:",
  "- Report only figures you actually saw on a page you opened, and say which page each came from.",
  "- An enrolment or intake count is NOT an admit count. Enrolled students with no applicant total",
  "  is not an acceptance rate.",
  "- If you cannot find both sides of the ratio, say so plainly. Finding nothing is an acceptable",
  "  and expected outcome; inventing a figure is not.",
].join("\n");

const EXTRACT_INSTRUCTIONS = [
  "Extract admissions figures ONLY from the research notes provided. Never add anything from your",
  "own knowledge. source_url must be copied verbatim from the list of pages that were actually",
  "fetched.",
  "",
  "Reject consultancy sites, ranking aggregators and crowd-sourced encyclopedias as the source of",
  "record -- prefer the institution own site, an official statutory publication, or the national",
  "admissions service. If the notes do not contain both an applicant count and an admit count (or a",
  "directly published acceptance rate) from an acceptable page, set found=false.",
].join("\n");

interface Annotation { type: string; url?: string }
interface ContentPart { type: string; text?: string; annotations?: Annotation[] }
interface OutputItem { type: string; content?: ContentPart[] }

interface ParsedRate {
  found?: boolean;
  applicants?: number | null;
  admitted?: number | null;
  acceptance_rate?: number | null;
  academic_year?: number | null;
  source_url?: string | null;
  source_title?: string | null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Per-university web lookup for a REAL, citable acceptance rate.
 *
 * Runs only for universities holding neither a published rate nor a ranking --
 * the ones that would otherwise fall back to an AI estimate. A hit here is
 * genuinely sourced and is stored as such, with its URL and year, exactly like
 * every other real figure in the app.
 *
 * TWO CALLS, deliberately. Combining web_search with a strict json_schema
 * response format silently suppresses the search: verified during development
 * that the identical prompt runs four searches and returns citations with
 * plain-text output, yet fetches ZERO pages the moment a strict schema is
 * attached -- while the model still cheerfully invents a plausible source URL.
 * So we search in plain text, then extract from that text with no tools.
 *
 * The citation cross-check is the load-bearing safeguard. A source_url in JSON
 * is just a string and can be fabricated; the url_citation annotations are the
 * pages the tool actually fetched. Only a claim backed by those is accepted --
 * otherwise we would be writing selectivity_basis = "acceptance_rate" on the
 * strength of a page nobody ever opened.
 */
export async function findSourcedAcceptanceRate(
  universityName: string,
  countryName: string
): Promise<SourcedRate | null> {
  if (!openai) return null;

  // ---- step 1: grounded search, plain text ----
  let searchText = "";
  const citations: string[] = [];
  try {
    const search = await openai.responses.create({
      model: OPENAI_MODEL,
      instructions: SEARCH_INSTRUCTIONS,
      input:
        "University: " + universityName + "\nCountry: " + countryName + "\n\n" +
        "Search for its published undergraduate applicant and admitted counts for a recent year. " +
        "Quote the figures and state exactly which page each came from.",
      tools: [{ type: "web_search" }],
    });
    for (const item of (search.output ?? []) as unknown as OutputItem[]) {
      for (const part of item.content ?? []) {
        if (part.type === "output_text" && part.text) searchText += part.text + "\n";
        for (const ann of part.annotations ?? []) {
          if (ann.type === "url_citation" && typeof ann.url === "string") citations.push(ann.url);
        }
      }
    }
  } catch (err) {
    // A rate limit or transient failure must never be read as "no data
    // exists" -- we fall through to the estimate path and can retry later.
    console.error("[sourced-rate] search failed for " + universityName, err instanceof Error ? err.message : err);
    return null;
  }

  // Nothing fetched means nothing to extract from; any number produced now
  // would come from memory rather than a source.
  if (citations.length === 0 || searchText.trim().length === 0) return null;

  // ---- step 2: structured extraction, no tools ----
  let parsed: ParsedRate;
  try {
    const extract = await openai.responses.create({
      model: OPENAI_MODEL,
      instructions: EXTRACT_INSTRUCTIONS,
      input:
        "University: " + universityName + " (" + countryName + ")\n\n" +
        "Pages actually fetched:\n" + citations.map((c) => "- " + c).join("\n") + "\n\n" +
        "Research notes:\n" + searchText.slice(0, 12000),
      text: { format: { type: "json_schema", name: "sourced_rate", schema: SCHEMA, strict: true } },
    });
    if (!extract.output_text) return null;
    parsed = JSON.parse(extract.output_text) as ParsedRate;
  } catch (err) {
    console.error("[sourced-rate] extraction failed for " + universityName, err instanceof Error ? err.message : err);
    return null;
  }

  if (!parsed?.found || !parsed.source_url) return null;

  const claimedHost = hostOf(parsed.source_url);
  if (!claimedHost || !citations.some((c) => hostOf(c) === claimedHost)) {
    console.warn(
      "[sourced-rate] rejected " + universityName + ": claimed " + parsed.source_url +
        ", not among " + citations.length + " fetched pages"
    );
    return null;
  }

  // Prefer computing from the two counts; fall back to a published rate.
  let rate: number | null = null;
  if (typeof parsed.applicants === "number" && typeof parsed.admitted === "number" && parsed.applicants > 0) {
    // More admits than applicants means we misread the page.
    if (parsed.admitted > parsed.applicants) return null;
    rate = (parsed.admitted / parsed.applicants) * 100;
  } else if (typeof parsed.acceptance_rate === "number") {
    rate = parsed.acceptance_rate;
  }
  if (rate == null || !Number.isFinite(rate) || rate <= 0 || rate > 100) return null;

  const year =
    typeof parsed.academic_year === "number" && Number.isInteger(parsed.academic_year)
      ? parsed.academic_year
      : new Date().getFullYear();

  return {
    applicants: typeof parsed.applicants === "number" ? parsed.applicants : null,
    admitted: typeof parsed.admitted === "number" ? parsed.admitted : null,
    acceptanceRate: Math.round(rate * 10) / 10,
    year,
    sourceUrl: parsed.source_url,
    sourceTitle: parsed.source_title || claimedHost,
  };
}
