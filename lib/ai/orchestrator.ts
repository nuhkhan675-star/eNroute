import { getProfileById, type FullStudentProfile } from "@/lib/db/profiles";
import { saveAnalysis, getLatestAnalysis } from "@/lib/db/analyses";
import { runAcademicAnalyst } from "@/lib/ai/agents/academicAnalyst";
import { runExtracurricularAnalyst } from "@/lib/ai/agents/extracurricularAnalyst";
import { computeProfileStrength } from "@/lib/ai/profileStrength";
import { createClient } from "@/lib/supabase/server";
import {
  academicAnalysisSchema,
  extracurricularAnalysisSchema,
  type AcademicAnalysis,
  type ExtracurricularAnalysis,
} from "@/lib/ai/schemas";

// Reuses cached general-profile analyses (academic/extracurricular) if they
// exist, otherwise runs them fresh. The profile is university-agnostic --
// major fit is computed separately, per-university, by analyzeUniversity
// whenever the student checks their chances at a specific program.
export async function ensureGeneralAnalyses(
  profile: FullStudentProfile
): Promise<{ academic: AcademicAnalysis; extracurricular: ExtracurricularAnalysis }> {
  const [cachedAcademic, cachedExtracurricular] = await Promise.all([
    getLatestAnalysis(profile.id, "academic"),
    getLatestAnalysis(profile.id, "extracurricular"),
  ]);

  if (cachedAcademic && cachedExtracurricular) {
    return {
      academic: academicAnalysisSchema.parse(cachedAcademic.output),
      extracurricular: extracurricularAnalysisSchema.parse(cachedExtracurricular.output),
    };
  }

  return analyzeProfile(profile.id);
}

export interface ProfileAnalysisResult {
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  profileStrength: number;
}

// Rates the student's profile: academic + extracurricular analysts run in
// parallel, then a deterministic composite score is cached on the profile.
// This is university-agnostic by design -- it doesn't ask (or care) which
// program the student is targeting. Triggered from POST /api/analyze after
// onboarding, and re-run whenever profile-affecting data changes.
export async function analyzeProfile(profileId: string): Promise<ProfileAnalysisResult> {
  const profile = await getProfileById(profileId);
  if (!profile) throw new Error("Profile not found");

  const [academic, extracurricular] = await Promise.all([
    runAcademicAnalyst(profile),
    runExtracurricularAnalyst(profile),
  ]);
  await Promise.all([
    saveAnalysis({ profileId, analysisType: "academic", input: profile, output: academic }),
    saveAnalysis({ profileId, analysisType: "extracurricular", input: profile, output: extracurricular }),
  ]);

  const profileStrength = computeProfileStrength(academic.academic_score, extracurricular.extracurricular_score);
  const supabase = await createClient();
  await supabase.from("student_profiles").update({ profile_strength: profileStrength }).eq("id", profileId);

  return { academic, extracurricular, profileStrength };
}
