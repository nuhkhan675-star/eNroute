"use server";

import { createClient } from "@/lib/supabase/server";
import type { OnboardingDraft } from "@/lib/validation/onboarding";
import { redirect } from "next/navigation";
import { analyzeProfile } from "@/lib/ai/orchestrator";
import { deleteUniversityAnalysesForProfile } from "@/lib/db/analyses";
import { getExistingOnboardingDraft } from "@/lib/db/onboarding";

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

  // Snapshot whatever's currently saved (if anything) before it's
  // overwritten, so the review step can offer "load an earlier version."
  // Best-effort -- a snapshot failure should never block saving the new
  // profile.
  try {
    const previousDraft = await getExistingOnboardingDraft(user.id);
    if (previousDraft) {
      const { data: existingProfile } = await supabase
        .from("student_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existingProfile) {
        await supabase
          .from("student_profile_versions")
          .insert({ profile_id: existingProfile.id, snapshot: previousDraft as never });
        const { data: oldVersions } = await supabase
          .from("student_profile_versions")
          .select("id")
          .eq("profile_id", existingProfile.id)
          .order("created_at", { ascending: false })
          .range(5, 1000);
        if (oldVersions && oldVersions.length > 0) {
          await supabase
            .from("student_profile_versions")
            .delete()
            .in("id", oldVersions.map((v) => v.id));
        }
      }
    }
  } catch (err) {
    console.error("Profile version snapshot failed:", err instanceof Error ? err.message : err);
  }

  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .upsert(
      {
        user_id: user.id,
        curriculum_id: draft.curriculumId,
        cas_completed: draft.casCompleted,
        grade_10_board: draft.grade10Board || null,
        intended_program_category_id: draft.fieldOfInterestId,
        preferred_climate: draft.preferredClimate,
        preferred_industry_hub: draft.preferredIndustryHub,
        preferred_ranking_band: draft.preferredRankingBand,
        // Resetting on every save (not just first-time) means an edit to an
        // already-analyzed profile correctly shows "not yet analyzed" rather
        // than a stale score computed from the old data.
        profile_strength: null,
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
  await supabase.from("student_target_countries").delete().eq("profile_id", profileId);
  await supabase.from("grade_9_subjects").delete().eq("profile_id", profileId);
  await supabase.from("grade_10_subjects").delete().eq("profile_id", profileId);
  await supabase.from("grade_11_subjects").delete().eq("profile_id", profileId);
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

  if ((draft.targetCountryIds ?? []).length > 0) {
    const { error } = await supabase.from("student_target_countries").insert(
      draft.targetCountryIds.map((countryId) => ({ profile_id: profileId, country_id: countryId }))
    );
    if (error) return { error: error.message };
  }

  if ((draft.grade9Subjects ?? []).length > 0) {
    const { error } = await supabase.from("grade_9_subjects").insert(
      draft.grade9Subjects.map((s) => ({ profile_id: profileId, subject_name: s.subjectName, grade: s.grade }))
    );
    if (error) return { error: error.message };
  }

  if ((draft.grade10Subjects ?? []).length > 0) {
    const { error } = await supabase.from("grade_10_subjects").insert(
      draft.grade10Subjects.map((s) => ({
        profile_id: profileId,
        subject_name: s.subjectName,
        grade: s.grade,
      }))
    );
    if (error) return { error: error.message };
  }

  if ((draft.grade11Subjects ?? []).length > 0) {
    const { error } = await supabase.from("grade_11_subjects").insert(
      draft.grade11Subjects.map((s) => ({ profile_id: profileId, subject_name: s.subjectName, grade: s.grade }))
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

  // Any previously-computed university predictions are now stale (the
  // profile they were based on just changed) -- clear them all rather than
  // trying to determine which ones are still valid (see plan doc for why
  // full invalidation was chosen over field-level dependency tracking).
  await deleteUniversityAnalysesForProfile(profileId);

  // Run the two cached, profile-level analyses (academic + extracurricular)
  // synchronously so profile strength -- and the relevance list the
  // dashboard's auto-analysis queue needs -- are ready the instant the
  // student lands there. Cheap (2 calls) and this is the one place a fresh
  // run is actually required, since the profile just changed. Per-university
  // analysis itself is NOT run here -- that happens progressively on the
  // dashboard so this action never blocks on N Gemini calls.
  try {
    await analyzeProfile(profileId);
  } catch (err) {
    console.error("Post-onboarding profile analysis failed:", err instanceof Error ? err.message : err);
  }

  return { profileId };
}
