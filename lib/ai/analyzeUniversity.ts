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
import { findSourcedAcceptanceRate } from "@/lib/ai/sourcedAcceptanceRate";
import { saveSourcedAcceptanceRate } from "@/lib/db/sourcedRates";

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
        requirements: d.requirements.map((r) => r.description),
        // Eligibility for an AI estimate is decided HERE, from real data,
        // before the model is called -- never by the model itself. Only a
        // university with no published rate and no ranking is offered up,
        // so an estimate can never displace a real signal.
        needsAcceptanceRateEstimate:
          d.admissionStatistics?.acceptanceRate == null && d.globalRank == null,
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

      // Before settling for an estimate, actually go and look for a real
      // published rate for this specific school. Only for universities with
      // neither a rate nor a ranking -- never re-researching the 754 US
      // schools that already carry Scorecard data. A hit is stored globally
      // (per university, not per student), so it is paid for once ever and
      // every later student gets it for free.
      let sourcedRate: number | null = null;
      if (detail.admissionStatistics?.acceptanceRate == null && detail.globalRank == null) {
        const sourced = await findSourcedAcceptanceRate(detail.name, detail.countryName);
        if (sourced) {
          try {
            await saveSourcedAcceptanceRate(id, sourced);
            sourcedRate = sourced.acceptanceRate;
            console.log(
              `[sourced-rate] ${detail.name}: ${sourced.acceptanceRate}% (${sourced.year}) <- ${sourced.sourceUrl}`
            );
          } catch (err) {
            console.error(`[sourced-rate] failed to persist ${detail.name}`, err);
          }
        }
      }

      const hasRealSignal =
        detail.admissionStatistics?.acceptanceRate != null ||
        detail.globalRank != null ||
        sourcedRate != null;
      // Only honour an estimate for universities we actually asked about.
      // If the model volunteered one for a school that already has real
      // data, drop it here rather than relying on getSelectivityTier's
      // ordering alone -- two independent guards, since this is the rule
      // that must never break.
      const aiEstimatedAcceptanceRate = hasRealSignal ? null : fit.estimated_acceptance_rate;

      const selectivity = getSelectivityTier({
        acceptanceRate: detail.admissionStatistics?.acceptanceRate ?? sourcedRate,
        acceptanceRateLevel:
          detail.admissionStatistics || sourcedRate != null ? "university" : null,
        globalRank: detail.globalRank,
        aiEstimatedAcceptanceRate,
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
          hasRequirementsOnRecord: detail.requirements.length > 0,
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
        // The rate the tier was actually computed from. A real sourced rate
        // when we have one; otherwise the model estimate, but ONLY when
        // selectivityBasis says "ai_estimate", so the UI can never present
        // an estimate as though it were published. Stays null for
        // rank_proxy and unknown, which have no rate at all.
        selectivityRate:
          detail.admissionStatistics?.acceptanceRate ??
          sourcedRate ??
          (selectivity.basis === "ai_estimate" ? aiEstimatedAcceptanceRate : null),
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
