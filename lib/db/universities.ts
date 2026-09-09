import { createClient } from "@/lib/supabase/server";
import { getSelectivityTier, type SelectivityTier } from "@/lib/ai/prediction/selectivity";
import { getCountries, type Country } from "@/lib/db/reference";

export interface UniversitySearchResult {
  id: string;
  name: string;
  city: string | null;
  countryName: string;
  website: string | null;
  photoUrl: string | null;
}

const SEARCH_LIMIT = 25;

// Escape LIKE wildcards so a literal % or _ in the query can't turn into a
// pattern that matches everything.
function escapeLike(q: string): string {
  return q.replace(/[\%_]/g, (m) => "\\" + m);
}

/**
 * Name lookup for the typeahead. Prefix matches come FIRST, then
 * contains-matches, because that is what a student typing "f" expects -- a
 * list of universities whose names begin with F, not every university with an
 * "f" somewhere in the middle. Two queries rather than one because Postgres
 * can't express that ordering through the PostgREST filter syntax, and this
 * stays a plain indexed ilike either way -- no AI, no cost.
 */
export async function searchUniversities(query: string): Promise<UniversitySearchResult[]> {
  const supabase = await createClient();
  const term = escapeLike(query);
  const select =
    "id, name, city, website, photo_url, acronym, countries(name), university_admission_statistics(acceptance_rate), university_rankings(ranking_type)";

  // Pass 1: name prefix, plus ACRONYM prefix. Students type "nus" / "bits" /
  // "hku" far more than the full legal name, and no ilike on `name` can ever
  // match those -- the letters aren't contiguous in the string. The acronym
  // column (see migration 20260906000001) is what makes short forms findable.
  const { data: prefix, error: prefixError } = await supabase
    .from("universities").select(select)
    .or(`name.ilike.${term}%,acronym.ilike.${term}%`)
    .order("name").limit(SEARCH_LIMIT);
  if (prefixError) throw prefixError;

  const rows = [...(prefix ?? [])];
  // Only pay for the wider search when the prefix pass didn't fill the list.
  if (rows.length < SEARCH_LIMIT) {
    const { data: contains, error: containsError } = await supabase
      .from("universities").select(select).ilike("name", `%${term}%`).order("name").limit(SEARCH_LIMIT);
    if (containsError) throw containsError;
    const seen = new Set(rows.map((r: any) => r.id));
    for (const row of contains ?? []) {
      if (rows.length >= SEARCH_LIMIT) break;
      if (!seen.has((row as any).id)) rows.push(row);
    }
  }

  // Rank by how well each row actually matches, not alphabetically. Without
  // this, "hku" returned "The Hong Kong University of Science and Technology"
  // above "The University of Hong Kong" purely because H sorts before T --
  // the exact acronym hit has to win.
  const q = query.trim().toLowerCase();
  // A school we hold real selectivity data for is, in practice, one of the
  // well-known ones -- nothing else in the catalogue has a published rate or a
  // world ranking attached. That makes it a serviceable prominence signal, and
  // without it a bare string match ranks "Newcastle University Singapore"
  // above the actual NUS, and "Melbourne Institute of Technology" above MIT,
  // since both share the acronym and happen to have shorter names.
  const isProminent = (row: any) =>
    (row.university_admission_statistics ?? []).some((r: any) => r.acceptance_rate != null) ||
    (row.university_rankings ?? []).some((r: any) => r.ranking_type === "global");

  const score = (row: any) => {
    const name = String(row.name ?? "").toLowerCase();
    const acronym = String(row.acronym ?? "").toLowerCase();
    let base;
    if (acronym && acronym === q) base = 0;             // exact short form: NUS, HKU
    else if (name === q) base = 1;                      // exact full name
    else if (name.startsWith(q)) base = 2;              // "flor" -> Florida ...
    else if (acronym && acronym.startsWith(q)) base = 3; // "iit" -> IITB, IITD ...
    else base = 4;                                      // matched somewhere inside
    return base - (isProminent(row) ? 2.5 : 0);
  };
  rows.sort((a: any, b: any) => {
    const d = score(a) - score(b);
    if (d !== 0) return d;
    // Then the plain "University of X" ahead of "University of X, Satellite".
    const len = String(a.name).length - String(b.name).length;
    if (len !== 0) return len;
    return String(a.name).localeCompare(String(b.name));
  });

  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    website: row.website,
    photoUrl: row.photo_url,
    countryName: row.countries?.name ?? "",
  }));
}

export interface CountryWithCount extends Country {
  universityCount: number;
}

// Powers the /universities landing view: the 6 supported countries as
// selectable options, each showing how many universities are in our
// database for it.
export async function getCountriesWithUniversityCounts(): Promise<CountryWithCount[]> {
  const countries = await getCountries();
  const supabase = await createClient();
  const counts = await Promise.all(
    countries.map((c) => supabase.from("universities").select("id", { count: "exact", head: true }).eq("country_id", c.id))
  );
  return countries.map((c, i) => ({ ...c, universityCount: counts[i].count ?? 0 }));
}

// All universities in one country, for the per-country browse view. Capped
// well above our largest per-country dataset (~130) so it never silently
// truncates. `categoryId` is deterministic SQL filtering (never AI) for the
// "Country -> Degree" search the platform spec calls for -- only returns
// universities that actually have a university_programs row in that category.
export async function getUniversitiesByCountry(
  countryId: string,
  categoryId?: string
): Promise<UniversitySearchResult[]> {
  const supabase = await createClient();
  let query = supabase
    .from("universities")
    .select(
      categoryId
        ? "id, name, city, website, photo_url, countries(name), university_programs!inner(programs!inner(category_id))"
        : "id, name, city, website, photo_url, countries(name)"
    )
    .eq("country_id", countryId)
    .order("name")
    .limit(300);
  if (categoryId) {
    query = query.eq("university_programs.programs.category_id", categoryId);
  }
  const { data, error } = await query;
  if (error) throw error;

  const seen = new Set<string>();
  const results: UniversitySearchResult[] = [];
  for (const row of (data ?? []) as any[]) {
    if (seen.has(row.id)) continue; // an inner-join filter can duplicate a university with 2+ matching programs
    seen.add(row.id);
    results.push({
      id: row.id,
      name: row.name,
      city: row.city,
      website: row.website,
      photoUrl: row.photo_url,
      countryName: row.countries?.name ?? "",
    });
  }
  return results;
}

export interface UniversityCardExtras {
  ranking: { value: number; type: "national" | "global" | "subject"; org: string; year: number } | null;
  cheapestTuitionAmount: number | null;
  cheapestTuitionCurrency: string | null;
  hasScholarships: boolean;
}

const RANKING_TYPE_PRIORITY: Record<string, number> = { national: 0, global: 1, subject: 2 };

// Batched (not per-card) lookup of the deterministic facts a university
// grid card shows without a click: best available ranking, cheapest known
// tuition, and whether any scholarships are on record. Pure DB reads --
// never triggers AI analysis just from rendering a list of cards.
export async function getUniversityCardExtras(universityIds: string[]): Promise<Record<string, UniversityCardExtras>> {
  const result: Record<string, UniversityCardExtras> = {};
  for (const id of universityIds) {
    result[id] = { ranking: null, cheapestTuitionAmount: null, cheapestTuitionCurrency: null, hasScholarships: false };
  }
  if (universityIds.length === 0) return result;

  const supabase = await createClient();
  const [{ data: rankingRows }, { data: scholarshipRows }, { data: programRows }] = await Promise.all([
    supabase
      .from("university_rankings")
      .select("university_id, ranking_type, ranking_value, ranking_org, ranking_year")
      .in("university_id", universityIds),
    supabase.from("scholarships").select("university_id").in("university_id", universityIds),
    supabase.from("university_programs").select("id, university_id").in("university_id", universityIds),
  ]);

  for (const r of rankingRows ?? []) {
    const current = result[r.university_id];
    if (
      !current.ranking ||
      RANKING_TYPE_PRIORITY[r.ranking_type] < RANKING_TYPE_PRIORITY[current.ranking.type] ||
      (r.ranking_type === current.ranking.type && r.ranking_year > current.ranking.year)
    ) {
      current.ranking = { value: r.ranking_value, type: r.ranking_type as any, org: r.ranking_org, year: r.ranking_year };
    }
  }

  for (const s of scholarshipRows ?? []) {
    if (result[s.university_id]) result[s.university_id].hasScholarships = true;
  }

  const programIds = (programRows ?? []).map((p) => p.id);
  const programToUniversity = new Map((programRows ?? []).map((p) => [p.id, p.university_id]));
  if (programIds.length > 0) {
    const { data: tuitionRows } = await supabase
      .from("tuition")
      .select("university_program_id, international_amount, currency")
      .in("university_program_id", programIds)
      .not("international_amount", "is", null);
    for (const t of tuitionRows ?? []) {
      const universityId = programToUniversity.get(t.university_program_id);
      if (!universityId) continue;
      const current = result[universityId];
      if (current.cheapestTuitionAmount == null || (t.international_amount ?? Infinity) < current.cheapestTuitionAmount) {
        current.cheapestTuitionAmount = t.international_amount;
        current.cheapestTuitionCurrency = t.currency;
      }
    }
  }

  return result;
}

export interface RelevantUniversity {
  universityId: string;
  /** True if this university has a known program or speciality in the student's field of interest -- a sort/priority signal, never a gate on whether it's analyzable. */
  matchesFieldOfInterest: boolean;
  /** Real published acceptance rate, if one is on record. Used to spread the shortlist from safer to more selective. */
  acceptanceRate: number | null;
  /** Best global rank, so schools with no published rate can still be placed on the reach/likely spectrum. */
  globalRank: number | null;
  /** Whether a campus photo is on record. Cosmetic only -- a tie-breaker between otherwise equal candidates, never a filter. */
  hasPhoto: boolean;
}

/**
 * How many universities the dashboard/landing feed auto-analyzes for a
 * student. Capped deliberately: auto-scoring the entire catalog would be
 * hundreds of Gemini calls per student for results most never scroll to.
 * Anything outside the shortlist is still fully analyzable on demand via the
 * search panel or the university's own page.
 */
export const SHORTLIST_SIZE = 20;

// Every university in the student's target countries (or all 6 supported
// countries if none picked) is eligible for a chance estimate -- a missing
// program or speciality on record never blocks analysis. fieldOfInterestId
// only decides which ones get flagged for priority display/sorting.
export async function getRelevantUniversities(
  fieldOfInterestId: string | null,
  countryIds?: string[]
): Promise<RelevantUniversity[]> {
  const supabase = await createClient();
  let query = supabase.from("universities").select("id, country_id, photo_url");
  if (countryIds && countryIds.length > 0) {
    query = query.in("country_id", countryIds);
  }
  const { data: unis, error } = await query;
  if (error) throw error;
  const universityIds = (unis ?? []).map((u) => u.id);
  if (universityIds.length === 0) return [];

  const matchedIds = new Set<string>();
  if (fieldOfInterestId) {
    const [{ data: specialityRows }, { data: programRows }] = await Promise.all([
      supabase
        .from("university_specialities")
        .select("university_id")
        .in("university_id", universityIds)
        .eq("category_id", fieldOfInterestId),
      supabase
        .from("university_programs")
        .select("university_id, programs!inner(category_id)")
        .in("university_id", universityIds)
        .eq("programs.category_id", fieldOfInterestId),
    ]);
    for (const r of specialityRows ?? []) matchedIds.add(r.university_id);
    for (const r of (programRows ?? []) as any[]) matchedIds.add(r.university_id);
  }

  const { data: rateRows } = await supabase
    .from("university_admission_statistics")
    .select("university_id, acceptance_rate, year")
    .in("university_id", universityIds)
    .order("year", { ascending: false });

  const { data: rankRows } = await supabase
    .from("university_rankings")
    .select("university_id, ranking_value, ranking_year")
    .in("university_id", universityIds)
    .eq("ranking_type", "global")
    .order("ranking_year", { ascending: false });
  const rankById = new Map<string, number | null>();
  for (const r of rankRows ?? []) {
    if (!rankById.has(r.university_id)) rankById.set(r.university_id, r.ranking_value);
  }
  const rateById = new Map<string, number | null>();
  for (const r of rateRows ?? []) {
    if (!rateById.has(r.university_id)) rateById.set(r.university_id, r.acceptance_rate);
  }

  const photoById = new Map<string, boolean>((unis ?? []).map((u: any) => [u.id, Boolean(u.photo_url)]));

  return universityIds.map((id) => ({
    universityId: id,
    matchesFieldOfInterest: matchedIds.has(id),
    acceptanceRate: rateById.get(id) ?? null,
    globalRank: rankById.get(id) ?? null,
    hasPhoto: photoById.get(id) ?? false,
  }));
}

/**
 * The student's shortlist: ~20 universities SPANNING the full spectrum, from
 * Likely down to the hardest reaches, returned in descending order of
 * accessibility (most likely first).
 *
 * Why stratify instead of sorting: sorting on one key and slicing the top N
 * structurally returns one END of the spectrum, never a spread. The previous
 * version sorted by acceptance rate descending, which handed a US student 20
 * open-admission schools (all ~99%) and a UK student 20 pure reaches -- in
 * both cases the comment promised "safety through reach" and the code
 * delivered neither.
 *
 * Tiers come from getSelectivityTier(), reused rather than reimplemented, so
 * this can never drift from the prediction engine's own bands. Within each
 * tier, field-of-interest matches rank first, then schools whose tier rests on
 * real published data ahead of those resting on a rank proxy -- the first
 * batch a student sees should be the most trustworthy data available.
 */
export function buildShortlist(relevant: RelevantUniversity[], limit = SHORTLIST_SIZE): RelevantUniversity[] {
  // Most accessible tier first, so the returned order runs Likely -> Reach.
  const ORDER: SelectivityTier[] = ["low", "moderate", "high", "very_high", "extreme"];

  const classified = relevant
    .map((r) => ({
      row: r,
      sel: getSelectivityTier({
        acceptanceRate: r.acceptanceRate,
        acceptanceRateLevel: r.acceptanceRate != null ? "university" : null,
        globalRank: r.globalRank,
      }),
    }))
    // Evidenced schools are ordered first by the ranking below, but estimate-
    // based ones are NOT dropped: across some country combinations there are
    // barely a dozen universities with any published data, so filtering them
    // out entirely left the feed unable to reach `limit` at all. They are
    // queued too, and the UI decides what to show by default -- evidenced
    // matches up front, the rest behind an explicit "show estimated" control.
    ;

  const rank = (a: typeof classified[number], b: typeof classified[number]) => {
    if (a.row.matchesFieldOfInterest !== b.row.matchesFieldOfInterest) {
      return a.row.matchesFieldOfInterest ? -1 : 1;
    }
    const weight = (basis: string) => (basis === "acceptance_rate" ? 0 : basis === "rank_proxy" ? 1 : 2);
    const w = weight(a.sel.basis) - weight(b.sel.basis);
    if (w !== 0) return w;
    // Cosmetic, and deliberately ranked below both substantive keys above: a
    // school with a campus photo never outranks a better field match or
    // better-evidenced data, it only wins between candidates already equal on
    // both. A card grid of grey placeholder icons reads as a broken product.
    if (a.row.hasPhoto !== b.row.hasPhoto) return a.row.hasPhoto ? -1 : 1;
    // Within a tier, more accessible first, keeping the descending feel.
    return (b.row.acceptanceRate ?? -1) - (a.row.acceptanceRate ?? -1);
  };

  // Stratified pick over one pool: an even quota per tier, then redistribute
  // whatever thin tiers can't fill, so the list reaches `n` rather than
  // showing gaps.
  const gather = (pool: typeof classified, n: number): typeof classified => {
    const buckets = new Map<SelectivityTier, typeof classified>();
    for (const t of ORDER) buckets.set(t, []);
    for (const c of pool) buckets.get(c.sel.tier)!.push(c);
    for (const t of ORDER) buckets.get(t)!.sort(rank);

    const quota = Math.ceil(n / ORDER.length);
    const out: typeof classified = [];
    const cursor = new Map<SelectivityTier, number>(ORDER.map((t) => [t, 0]));
    for (const t of ORDER) {
      const bucket = buckets.get(t)!;
      const take = bucket.slice(0, quota);
      out.push(...take);
      cursor.set(t, take.length);
    }
    for (const t of ORDER) {
      if (out.length >= n) break;
      const bucket = buckets.get(t)!;
      let i = cursor.get(t)!;
      while (out.length < n && i < bucket.length) out.push(bucket[i++]);
      cursor.set(t, i);
    }
    return out.slice(0, n);
  };

  // Universities we hold a real campus photo for are picked first -- a grid of
  // grey placeholders reads as a broken product. It is a preference, not a
  // filter: photo coverage is 19%, and a student targeting only Australia has
  // six such universities in total, so a hard filter would hand them six
  // recommendations instead of twenty. Whatever the photo pool can't fill is
  // topped up from the rest, still stratified across tiers.
  const picked = gather(
    classified.filter((c) => c.row.hasPhoto),
    limit,
  );
  if (picked.length < limit) {
    picked.push(
      ...gather(
        classified.filter((c) => !c.row.hasPhoto),
        limit - picked.length,
      ),
    );
  }

  // Emit in tier order: Likely -> ... -> hardest reach.
  const byTier = new Map<SelectivityTier, typeof classified>();
  for (const t of ORDER) byTier.set(t, []);
  for (const p of picked.slice(0, limit)) byTier.get(p.sel.tier)!.push(p);
  return ORDER.flatMap((t) => byTier.get(t)!.sort(rank)).map((c) => c.row);
}

export interface UniversityForAnalysis {
  id: string;
  name: string;
  city: string | null;
  countryName: string;
  photoUrl: string | null;
  specialities: string[];
  programs: { displayName: string; categoryName: string }[];
  admissionStatistics: { year: number; acceptanceRate: number | null; level: "university" } | null;
  /** Published score bands for admitted students -- what the student's own stats get compared against. */
  requirements: {
    requirementType: string;
    description: string;
    /** 25th-75th percentile band for admitted students -- never a hard cutoff. */
    minValue: number | null;
    maxValue: number | null;
  }[];
  globalRank: number | null;
}

// Batched (not per-university) fetch of everything the university-level
// analysis pipeline needs -- specialities/programs as descriptive context
// (never a gate), the real acceptance rate from university_admission_statistics
// if we have one, and the best global rank as a fallback proxy. One round
// trip per table for the whole chunk instead of an N+1 query per university.
export async function getUniversitiesForAnalysis(universityIds: string[]): Promise<Map<string, UniversityForAnalysis>> {
  const map = new Map<string, UniversityForAnalysis>();
  if (universityIds.length === 0) return map;
  const supabase = await createClient();

  const [
    { data: unis },
    { data: programs },
    { data: specialities },
    { data: stats },
    { data: rankings },
    { data: requirements },
  ] = await Promise.all([
      supabase.from("universities").select("id, name, city, photo_url, countries(name)").in("id", universityIds),
      supabase
        .from("university_programs")
        .select("university_id, display_name, programs(program_categories(name))")
        .in("university_id", universityIds),
      supabase
        .from("university_specialities")
        .select("university_id, program_categories(name)")
        .in("university_id", universityIds),
      supabase
        .from("university_admission_statistics")
        .select("university_id, year, acceptance_rate")
        .in("university_id", universityIds)
        .order("year", { ascending: false }),
      supabase
        .from("university_rankings")
        .select("university_id, ranking_value, ranking_year")
        .in("university_id", universityIds)
        .eq("ranking_type", "global")
        .order("ranking_year", { ascending: false }),
      supabase
        .from("university_admission_requirements")
        .select("university_id, requirement_type, description, min_value, max_value")
        .in("university_id", universityIds),
    ]);

  for (const u of (unis ?? []) as any[]) {
    map.set(u.id, {
      id: u.id,
      name: u.name,
      city: u.city,
      countryName: u.countries?.name ?? "",
      photoUrl: u.photo_url,
      specialities: [],
      programs: [],
      admissionStatistics: null,
      requirements: [],
      globalRank: null,
    });
  }
  for (const r of (requirements ?? []) as any[]) {
    const entry = map.get(r.university_id);
    if (entry) {
      entry.requirements.push({
        requirementType: r.requirement_type,
        description: r.description,
        minValue: r.min_value ?? null,
        maxValue: r.max_value ?? null,
      });
    }
  }
  for (const p of (programs ?? []) as any[]) {
    const entry = map.get(p.university_id);
    if (entry) entry.programs.push({ displayName: p.display_name, categoryName: p.programs?.program_categories?.name ?? "" });
  }
  for (const s of (specialities ?? []) as any[]) {
    const entry = map.get(s.university_id);
    const name = s.program_categories?.name;
    if (entry && name) entry.specialities.push(name);
  }
  for (const s of (stats ?? []) as any[]) {
    const entry = map.get(s.university_id);
    if (entry && !entry.admissionStatistics) {
      entry.admissionStatistics = { year: s.year, acceptanceRate: s.acceptance_rate, level: "university" };
    }
  }
  for (const r of (rankings ?? []) as any[]) {
    const entry = map.get(r.university_id);
    if (entry && entry.globalRank == null) entry.globalRank = r.ranking_value;
  }

  return map;
}

export interface UniversityRankingRow {
  type: "national" | "global" | "subject";
  value: number;
  org: string;
  year: number;
  subjectCategoryName: string | null;
  sourceUrl: string | null;
}

export interface UniversityWithPrograms {
  id: string;
  name: string;
  city: string | null;
  countryName: string;
  website: string | null;
  universityType: string | null;
  description: string | null;
  photoUrl: string | null;
  photoAttribution: string | null;
  photoSourceUrl: string | null;
  rankings: UniversityRankingRow[];
  specialities: string[];
  programs: {
    id: string;
    displayName: string;
    degreeLevel: string;
    categoryId: string | null;
    categoryName: string;
  }[];
}

export async function getUniversityWithPrograms(universityId: string): Promise<UniversityWithPrograms | null> {
  const supabase = await createClient();
  const { data: uni } = (await supabase
    .from("universities")
    .select("id, name, city, website, university_type, description, photo_url, photo_attribution, photo_source_url, countries(name)")
    .eq("id", universityId)
    .maybeSingle()) as { data: any };
  if (!uni) return null;

  const [{ data: programs }, { data: rankings }, { data: specialities }] = await Promise.all([
    supabase
      .from("university_programs")
      .select("id, display_name, degree_level, programs(category_id, program_categories(name))")
      .eq("university_id", universityId)
      .order("display_name"),
    supabase
      .from("university_rankings")
      .select("ranking_type, ranking_value, ranking_org, ranking_year, source_url, program_categories(name)")
      .eq("university_id", universityId)
      .order("ranking_year", { ascending: false }),
    supabase
      .from("university_specialities")
      .select("program_categories(name)")
      .eq("university_id", universityId),
  ]);

  return {
    id: uni.id,
    name: uni.name,
    city: uni.city,
    website: uni.website,
    universityType: uni.university_type,
    description: uni.description,
    photoUrl: uni.photo_url,
    photoAttribution: uni.photo_attribution,
    photoSourceUrl: uni.photo_source_url,
    countryName: (uni as any).countries?.name ?? "",
    rankings: (rankings ?? []).map((r: any) => ({
      type: r.ranking_type,
      value: r.ranking_value,
      org: r.ranking_org,
      year: r.ranking_year,
      subjectCategoryName: r.program_categories?.name ?? null,
      sourceUrl: r.source_url,
    })),
    programs: (programs ?? []).map((p: any) => ({
      id: p.id,
      displayName: p.display_name,
      degreeLevel: p.degree_level,
      categoryId: p.programs?.category_id ?? null,
      categoryName: p.programs?.program_categories?.name ?? "",
    })),
    specialities: (specialities ?? [])
      .map((s: any) => s.program_categories?.name)
      .filter((name: string | undefined): name is string => Boolean(name)),
  };
}

export interface DataProvenance {
  sourceName: string | null;
  sourceUrl: string | null;
  reliabilityTier: string | null;
  dataYear: number | null;
  lastVerifiedAt: string | null;
}

export interface UniversityProgramDetail {
  id: string;
  displayName: string;
  degreeLevel: string;
  durationYears: number | null;
  overview: string | null;
  university: {
    id: string;
    name: string;
    city: string | null;
    countryName: string;
    website: string | null;
    photoUrl: string | null;
    photoAttribution: string | null;
  };
  categoryId: string;
  categoryName: string;
  requirements: { requirementType: string; description: string; minGrade: string | null; provenance: DataProvenance }[];
  admissionStatistics: {
    year: number;
    acceptanceRate: number | null;
    internationalAcceptanceRate: number | null;
    applicantCount: number | null;
    admittedCount: number | null;
    confidence: string;
    level: "university" | "faculty" | "program";
    provenance: DataProvenance;
  }[];
  tuition: { year: number; currency: string; domesticAmount: number | null; internationalAmount: number | null; provenance: DataProvenance }[];
  scholarships: { name: string; amountType: string; amount: number | null; currency: string | null; eligibilityText: string | null; deadline: string | null; provenance: DataProvenance }[];
  deadlines: { deadlineType: string; applicantType: string | null; date: string | null; notes: string | null }[];
}

function toProvenance(row: any): DataProvenance {
  return {
    sourceName: row?.data_sources?.name ?? null,
    sourceUrl: row?.data_sources?.url ?? null,
    reliabilityTier: row?.data_sources?.reliability_tier ?? null,
    dataYear: row?.data_year ?? row?.year ?? null,
    lastVerifiedAt: row?.last_verified_at ?? null,
  };
}

export async function getUniversityProgramDetail(universityProgramId: string): Promise<UniversityProgramDetail | null> {
  const supabase = await createClient();

  const { data: up } = (await supabase
    .from("university_programs")
    .select(
      `id, display_name, degree_level, duration_years, overview,
       universities(id, name, city, website, photo_url, photo_attribution, countries(name)),
       programs(category_id, program_categories(name))`
    )
    .eq("id", universityProgramId)
    .maybeSingle()) as { data: any };
  if (!up) return null;

  const [{ data: requirements }, { data: stats }, { data: tuition }, { data: scholarships }, { data: deadlines }] =
    await Promise.all([
      supabase
        .from("admission_requirements")
        .select("requirement_type, description, min_grade, data_year, last_verified_at, data_sources(name, url, reliability_tier)")
        .eq("university_program_id", universityProgramId),
      supabase
        .from("admission_statistics")
        .select("year, acceptance_rate, international_acceptance_rate, applicant_count, admitted_count, confidence, level, last_verified_at, data_sources(name, url, reliability_tier)")
        .eq("university_program_id", universityProgramId)
        .order("year", { ascending: false }),
      supabase
        .from("tuition")
        .select("year, currency, domestic_amount, international_amount, last_verified_at, data_sources(name, url, reliability_tier)")
        .eq("university_program_id", universityProgramId)
        .order("year", { ascending: false }),
      supabase
        .from("scholarships")
        .select("name, amount_type, amount, currency, eligibility_text, deadline, last_verified_at, data_sources(name, url, reliability_tier)")
        .eq("university_program_id", universityProgramId),
      supabase
        .from("deadlines")
        .select("deadline_type, applicant_type, date, notes")
        .eq("university_program_id", universityProgramId),
    ]);

  const uni = (up as any).universities;

  return {
    id: up.id,
    displayName: up.display_name,
    degreeLevel: up.degree_level,
    durationYears: up.duration_years,
    overview: up.overview,
    university: {
      id: uni.id,
      name: uni.name,
      city: uni.city,
      countryName: uni.countries?.name ?? "",
      website: uni.website,
      photoUrl: uni.photo_url,
      photoAttribution: uni.photo_attribution,
    },
    categoryId: (up as any).programs?.category_id,
    categoryName: (up as any).programs?.program_categories?.name ?? "",
    requirements: (requirements ?? []).map((r: any) => ({
      requirementType: r.requirement_type,
      description: r.description,
      minGrade: r.min_grade,
      provenance: toProvenance(r),
    })),
    admissionStatistics: (stats ?? []).map((s: any) => ({
      year: s.year,
      acceptanceRate: s.acceptance_rate,
      internationalAcceptanceRate: s.international_acceptance_rate,
      applicantCount: s.applicant_count,
      admittedCount: s.admitted_count,
      confidence: s.confidence,
      level: s.level,
      provenance: toProvenance(s),
    })),
    tuition: (tuition ?? []).map((t: any) => ({
      year: t.year,
      currency: t.currency,
      domesticAmount: t.domestic_amount,
      internationalAmount: t.international_amount,
      provenance: toProvenance(t),
    })),
    scholarships: (scholarships ?? []).map((s: any) => ({
      name: s.name,
      amountType: s.amount_type,
      amount: s.amount,
      currency: s.currency,
      eligibilityText: s.eligibility_text,
      deadline: s.deadline,
      provenance: toProvenance(s),
    })),
    deadlines: (deadlines ?? []).map((d: any) => ({
      deadlineType: d.deadline_type,
      applicantType: d.applicant_type,
      date: d.date,
      notes: d.notes,
    })),
  };
}
