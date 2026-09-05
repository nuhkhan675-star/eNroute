import { createClient } from "@/lib/supabase/server";
import { getCountries, type Country } from "@/lib/db/reference";

export interface UniversitySearchResult {
  id: string;
  name: string;
  city: string | null;
  countryName: string;
  website: string | null;
  photoUrl: string | null;
}

export async function searchUniversities(query: string): Promise<UniversitySearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, city, website, photo_url, countries(name)")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(25);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
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
  let query = supabase.from("universities").select("id, country_id");
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
  const rateById = new Map<string, number | null>();
  for (const r of rateRows ?? []) {
    if (!rateById.has(r.university_id)) rateById.set(r.university_id, r.acceptance_rate);
  }

  return universityIds.map((id) => ({
    universityId: id,
    matchesFieldOfInterest: matchedIds.has(id),
    acceptanceRate: rateById.get(id) ?? null,
  }));
}

/**
 * The student's shortlist: universities in their target countries that match
 * their field of interest, ordered from the most accessible (highest
 * acceptance rate) down to the most selective, so the feed spans safety
 * through reach rather than being all long-shots or all sure things.
 * Universities with no acceptance rate on record sort last -- we can't place
 * them on that spectrum honestly, but they're still included so the list
 * fills up.
 */
export function buildShortlist(relevant: RelevantUniversity[], limit = SHORTLIST_SIZE): RelevantUniversity[] {
  // Highest acceptance rate first, so a shortlist spans safety -> reach.
  // No rate on record sorts last: we can't honestly place those on the
  // spectrum, but they're still eligible.
  const byAccessibility = (a: RelevantUniversity, b: RelevantUniversity) => {
    if (a.acceptanceRate == null && b.acceptanceRate == null) return 0;
    if (a.acceptanceRate == null) return 1;
    if (b.acceptanceRate == null) return -1;
    return b.acceptanceRate - a.acceptanceRate;
  };

  // Field-matched universities rank first, but they rarely fill the list on
  // their own -- only a small share of the catalog has programs/specialities
  // recorded, so gating strictly on a match would return a handful of
  // results (or none) for most students. Top up from the rest of their
  // target countries instead of showing a near-empty shortlist.
  const matched = relevant.filter((r) => r.matchesFieldOfInterest).sort(byAccessibility);
  if (matched.length >= limit) return matched.slice(0, limit);

  const rest = relevant.filter((r) => !r.matchesFieldOfInterest).sort(byAccessibility);
  return [...matched, ...rest].slice(0, limit);
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
  requirements: { requirementType: string; description: string }[];
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
        .select("university_id, requirement_type, description")
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
    if (entry) entry.requirements.push({ requirementType: r.requirement_type, description: r.description });
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
