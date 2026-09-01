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

// Each bucket's displayable range is not one fixed string for everyone in
// the bucket -- it's a ~18-point-wide band positioned by where the student's
// competitivenessIndex falls WITHIN that bucket's own threshold span, so two
// "Reach" students with very different scores don't both see "5-25%".
const BUCKET_DISPLAY_BOUNDS: Record<Classification, [number, number]> = {
  reach: [2, 30],
  target: [22, 62],
  likely: [55, 92],
};
const BAND_WIDTH = 18;

function bandFor(classification: Classification, t: number): string {
  const [lo, hi] = BUCKET_DISPLAY_BOUNDS[classification];
  const clampedT = Math.max(0, Math.min(1, t));
  const center = lo + (hi - lo) * clampedT;
  const half = BAND_WIDTH / 2;
  const bandLo = Math.round(Math.max(lo, center - half));
  const bandHi = Math.round(Math.min(hi, center + half));
  return `Estimated admission likelihood: ${bandLo}–${bandHi}%`;
}

export function classifyAdmissionLikelihood(input: ClassificationInput): ClassificationResult {
  const competitivenessIndex =
    (input.academicScore * 0.5 + input.majorFitScore * 0.3 + input.extracurricularScore * 0.2) * 10;

  let likelyThreshold: number;
  let targetThreshold: number;
  if (input.acceptanceRate != null) {
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
  } else {
    // No factual acceptance rate to anchor against. These thresholds are
    // intentionally more forgiving than a data-anchored program, since a
    // solid-but-imperfect profile shouldn't default to "Reach" just because
    // we have no acceptance-rate fact to compare it against.
    likelyThreshold = 72;
    targetThreshold = 45;
  }

  const classification: Classification =
    competitivenessIndex >= likelyThreshold ? "likely" : competitivenessIndex >= targetThreshold ? "target" : "reach";

  // Position within the bucket's own threshold span (0 = just crossed into
  // this bucket, 1 = at the top of it) drives where the display band sits.
  let t: number;
  if (classification === "likely") {
    t = (competitivenessIndex - likelyThreshold) / Math.max(1, 100 - likelyThreshold);
  } else if (classification === "target") {
    t = (competitivenessIndex - targetThreshold) / Math.max(1, likelyThreshold - targetThreshold);
  } else {
    t = competitivenessIndex / Math.max(1, targetThreshold);
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
    likelihoodRangeLabel: bandFor(classification, t),
    confidence,
    competitivenessIndex: Math.round(competitivenessIndex),
  };
}
