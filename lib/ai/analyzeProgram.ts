import { getUniversityProgramDetail } from "@/lib/db/universities";
import { saveAnalysis } from "@/lib/db/analyses";
import { runMajorFitAnalyst } from "@/lib/ai/agents/majorFitAnalyst";
import { runScholarshipAnalyst } from "@/lib/ai/agents/scholarshipAnalyst";
import { runFinalStrategist } from "@/lib/ai/agents/finalStrategist";
import { classifyAdmissionLikelihood } from "@/lib/ai/classification";
import type { FullStudentProfile } from "@/lib/db/profiles";
import type { AcademicAnalysis, ExtracurricularAnalysis } from "@/lib/ai/schemas";
import type { ModelAssessmentScores } from "@/lib/db/analyses";

export interface ProgramAnalysisResult {
  universityProgramId: string;
  universityName: string;
  programName: string;
  classification: ReturnType<typeof classifyAdmissionLikelihood>;
  finalStrategy: Awaited<ReturnType<typeof runFinalStrategist>>;
  scholarshipAnalysis: Awaited<ReturnType<typeof runScholarshipAnalyst>>;
  scores: ModelAssessmentScores;
  factualAcceptanceRate: number | null;
}

// Runs the university-specific half of the pipeline (steps 5-6 of the
// orchestration) for one candidate program: scholarship analysis,
// deterministic classification, final strategist -- and persists each to
// ai_analyses. Reused both by the bulk orchestrator (top-N matches) and by
// the "Analyze My Chances" button on a single program page.
export async function analyzeUniversityProgram(params: {
  profile: FullStudentProfile;
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  universityProgramId: string;
}): Promise<ProgramAnalysisResult | null> {
  const { profile, academic, extracurricular, universityProgramId } = params;

  const detail = await getUniversityProgramDetail(universityProgramId);
  if (!detail) return null;

  const requirementInputs = detail.requirements.map((r) => ({ description: r.description, minGrade: r.minGrade }));

  const majorFit = await runMajorFitAnalyst(profile, academic, extracurricular, detail.displayName, requirementInputs);
  await saveAnalysis({
    profileId: profile.id,
    universityProgramId,
    analysisType: "major_fit",
    input: { targetProgramName: detail.displayName },
    output: majorFit,
  });

  const latestStats = [...detail.admissionStatistics].sort((a, b) => b.year - a.year)[0] ?? null;

  const scholarshipInputs = detail.scholarships.map((s) => ({
    name: s.name,
    amountType: s.amountType,
    amount: s.amount,
    currency: s.currency,
    eligibilityText: s.eligibilityText,
  }));

  const scholarshipAnalysis = await runScholarshipAnalyst(academic, extracurricular, scholarshipInputs);
  await saveAnalysis({
    profileId: profile.id,
    universityProgramId,
    analysisType: "scholarship",
    input: { scholarshipInputs },
    output: scholarshipAnalysis,
  });

  const classification = classifyAdmissionLikelihood({
    academicScore: academic.academic_score,
    majorFitScore: majorFit.major_fit_score,
    extracurricularScore: extracurricular.extracurricular_score,
    acceptanceRate: latestStats?.acceptanceRate ?? null,
    acceptanceRateConfidence: (latestStats?.confidence as "high" | "moderate" | "low") ?? null,
    hasSubjects: profile.subjects.length > 0,
    hasExtracurriculars: profile.extracurriculars.length > 0,
  });

  const finalStrategy = await runFinalStrategist({
    profile,
    universityName: detail.university.name,
    programName: detail.displayName,
    academic,
    extracurricular,
    majorFit,
    classification,
    factualAcceptanceRate: latestStats?.acceptanceRate ?? null,
    requirements: requirementInputs,
  });
  await saveAnalysis({
    profileId: profile.id,
    universityProgramId,
    analysisType: "final_strategy",
    input: { classification, factualAcceptanceRate: latestStats?.acceptanceRate ?? null },
    output: finalStrategy,
  });

  return {
    universityProgramId,
    universityName: detail.university.name,
    programName: detail.displayName,
    classification,
    finalStrategy,
    scholarshipAnalysis,
    scores: {
      academic: academic.academic_score,
      extracurricular: extracurricular.extracurricular_score,
      programFit: majorFit.major_fit_score,
      requirementsFit: majorFit.requirements_fit_score,
      overall: Math.round(classification.competitivenessIndex) / 10,
    },
    factualAcceptanceRate: latestStats?.acceptanceRate ?? null,
  };
}
