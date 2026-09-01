"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingDraft } from "@/lib/validation/onboarding";
import { redirect } from "next/navigation";

export interface SubmitOnboardingResult {
  error?: string;
  profileId?: string;
}

export async function submitOnboarding(draft: OnboardingDraft): Promise<SubmitOnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!draft.curriculumId) return { error: "Curriculum is required." };

  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .upsert(
      {
        user_id: user.id,
        curriculum_id: draft.curriculumId,
        intended_program_category_id: draft.fieldOfInterestId,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message ?? "Could not save profile." };
  }
  const profileId = profile.id as string;

  // Full-replace pattern: clear and re-insert child rows so re-submitting an
  // edited onboarding form doesn't leave stale entries behind.
  await supabase.from("student_subjects").delete().eq("profile_id", profileId);
  await supabase.from("extracurriculars").delete().eq("profile_id", profileId);
  await supabase.from("exam_scores").delete().eq("profile_id", profileId);

  if (draft.subjects.length > 0) {
    const { error } = await supabase.from("student_subjects").insert(
      draft.subjects.map((s) => ({
        profile_id: profileId,
        subject_id: s.subjectId,
        level: s.level,
        grade: s.grade,
      }))
    );
    if (error) return { error: error.message };
  }

  if (draft.extracurriculars.length > 0) {
    const { error } = await supabase.from("extracurriculars").insert(
      draft.extracurriculars.map((a) => ({
        profile_id: profileId,
        activity_name: a.activityName,
        category: a.category,
        role: a.role ?? null,
        years_involved: a.yearsInvolved ?? null,
        description: a.description ?? null,
        achievements: a.achievements ?? null,
        impact: a.impact ?? null,
      }))
    );
    if (error) return { error: error.message };
  }

  if (draft.examScores.length > 0) {
    const { error } = await supabase.from("exam_scores").insert(
      draft.examScores.map((e) => ({
        profile_id: profileId,
        exam_type: e.examType,
        score: e.score,
      }))
    );
    if (error) return { error: error.message };
  }

  return { profileId };
}
