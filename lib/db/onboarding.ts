import { createClient } from "@/lib/supabase/server";
import type { OnboardingDraft } from "@/lib/validation/onboarding";

// Loads a student's already-saved profile back into onboarding-draft shape,
// so "Re-analyse your profile" can open the wizard pre-filled for editing
// instead of either starting blank or silently re-running AI on unchanged
// data. Returns null if they haven't completed onboarding yet.
export async function getExistingOnboardingDraft(userId: string): Promise<OnboardingDraft | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("student_profiles")
    .select(
      "id, curriculum_id, cas_completed, grade_10_board, intended_program_category_id, preferred_climate, preferred_industry_hub, preferred_ranking_band"
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  const [
    { data: subjects },
    { data: targetCountries },
    { data: grade9Subjects },
    { data: grade10Subjects },
    { data: grade11Subjects },
    { data: extracurriculars },
    { data: examScores },
  ] = await Promise.all([
    supabase.from("student_subjects").select("level, grade, subjects(id, name)").eq("profile_id", row.id),
    supabase.from("student_target_countries").select("country_id").eq("profile_id", row.id),
    supabase.from("grade_9_subjects").select("subject_name, grade").eq("profile_id", row.id),
    supabase.from("grade_10_subjects").select("subject_name, grade").eq("profile_id", row.id),
    supabase.from("grade_11_subjects").select("subject_name, grade").eq("profile_id", row.id),
    supabase
      .from("extracurriculars")
      .select("activity_name, category, role, years_involved, description, achievements, impact")
      .eq("profile_id", row.id),
    supabase.from("exam_scores").select("exam_type, score").eq("profile_id", row.id),
  ]);

  const toGradeEntries = (rows: { subject_name: string; grade: string }[] | null) =>
    (rows ?? []).map((s) => ({ id: crypto.randomUUID(), subjectName: s.subject_name, grade: s.grade }));

  return {
    curriculumId: row.curriculum_id,
    subjects: (subjects ?? []).map((s: any) => ({
      subjectId: s.subjects?.id ?? "",
      subjectName: s.subjects?.name ?? "",
      level: s.level,
      grade: s.grade,
    })),
    casCompleted: row.cas_completed,
    targetCountryIds: (targetCountries ?? []).map((c: any) => c.country_id),
    grade10Board: row.grade_10_board,
    grade9Subjects: toGradeEntries(grade9Subjects),
    grade10Subjects: toGradeEntries(grade10Subjects),
    grade11Subjects: toGradeEntries(grade11Subjects),
    fieldOfInterestId: row.intended_program_category_id,
    preferredClimate: (row as any).preferred_climate,
    preferredIndustryHub: (row as any).preferred_industry_hub,
    preferredRankingBand: (row as any).preferred_ranking_band,
    extracurriculars: (extracurriculars ?? []).map((a: any) => ({
      id: crypto.randomUUID(),
      activityName: a.activity_name,
      category: a.category,
      role: a.role ?? undefined,
      yearsInvolved: a.years_involved ?? undefined,
      description: a.description ?? undefined,
      achievements: a.achievements ?? undefined,
      impact: a.impact ?? undefined,
    })),
    examScores: (examScores ?? []).map((e: any) => ({
      id: crypto.randomUUID(),
      examType: e.exam_type,
      score: e.score,
    })),
  };
}

export interface ProfileVersion {
  id: string;
  createdAt: string;
  draft: OnboardingDraft;
}

// Last 5 saved snapshots (see submitOnboarding, which writes one before
// every overwrite) so the review step can offer "load an earlier version."
export async function getProfileVersions(userId: string): Promise<ProfileVersion[]> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile) return [];

  const { data } = await supabase
    .from("student_profile_versions")
    .select("id, snapshot, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    createdAt: row.created_at,
    draft: row.snapshot as OnboardingDraft,
  }));
}
