import { getProfileById, type FullStudentProfile } from "@/lib/db/profiles";
import { saveAnalysis, getLatestAnalysis } from "@/lib/db/analyses";
import { runAcademicAnalyst } from "@/lib/ai/agents/academicAnalyst";
import { runExtracurricularAnalyst } from "@/lib/ai/agents/extracurricularAnalyst";
import { runMajorFitAnalyst } from "@/lib/ai/agents/majorFitAnalyst";
import { computeProfileStrength } from "@/lib/ai/profileStrength";
import { matchUniversityPrograms, type MatchedUniversityProgram } from "@/lib/matching/universityMatcher";
import { analyzeUniversityProgram, type ProgramAnalysisResult } from "@/lib/ai/analyzeProgram";
import { createClient } from "@/lib/supabase/server";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import {
  academicAnalysisSchema,
  extracurricularAnalysisSchema,
  majorFitAnalysisSchema,
  type AcademicAnalysis,
  type ExtracurricularAnalysis,
  type MajorFitAnalysis,
} from "@/lib/ai/schemas";

const MAX_UNIVERSITY_ANALYSES = 10; // bounds AI call volume/latency per run
// Each candidate makes 2 AI calls (scholarship + final strategist). Capping
// in-flight candidates keeps bursts under the Gemini free tier's per-minute
// quota instead of firing all of them at once via an unbounded Promise.all.
const PROGRAM_ANALYSIS_CONCURRENCY = 2;

// Reuses cached general-profile analyses (academic/extracurricular/major_fit)
// if they exist, otherwise runs them fresh. Shared by the bulk orchestrator
// and the single-program "Analyze My Chances" route so a student doesn't pay
// for three extra AI calls every time they open one more university.
export async function ensureGeneralAnalyses(
  profile: FullStudentProfile
): Promise<{ academic: AcademicAnalysis; extracurricular: ExtracurricularAnalysis; majorFit: MajorFitAnalysis }> {
  const [cachedAcademic, cachedExtracurricular, cachedMajorFit] = await Promise.all([
    getLatestAnalysis(profile.id, "academic"),
    getLatestAnalysis(profile.id, "extracurricular"),
    getLatestAnalysis(profile.id, "major_fit"),
  ]);

  if (cachedAcademic && cachedExtracurricular && cachedMajorFit) {
    return {
      academic: academicAnalysisSchema.parse(cachedAcademic.output),
      extracurricular: extracurricularAnalysisSchema.parse(cachedExtracurricular.output),
      majorFit: majorFitAnalysisSchema.parse(cachedMajorFit.output),
    };
  }

  const [academic, extracurricular] = await Promise.all([
    runAcademicAnalyst(profile),
    runExtracurricularAnalyst(profile),
  ]);
  await Promise.all([
    saveAnalysis({ profileId: profile.id, analysisType: "academic", input: profile, output: academic }),
    saveAnalysis({
      profileId: profile.id,
      analysisType: "extracurricular",
      input: profile,
      output: extracurricular,
    }),
  ]);
  const majorFit = await runMajorFitAnalyst(profile, academic, extracurricular);
  await saveAnalysis({
    profileId: profile.id,
    analysisType: "major_fit",
    input: { academic, extracurricular },
    output: majorFit,
  });

  const profileStrength = computeProfileStrength(
    academic.academic_score,
    extracurricular.extracurricular_score,
    majorFit.major_fit_score
  );
  const supabase = await createClient();
  await supabase.from("student_profiles").update({ profile_strength: profileStrength }).eq("id", profile.id);

  return { academic, extracurricular, majorFit };
}

export interface ProfileAnalysisResult {
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  majorFit: MajorFitAnalysis;
  profileStrength: number;
  matches: MatchedUniversityProgram[];
  programAnalyses: ProgramAnalysisResult[];
}

// Runs the full pipeline described in the architecture: general profile
// analysts in parallel, then deterministic matching (SQL, not AI), then
// per-candidate scholarship/cost/classification/strategy for the top N
// matches. Triggered from POST /api/analyze after onboarding, and re-run
// whenever profile-affecting data changes.
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

  const majorFit = await runMajorFitAnalyst(profile, academic, extracurricular);
  await saveAnalysis({
    profileId,
    analysisType: "major_fit",
    input: { academic, extracurricular },
    output: majorFit,
  });

  const profileStrength = computeProfileStrength(
    academic.academic_score,
    extracurricular.extracurricular_score,
    majorFit.major_fit_score
  );
  const supabase = await createClient();
  await supabase.from("student_profiles").update({ profile_strength: profileStrength }).eq("id", profileId);

  const matches = profile.intendedProgramCategory
    ? await matchUniversityPrograms({
        programCategoryId: profile.intendedProgramCategory.id,
        countryIds: profile.preferredCountryIds,
        maxBudgetAmount: profile.budgetAmount,
        budgetCurrency: profile.budgetCurrency,
      })
    : [];

  const candidates = matches.slice(0, MAX_UNIVERSITY_ANALYSES);
  const programAnalyses = (
    await mapWithConcurrency(candidates, PROGRAM_ANALYSIS_CONCURRENCY, (c) =>
      analyzeUniversityProgram({
        profile,
        academic,
        extracurricular,
        majorFit,
        universityProgramId: c.universityProgramId,
      })
    )
  ).filter((r): r is ProgramAnalysisResult => r !== null);

  return { academic, extracurricular, majorFit, profileStrength, matches, programAnalyses };
}
