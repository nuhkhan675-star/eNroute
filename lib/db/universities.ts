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

export interface ChosenProgram {
  id: string;
  displayName: string;
  categoryId: string | null;
}

// Batched (not per-university) lookup of "which program would we analyze
// for this university" -- the one matching the student's field of interest,
// else the first program on record. Used to auto-run chance analysis across
// a whole country listing without an N+1 query per card.
export async function getChosenProgramsForUniversities(
  universityIds: string[],
  fieldOfInterestId: string | null
): Promise<Record<string, ChosenProgram>> {
  if (universityIds.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("university_programs")
    .select("id, university_id, display_name, programs(category_id)")
    .in("university_id", universityIds)
    .order("display_name");
  if (error) throw error;

  const byUniversity = new Map<string, { id: string; displayName: string; categoryId: string | null }[]>();
  for (const row of (data ?? []) as any[]) {
    const list = byUniversity.get(row.university_id) ?? [];
    list.push({ id: row.id, displayName: row.display_name, categoryId: row.programs?.category_id ?? null });
    byUniversity.set(row.university_id, list);
  }

  const result: Record<string, ChosenProgram> = {};
  for (const [universityId, programs] of byUniversity) {
    const chosen = programs.find((p) => p.categoryId === fieldOfInterestId) ?? programs[0];
    if (chosen) result[universityId] = chosen;
  }
  return result;
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
  rankings: UniversityRankingRow[];
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
    .select("id, name, city, website, university_type, description, photo_url, photo_attribution, countries(name)")
    .eq("id", universityId)
    .maybeSingle()) as { data: any };
  if (!uni) return null;

  const [{ data: programs }, { data: rankings }] = await Promise.all([
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
        .select("year, acceptance_rate, international_acceptance_rate, applicant_count, admitted_count, confidence, last_verified_at, data_sources(name, url, reliability_tier)")
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
