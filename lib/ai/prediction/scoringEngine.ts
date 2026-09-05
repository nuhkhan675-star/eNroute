import type { SelectivityResult, SelectivityTier } from "@/lib/ai/prediction/selectivity";

// ============================================================================
// CENTRALIZED ADMISSION-PREDICTION SCORING ENGINE
// ============================================================================
// This is the ONLY place in the codebase that decides an admission chance
// range or a Reach/Target/Likely category. Gemini never produces a
// probability -- it only produces the six 0-100 qualitative dimension
// scores that feed into computeAdmissionPrediction() below. Every weight
// and threshold here is a plain constant so the methodology can be read,
// audited, and tuned in one place rather than hunting for magic numbers
// scattered across the codebase.
//
// Core principle (this is what the old system got wrong): a student's
// profile quality and a university's selectivity are two separate axes.
// "Competitive applicant" is not the same thing as "likely to be admitted."
// A near-perfect profile at an EXTREME-selectivity school is structurally
// capped low; the same profile at a LOW-selectivity school is not. Ranking
// and prestige never enter this calculation directly -- only real
// acceptance-rate data (or, failing that, a clearly-flagged weak proxy) via
// the selectivity tier computed in selectivity.ts.
// ============================================================================

export const PREDICTION_MODEL_VERSION = "prediction-engine-v1";

// How many universities go into ONE Gemini call together (see
// lib/ai/agents/universityFitAnalyst.ts's runUniversityFitAnalystBatch). Kept small and
// centralized here (not buried in the agent file or the client component
// that queues work) so both the server batching logic and the client-side
// queue chunk work identically. 5 was chosen as a conservative balance:
// large enough that 50 relevant universities costs 10 Gemini calls instead
// of 50, small enough that per-item structured-output reliability doesn't
// degrade and a single call's output stays well under typical output-token
// limits. Exported here (not from the agent file, which pulls in
// server-only Gemini client code) so client components can import it too.
export const PROGRAM_ANALYSIS_BATCH_SIZE = 5;

export type PredictionCategory = "high_reach" | "reach" | "target" | "likely";
export type PredictionConfidence = "high" | "moderate" | "low";

export interface ProfileDimensionScores {
  /** All six on a 0-100 scale. */
  academicScore: number;
  programFitScore: number;
  extracurricularScore: number;
  leadershipScore: number;
  achievementScore: number;
  requirementsFitScore: number;
}

// ---- Step 1: weighted composite of the six dimensions (0-100) ----
// Academic strength and requirements fit are weighted heaviest because they
// are the most direct, verifiable measures of readiness; leadership and
// achievement are the smallest weights since they're the most subjective
// and most prone to inflation. These weights are fixed and apply to every
// student/university pair -- there is no per-university tuning.
const WEIGHTS = {
  academic: 0.3,
  requirementsFit: 0.25,
  programFit: 0.2,
  extracurricular: 0.15,
  leadership: 0.05,
  achievement: 0.05,
} as const;

function computeCompositeScore(s: ProfileDimensionScores): number {
  const composite =
    s.academicScore * WEIGHTS.academic +
    s.requirementsFitScore * WEIGHTS.requirementsFit +
    s.programFitScore * WEIGHTS.programFit +
    s.extracurricularScore * WEIGHTS.extracurricular +
    s.leadershipScore * WEIGHTS.leadership +
    s.achievementScore * WEIGHTS.achievement;
  return Math.max(0, Math.min(100, composite));
}

// ---- Step 2: map the composite through a tier-anchored curve ----
// Each selectivity tier has its own (floor, ceiling) for the midpoint
// admission chance. A composite of 100 (a flawless profile) still only
// reaches the tier's ceiling -- it never breaks out of the tier. This is
// the mechanism that makes "strong applicant" != "likely admitted" a
// structural property of the system rather than a hope. The bands below
// are deliberately conservative at the top end and were chosen so that a
// merely-strong (not flawless) profile at an EXTREME school lands in
// single-digit-to-low-teens, matching real-world elite-admissions base
// rates, while the same profile at a LOW-selectivity school lands
// comfortably in "likely" territory.
const TIER_BANDS: Record<SelectivityTier, { floor: number; ceiling: number }> = {
  extreme: { floor: 1, ceiling: 18 },
  very_high: { floor: 2, ceiling: 38 },
  high: { floor: 5, ceiling: 62 },
  moderate: { floor: 15, ceiling: 88 },
  low: { floor: 30, ceiling: 97 },
};

function computeMidpoint(composite: number, tier: SelectivityTier): number {
  const { floor, ceiling } = TIER_BANDS[tier];
  return floor + (ceiling - floor) * (composite / 100);
}

// ---- Step 3: confidence -- how much do we trust the underlying data? ----
export interface ConfidenceInput {
  selectivityBasis: SelectivityResult["basis"];
  acceptanceRateLevel: "program" | "university" | "faculty" | null;
  hasRequirementsOnRecord: boolean;
  hasCompleteProfile: boolean;
}

function computeConfidence(input: ConfidenceInput): PredictionConfidence {
  if (input.selectivityBasis === "unknown" || !input.hasCompleteProfile) return "low";
  const hasStrongSelectivityData =
    input.selectivityBasis === "acceptance_rate" && input.acceptanceRateLevel === "program";
  if (hasStrongSelectivityData && input.hasRequirementsOnRecord) return "high";
  return "moderate";
}

// Wider range = more honest about uncertainty. Never collapse to a single
// number -- a range is the whole point (Part 10/23 of the spec this
// implements: false precision is worse than a wider, honest band).
const RANGE_HALF_WIDTH: Record<PredictionConfidence, number> = {
  high: 5,
  moderate: 8,
  low: 13,
};

// ---- Step 4: category from where the midpoint lands ----
// Fixed thresholds, identical for every university -- the selectivity tier
// already shaped what midpoints are even reachable (see TIER_BANDS above),
// so an EXTREME-tier school can only ever land in high_reach/reach without
// this needing any school-specific override.
function computeCategory(midpoint: number): PredictionCategory {
  if (midpoint < 10) return "high_reach";
  if (midpoint < 30) return "reach";
  if (midpoint < 60) return "target";
  return "likely";
}

export interface AdmissionPrediction {
  chanceMin: number;
  chanceMax: number;
  category: PredictionCategory;
  confidence: PredictionConfidence;
  /** Exposed for debugging/audit -- not shown to the student as a bare number. */
  competitivenessComposite: number;
  midpoint: number;
}

export function computeAdmissionPrediction(
  scores: ProfileDimensionScores,
  selectivity: SelectivityResult,
  confidenceInput: Omit<ConfidenceInput, "selectivityBasis">
): AdmissionPrediction {
  const composite = computeCompositeScore(scores);
  const midpoint = computeMidpoint(composite, selectivity.tier);
  const confidence = computeConfidence({ ...confidenceInput, selectivityBasis: selectivity.basis });
  const halfWidth = RANGE_HALF_WIDTH[confidence];

  const chanceMin = Math.max(0, Math.round(midpoint - halfWidth));
  const chanceMax = Math.min(100, Math.round(midpoint + halfWidth));

  return {
    chanceMin,
    chanceMax,
    category: computeCategory(midpoint),
    confidence,
    competitivenessComposite: Math.round(composite),
    midpoint: Math.round(midpoint),
  };
}

// Single displayed percentage, derived from the stored range's midpoint.
// The range/confidence machinery above still computes and stores a real
// min/max (kept for future calibration and because narrower/wider spread is
// still meaningful internally) -- this is purely a presentation choice made
// explicitly by the user, who was told this trades away the
// never-a-bare-number principle used everywhere else in this file.
export function chancePoint(chanceMin: number, chanceMax: number): number {
  return Math.round((chanceMin + chanceMax) / 2);
}

export const CATEGORY_LABELS: Record<PredictionCategory, string> = {
  high_reach: "High Reach",
  reach: "Reach",
  target: "Target",
  likely: "Likely",
};
