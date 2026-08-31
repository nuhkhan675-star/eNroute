import { createClient } from "@/lib/supabase/server";

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
  programs: {
    id: string;
    displayName: string;
    degreeLevel: string;
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

  const { data: programs } = await supabase
    .from("university_programs")
    .select("id, display_name, degree_level, programs(program_categories(name))")
    .eq("university_id", universityId)
    .order("display_name");

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
    programs: (programs ?? []).map((p: any) => ({
      id: p.id,
      displayName: p.display_name,
      degreeLevel: p.degree_level,
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
