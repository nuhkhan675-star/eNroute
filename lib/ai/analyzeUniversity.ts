import { getUniversitiesForAnalysis } from "@/lib/db/universities";
import { saveUniversityAnalysis, type UniversityAnalysisRecord } from "@/lib/db/analyses";
import { runUniversityFitAnalystBatch, type UniversityToAnalyze } from "@/lib/ai/agents/universityFitAnalyst";
import { getSelectivityTier } from "@/lib/ai/prediction/selectivity";
import { computeUcasTariffPoints, compareToTariffBand } from "@/lib/ai/prediction/ucasTariff";
import {
  computeAdmissionPrediction,
  resolveWeights,
  PREDICTION_MODEL_VERSION,
  PROGRAM_ANALYSIS_BATCH_SIZE,
} from "@/lib/ai/prediction/scoringEngine";
import type { FullStudentProfile } from "@/lib/db/profiles";
import type { AcademicAnalysis, ExtracurricularAnalysis } from "@/lib/ai/schemas";

// NOTE: the web-sourced acceptance-rate lookup (lib/ai/sourcedRateCore.ts) is
// deliberately NOT called from here. Each lookup is two web-search requests
// taking the better part of a minute, and this path runs for every university
// in a student's queue -- wiring it in made the dashboard sit at "0 of 20" for
// minutes. It belongs offline, in scripts/backfill-sourced-rates.mjs, whose
// results land in university_admission_statistics and are then read from here
// for free like any other real rate.
//
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

  // UCAS Tariff is only meaningful for A-levels. Computed once for the whole
  // run, since it depends on the student, not the university.
  const tariffPoints =
    profile.curriculum?.code === "A_LEVELS"
      ? computeUcasTariffPoints(profile.subjects.map((s) => s.grade))
      : null;

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
        // The comparison is done HERE, in code, and only its RESULT is given to
        // the model. Handing over raw points and asking it to judge fit would
        // put a deterministic arithmetic decision back in the model's hands,
        // which is exactly what the prediction engine exists to avoid.
        tariffAssessment: buildTariffAssessment(tariffPoints, d.requirements),
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

      const hasRealSignal =
        detail.admissionStatistics?.acceptanceRate != null || detail.globalRank != null;
      // Only honour an estimate for universities we actually asked about.
      // If the model volunteered one for a school that already has real
      // data, drop it here rather than relying on getSelectivityTier's
      // ordering alone -- two independent guards, since this is the rule
      // that must never break.
      const aiEstimatedAcceptanceRate = hasRealSignal ? null : fit.estimated_acceptance_rate;

      const selectivity = getSelectivityTier({
        acceptanceRate: detail.admissionStatistics?.acceptanceRate ?? null,
        acceptanceRateLevel: detail.admissionStatistics ? "university" : null,
        globalRank: detail.globalRank,
        countryName: detail.countryName,
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
        },
        // Selects the country's weighting profile -- see COUNTRY_WEIGHTS.
        detail.countryName
      );

      // Backend-only provenance for the scoring itself: which country profile
      // was applied and its six values. Logged rather than stored on the
      // record, so it cannot leak into any client payload -- the student sees
      // the category, range, confidence and reasoning, never the weights or
      // the composite behind them.
      const weightsUsed = resolveWeights(detail.countryName);
      console.log(
        `[scoring] ${detail.name} (${detail.countryName || "default"}) weights=${JSON.stringify(weightsUsed)} composite=${prediction.competitivenessComposite}`
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

/**
 * States, as a fact, where the student's UCAS Tariff total sits against a
 * university's published band. Returns null when either side is missing, so
 * the model is told nothing rather than something speculative.
 */
function buildTariffAssessment(
  points: number | null,
  requirements: { requirementType: string; minValue: number | null; maxValue: number | null }[]
): string | null {
  if (points == null) return null;
  const band = requirements.find((r) => r.requirementType === "ucas_tariff");
  if (!band) return null;

  const standing = compareToTariffBand(points, band.minValue, band.maxValue);
  if (!standing) return null;

  const range =
    band.minValue != null && band.maxValue != null
      ? `${band.minValue}-${band.maxValue}`
      : String(band.minValue ?? band.maxValue);

  const verdict = {
    above: "above the published band, so comfortably competitive on this measure",
    within: "inside the published band, so typical of admitted students on this measure",
    below: "below the published band, so behind most admitted students on this measure",
  }[standing];

  return `The student's A-levels total ${points} UCAS Tariff points. This university's published band for admitted students is ${range}. The student is ${verdict}. This comparison has already been computed -- state it, do not recalculate it.`;
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
