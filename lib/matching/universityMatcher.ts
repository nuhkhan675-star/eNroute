import { createClient } from "@/lib/supabase/server";

export interface MatchedUniversityProgram {
  universityProgramId: string;
  universityId: string;
  universityName: string;
  city: string | null;
  countryName: string;
  website: string | null;
  displayName: string;
  degreeLevel: string;
  programCategoryName: string;
  latestTuition: {
    year: number;
    currency: string;
    internationalAmount: number | null;
    domesticAmount: number | null;
  } | null;
  latestAdmissionStats: {
    year: number;
    acceptanceRate: number | null;
    confidence: "high" | "moderate" | "low";
  } | null;
  isWithinBudget: boolean | null; // null = unknown (no data or currency mismatch), not excluded
}

// The factual filter: which universities offer the student's intended
// program category in one of their preferred countries. This is a plain SQL
// query against university_programs/universities/programs -- the AI never
// decides "does university X offer program Y". Budget is attached as
// informational context (isWithinBudget), not a hard exclusion, since a
// currency mismatch or missing tuition row is not evidence of unaffordability.
export async function matchUniversityPrograms(params: {
  programCategoryId: string;
  countryIds: string[];
  maxBudgetAmount?: number | null;
  budgetCurrency?: string | null;
}): Promise<MatchedUniversityProgram[]> {
  const { programCategoryId, countryIds, maxBudgetAmount, budgetCurrency } = params;
  if (countryIds.length === 0) return [];

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("university_programs")
    .select(
      `
      id, display_name, degree_level,
      programs!inner(category_id, program_categories(name)),
      universities!inner(id, name, city, website, country_id, countries(name)),
      tuition(year, currency, international_amount, domestic_amount),
      admission_statistics(year, acceptance_rate, confidence)
    `
    )
    .eq("programs.category_id", programCategoryId)
    .in("universities.country_id", countryIds);

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const latestTuitionRow = [...(row.tuition ?? [])].sort((a, b) => b.year - a.year)[0] ?? null;
    const latestStatsRow = [...(row.admission_statistics ?? [])].sort((a, b) => b.year - a.year)[0] ?? null;

    let isWithinBudget: boolean | null = null;
    if (maxBudgetAmount != null && latestTuitionRow?.international_amount != null) {
      if (!budgetCurrency || budgetCurrency === latestTuitionRow.currency) {
        isWithinBudget = latestTuitionRow.international_amount <= maxBudgetAmount;
      }
    }

    return {
      universityProgramId: row.id,
      universityId: row.universities.id,
      universityName: row.universities.name,
      city: row.universities.city,
      countryName: row.universities.countries?.name ?? "",
      website: row.universities.website,
      displayName: row.display_name,
      degreeLevel: row.degree_level,
      programCategoryName: row.programs?.program_categories?.name ?? "",
      latestTuition: latestTuitionRow
        ? {
            year: latestTuitionRow.year,
            currency: latestTuitionRow.currency,
            internationalAmount: latestTuitionRow.international_amount,
            domesticAmount: latestTuitionRow.domestic_amount,
          }
        : null,
      latestAdmissionStats: latestStatsRow
        ? {
            year: latestStatsRow.year,
            acceptanceRate: latestStatsRow.acceptance_rate,
            confidence: latestStatsRow.confidence,
          }
        : null,
      isWithinBudget,
    };
  });
}
