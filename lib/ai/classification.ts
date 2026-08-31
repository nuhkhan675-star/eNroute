// Deterministic Reach/Target/Likely classification. This is intentionally
// NOT an AI decision (see requirement: never claim a precise admission
// probability, never let the model invent a bucket). The Final Strategist
// agent is handed this bucket and must write a narrative consistent with it
// -- it cannot output a different classification or a point probability.

export type Classification = "reach" | "target" | "likely";
export type ConfidenceLevel = "high" | "moderate" | "low";

export interface ClassificationInput {
  academicScore: number; // 0-10, from Academic Analyst
  majorFitScore: number; // 0-10, from Major Fit Analyst
  extracurricularScore: number; // 0-10, from Extracurricular Analyst
  acceptanceRate: number | null; // 0-100, FACT from admission_statistics if available
  acceptanceRateConfidence: ConfidenceLevel | null; // confidence tagged on that fact
  hasSubjects: boolean;
  hasExtracurriculars: boolean;
}

export interface ClassificationResult {
  classification: Classification;
  likelihoodRangeLabel: string;
  confidence: ConfidenceLevel;
  competitivenessIndex: number; // 0-100, for display/debugging
}

const LIKELIHOOD_RANGES: Record<Classification, string> = {
  reach: "Estimated admission likelihood: 5–25%",
  target: "Estimated admission likelihood: 25–55%",
  likely: "Estimated admission likelihood: 55–85%",
};

export function classifyAdmissionLikelihood(input: ClassificationInput): ClassificationResult {
  const competitivenessIndex =
    (input.academicScore * 0.5 + input.majorFitScore * 0.3 + input.extracurricularScore * 0.2) * 10;

  let classification: Classification;
  if (input.acceptanceRate != null) {
    let likelyThreshold: number;
    let targetThreshold: number;
    if (input.acceptanceRate <= 15) {
      likelyThreshold = 85;
      targetThreshold = 65;
    } else if (input.acceptanceRate <= 40) {
      likelyThreshold = 75;
      targetThreshold = 55;
    } else {
      likelyThreshold = 60;
      targetThreshold = 40;
    }
    classification =
      competitivenessIndex >= likelyThreshold
        ? "likely"
        : competitivenessIndex >= targetThreshold
          ? "target"
          : "reach";
  } else {
    // No factual acceptance rate to anchor against -- lean more conservative.
    classification = competitivenessIndex >= 80 ? "likely" : competitivenessIndex >= 55 ? "target" : "reach";
  }

  const hasCompleteProfile = input.hasSubjects && input.hasExtracurriculars;
  let confidence: ConfidenceLevel;
  if (input.acceptanceRate != null && input.acceptanceRateConfidence === "high" && hasCompleteProfile) {
    confidence = "high";
  } else if (input.acceptanceRate != null || hasCompleteProfile) {
    confidence = "moderate";
  } else {
    confidence = "low";
  }

  return {
    classification,
    likelihoodRangeLabel: LIKELIHOOD_RANGES[classification],
    confidence,
    competitivenessIndex: Math.round(competitivenessIndex),
  };
}
