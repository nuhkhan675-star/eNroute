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
    .select("id, curriculum_id, grade_10_board, intended_program_category_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  const [{ data: subjects }, { data: grade10Subjects }, { data: extracurriculars }, { data: examScores }] =
    await Promise.all([
      supabase.from("student_subjects").select("level, grade, subjects(id, name)").eq("profile_id", row.id),
      supabase.from("grade_10_subjects").select("subject_name, grade").eq("profile_id", row.id),
      supabase
        .from("extracurriculars")
        .select("activity_name, category, role, years_involved, description, achievements, impact")
        .eq("profile_id", row.id),
      supabase.from("exam_scores").select("exam_type, score").eq("profile_id", row.id),
    ]);

  return {
    curriculumId: row.curriculum_id,
    subjects: (subjects ?? []).map((s: any) => ({
      subjectId: s.subjects?.id ?? "",
      subjectName: s.subjects?.name ?? "",
      level: s.level,
      grade: s.grade,
    })),
    grade10Board: row.grade_10_board,
    grade10Subjects: (grade10Subjects ?? []).map((s: any) => ({
      id: crypto.randomUUID(),
      subjectName: s.subject_name,
      grade: s.grade,
    })),
    fieldOfInterestId: row.intended_program_category_id,
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
