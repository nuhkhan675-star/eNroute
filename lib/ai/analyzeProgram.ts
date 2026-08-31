import { getUniversityProgramDetail } from "@/lib/db/universities";
import { saveAnalysis } from "@/lib/db/analyses";
import { runScholarshipAnalyst } from "@/lib/ai/agents/scholarshipAnalyst";
import { runFinalStrategist } from "@/lib/ai/agents/finalStrategist";
import { classifyAdmissionLikelihood } from "@/lib/ai/classification";
import { computeCostEstimate } from "@/lib/ai/costEstimate";
import type { FullStudentProfile } from "@/lib/db/profiles";
import type { AcademicAnalysis, ExtracurricularAnalysis, MajorFitAnalysis } from "@/lib/ai/schemas";

export interface ProgramAnalysisResult {
  universityProgramId: string;
  universityName: string;
  programName: string;
  classification: ReturnType<typeof classifyAdmissionLikelihood>;
  finalStrategy: Awaited<ReturnType<typeof runFinalStrategist>>;
  scholarshipAnalysis: Awaited<ReturnType<typeof runScholarshipAnalyst>>;
  costEstimate: ReturnType<typeof computeCostEstimate>;
  factualAcceptanceRate: number | null;
}

// Runs the university-specific half of the pipeline (steps 5-6 of the
// orchestration) for one candidate program: scholarship analysis, cost
// estimate, deterministic classification, final strategist -- and persists
// each to ai_analyses. Reused both by the bulk orchestrator (top-N matches)
// and by the "Analyze My Chances" button on a single program page.
export async function analyzeUniversityProgram(params: {
  profile: FullStudentProfile;
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  majorFit: MajorFitAnalysis;
  universityProgramId: string;
}): Promise<ProgramAnalysisResult | null> {
  const { profile, academic, extracurricular, majorFit, universityProgramId } = params;

  const detail = await getUniversityProgramDetail(universityProgramId);
  if (!detail) return null;

  const latestStats = [...detail.admissionStatistics].sort((a, b) => b.year - a.year)[0] ?? null;
  const latestTuition = [...detail.tuition].sort((a, b) => b.year - a.year)[0] ?? null;

  const scholarshipInputs = detail.scholarships.map((s) => ({
    name: s.name,
    amountType: s.amountType,
    amount: s.amount,
    currency: s.currency,
    eligibilityText: s.eligibilityText,
  }));

  const scholarshipAnalysis = await runScholarshipAnalyst(profile, academic, extracurricular, scholarshipInputs);
  await saveAnalysis({
    profileId: profile.id,
    universityProgramId,
    analysisType: "scholarship",
    input: { scholarshipInputs },
    output: scholarshipAnalysis,
  });

  const costEstimate = computeCostEstimate(
    latestTuition?.internationalAmount ?? null,
    latestTuition?.currency ?? null,
    scholarshipInputs,
    scholarshipAnalysis
  );
  await saveAnalysis({
    profileId: profile.id,
    universityProgramId,
    analysisType: "cost",
    input: { latestTuition },
    output: costEstimate,
    modelUsed: "deterministic-cost-calc",
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
    costEstimate,
    factualAcceptanceRate: latestStats?.acceptanceRate ?? null,
  };
}
