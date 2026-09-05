import { getUniversitiesForAnalysis } from "@/lib/db/universities";
import { saveUniversityAnalysis, type UniversityAnalysisRecord } from "@/lib/db/analyses";
import { runUniversityFitAnalystBatch, type UniversityToAnalyze } from "@/lib/ai/agents/universityFitAnalyst";
import { getSelectivityTier } from "@/lib/ai/prediction/selectivity";
import {
  computeAdmissionPrediction,
  PREDICTION_MODEL_VERSION,
  PROGRAM_ANALYSIS_BATCH_SIZE,
} from "@/lib/ai/prediction/scoringEngine";
import type { FullStudentProfile } from "@/lib/db/profiles";
import type { AcademicAnalysis, ExtracurricularAnalysis } from "@/lib/ai/schemas";

// Runs the university-specific half of the pipeline for a LIST of candidate
// universities, batching several into each Gemini call
// (runUniversityFitAnalystBatch) instead of one call per university -- the
// student's profile is included once per batch, not once per university.
// The deterministic scoring engine (never Gemini) then decides each one's
// chance range and category. A university with zero programs on record is
// just as analyzable as one with several -- programs/specialities are
// descriptive context only, never a gate. Reused by the dashboard's
// auto-analysis queue (typically many universities) and by the "Analyze My
// Chances" button on a single university page (a batch of one) -- same
// pipeline, same methodology, everywhere.
export async function analyzeUniversities(params: {
  profile: FullStudentProfile;
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  universityIds: string[];
}): Promise<UniversityAnalysisRecord[]> {
  const { profile, academic, extracurricular, universityIds } = params;
  if (universityIds.length === 0) return [];

  const details = await getUniversitiesForAnalysis(universityIds);
  const validIds = universityIds.filter((id) => details.has(id));

  const results: UniversityAnalysisRecord[] = [];

  for (let i = 0; i < validIds.length; i += PROGRAM_ANALYSIS_BATCH_SIZE) {
    const batchIds = validIds.slice(i, i + PROGRAM_ANALYSIS_BATCH_SIZE);
    const toAnalyze: UniversityToAnalyze[] = batchIds.map((id) => {
      const d = details.get(id)!;
      return {
        universityId: id,
        universityName: d.name,
        specialities: d.specialities,
        knownPrograms: d.programs.map((p) => p.displayName),
      };
    });

    const fitById = await runUniversityFitAnalystBatch({ academic, extracurricular, universities: toAnalyze });

    for (const id of batchIds) {
      const detail = details.get(id)!;
      const fit = fitById.get(id);
      if (!fit) {
        // Gemini dropped this one from the batch response -- skip it rather
        // than fail the whole batch; it just stays unanalyzed and can be
        // retried (e.g. next time the dashboard queue runs).
        console.error(`Batch response missing entry for university_id=${id}`);
        continue;
      }

      const selectivity = getSelectivityTier({
        acceptanceRate: detail.admissionStatistics?.acceptanceRate ?? null,
        acceptanceRateLevel: detail.admissionStatistics ? "university" : null,
        globalRank: detail.globalRank,
      });

      const prediction = computeAdmissionPrediction(
        {
          academicScore: academic.academic_score * 10,
          programFitScore: fit.program_fit_score * 10,
          extracurricularScore: extracurricular.extracurricular_score * 10,
          leadershipScore: extracurricular.leadership_score * 10,
          achievementScore: extracurricular.impact_score * 10,
          requirementsFitScore: fit.requirements_fit_score * 10,
        },
        selectivity,
        {
          acceptanceRateLevel: detail.admissionStatistics ? "university" : null,
          hasRequirementsOnRecord: false,
          hasCompleteProfile: profile.subjects.length > 0 && profile.extracurriculars.length > 0,
        }
      );

      const record: UniversityAnalysisRecord = {
        profileId: profile.id,
        universityId: id,
        universityName: detail.name,
        city: detail.city,
        countryName: detail.countryName,
        photoUrl: detail.photoUrl,
        chanceMin: prediction.chanceMin,
        chanceMax: prediction.chanceMax,
        category: prediction.category,
        selectivityLevel: selectivity.tier,
        selectivityBasis: selectivity.basis,
        // Only ever a real, sourced rate -- never a derived or invented one.
        selectivityRate: detail.admissionStatistics?.acceptanceRate ?? null,
        academicScore: Math.round(academic.academic_score * 10),
        programFitScore: Math.round(fit.program_fit_score * 10),
        extracurricularScore: Math.round(extracurricular.extracurricular_score * 10),
        leadershipScore: Math.round(extracurricular.leadership_score * 10),
        achievementScore: Math.round(extracurricular.impact_score * 10),
        requirementsFitScore: Math.round(fit.requirements_fit_score * 10),
        strengths: fit.strengths,
        gaps: fit.gaps,
        recommendations: fit.improvement_recommendations,
        reasoning: fit.reasoning,
        confidence: prediction.confidence,
        candidateScholarships: fit.candidate_scholarships,
        modelVersion: PREDICTION_MODEL_VERSION,
        universityDataVersion: detail.admissionStatistics
          ? `stats:${detail.admissionStatistics.year}`
          : detail.globalRank
            ? `rank:${detail.globalRank}`
            : null,
      };

      await saveUniversityAnalysis(record);
      results.push(record);
    }
  }

  return results;
}

// Single-university convenience wrapper (used by the "Analyze My Chances"
// button) -- internally just a batch of one, so it goes through the exact
// same pipeline as the bulk dashboard queue.
export async function analyzeUniversity(params: {
  profile: FullStudentProfile;
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  universityId: string;
}): Promise<UniversityAnalysisRecord | null> {
  const results = await analyzeUniversities({
    ...params,
    universityIds: [params.universityId],
  });
  return results[0] ?? null;
}
