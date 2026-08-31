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
  if (!draft.intendedProgramCategoryId) return { error: "Intended program is required." };
  if (draft.preferredCountryIds.length === 0) return { error: "Select at least one country." };

  const { data: profile, error: profileError } = await supabase
    .from("student_profiles")
    .upsert(
      {
        user_id: user.id,
        curriculum_id: draft.curriculumId,
        intended_program_category_id: draft.intendedProgramCategoryId,
        budget_amount: draft.budgetSkipped ? null : draft.budgetAmount,
        budget_currency: draft.budgetSkipped ? null : draft.budgetCurrency,
        budget_includes_living: draft.budgetSkipped ? null : draft.budgetIncludesLiving,
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
  await supabase.from("student_countries").delete().eq("profile_id", profileId);

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

  const { error: countriesError } = await supabase.from("student_countries").insert(
    draft.preferredCountryIds.map((countryId) => ({
      profile_id: profileId,
      country_id: countryId,
    }))
  );
  if (countriesError) return { error: countriesError.message };

  return { profileId };
}
