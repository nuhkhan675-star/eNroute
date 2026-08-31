import { createClient } from "@/lib/supabase/server";

export interface FullStudentProfile {
  id: string;
  userId: string;
  curriculum: { id: string; code: string; name: string } | null;
  subjects: { subjectName: string; level: string | null; grade: string; gradeScale: string }[];
  extracurriculars: {
    activityName: string;
    category: string;
    role: string | null;
    yearsInvolved: number | null;
    description: string | null;
    achievements: string | null;
    impact: string | null;
  }[];
  intendedProgramCategory: { id: string; code: string; name: string } | null;
  preferredCountryIds: string[];
  preferredCountries: { id: string; name: string }[];
  budgetAmount: number | null;
  budgetCurrency: string | null;
  budgetIncludesLiving: string | null;
  profileStrength: number | null;
}

// Selects the full graph of a student's onboarding data in one round trip.
// Used by the dashboard, the AI orchestrator, and the chat context builder --
// every consumer of "what does this student's profile look like" goes
// through this one function so the shape can't drift between call sites.
async function mapProfileRow(supabase: Awaited<ReturnType<typeof createClient>>, row: any): Promise<FullStudentProfile> {
  const [{ data: subjects }, { data: extracurriculars }, { data: countries }] = await Promise.all([
    supabase
      .from("student_subjects")
      .select("level, grade, subjects(name, grade_scale)")
      .eq("profile_id", row.id),
    supabase
      .from("extracurriculars")
      .select("activity_name, category, role, years_involved, description, achievements, impact")
      .eq("profile_id", row.id),
    supabase
      .from("student_countries")
      .select("country_id, countries(id, name)")
      .eq("profile_id", row.id),
  ]);

  return {
    id: row.id,
    userId: row.user_id,
    curriculum: row.curricula
      ? { id: row.curricula.id, code: row.curricula.code, name: row.curricula.name }
      : null,
    subjects: (subjects ?? []).map((s: any) => ({
      subjectName: s.subjects?.name ?? "Unknown subject",
      level: s.level,
      grade: s.grade,
      gradeScale: s.subjects?.grade_scale ?? "",
    })),
    extracurriculars: (extracurriculars ?? []).map((a: any) => ({
      activityName: a.activity_name,
      category: a.category,
      role: a.role,
      yearsInvolved: a.years_involved,
      description: a.description,
      achievements: a.achievements,
      impact: a.impact,
    })),
    intendedProgramCategory: row.program_categories
      ? {
          id: row.program_categories.id,
          code: row.program_categories.code,
          name: row.program_categories.name,
        }
      : null,
    preferredCountryIds: (countries ?? []).map((c: any) => c.country_id),
    preferredCountries: (countries ?? []).map((c: any) => ({
      id: c.countries?.id,
      name: c.countries?.name,
    })),
    budgetAmount: row.budget_amount,
    budgetCurrency: row.budget_currency,
    budgetIncludesLiving: row.budget_includes_living,
    profileStrength: row.profile_strength,
  };
}

export async function getProfileByUserId(userId: string): Promise<FullStudentProfile | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("student_profiles")
    .select("*, curricula(id, code, name), program_categories(id, code, name)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;
  return mapProfileRow(supabase, row);
}

export async function getProfileById(profileId: string): Promise<FullStudentProfile | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("student_profiles")
    .select("*, curricula(id, code, name), program_categories(id, code, name)")
    .eq("id", profileId)
    .maybeSingle();
  if (!row) return null;
  return mapProfileRow(supabase, row);
}
