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
export interface DimensionWeights {
  academic: number;
  requirementsFit: number;
  programFit: number;
  extracurricular: number;
  leadership: number;
  achievement: number;
}

/** US-style holistic review, and the fallback for any country without a profile. */
const DEFAULT_WEIGHTS: DimensionWeights = {
  academic: 0.3,
  requirementsFit: 0.25,
  programFit: 0.2,
  extracurricular: 0.15,
  leadership: 0.05,
  achievement: 0.05,
};

/**
 * Real, documented differences in how each admissions system evaluates
 * applicants. Applied identically to every university in that country -- this
 * is a country-level model, never a per-school override.
 *
 * A single global weighting could not express the thing that most distinguishes
 * these systems: a student with excellent grades and no extracurriculars is a
 * strong candidate in Australia and a weak one in the US, and the engine
 * previously scored them the same in both.
 *
 * Country keys must match countries.name exactly as seeded -- a mismatch falls
 * through to DEFAULT_WEIGHTS silently. Verified against the live table: the
 * app supports Australia, Hong Kong, India, Singapore, the United Kingdom and
 * the United States, and the last uses the default.
 *
 * - United Kingdom (UCAS): overwhelmingly grades and subject fit. The personal
 *   statement carries far less weight than a US application and
 *   extracurriculars are minor.
 * - Australia (ATAR-based direct entry): standard entry is a near-pure grades
 *   cutoff. Extracurriculars are essentially irrelevant to it, mattering only
 *   for separate equity and scholarship schemes this app does not model.
 * - Singapore (NUS/NTU/SMU): driven by each university's published Indicative
 *   Grade Profile. CCA and leadership are real but secondary -- more than
 *   Australia, well short of the US.
 * - Hong Kong (JUPAS): the HKDSE score against a programme's indicative
 *   admission score is the primary gate. The Student Learning Profile is real
 *   but secondary, much like Singapore.
 * - India: admission to the institutions this app can meaningfully assess
 *   (IITs, NITs and similar, via JoSAA) is a strict RANK-VERSUS-CUTOFF
 *   decision, not a holistic score at all. Extracurriculars play effectively no
 *   role. Treat this profile as an approximation: a weighted composite is the
 *   wrong shape for that system, and these weights only make it lean the right
 *   way rather than model it faithfully.
 */
const COUNTRY_WEIGHTS: Record<string, DimensionWeights> = {
  "United Kingdom": { academic: 0.4, requirementsFit: 0.35, programFit: 0.15, extracurricular: 0.06, leadership: 0.02, achievement: 0.02 },
  Australia: { academic: 0.55, requirementsFit: 0.3, programFit: 0.1, extracurricular: 0.03, leadership: 0.01, achievement: 0.01 },
  Singapore: { academic: 0.42, requirementsFit: 0.28, programFit: 0.16, extracurricular: 0.09, leadership: 0.03, achievement: 0.02 },
  "Hong Kong": { academic: 0.42, requirementsFit: 0.3, programFit: 0.15, extracurricular: 0.08, leadership: 0.03, achievement: 0.02 },
  India: { academic: 0.55, requirementsFit: 0.35, programFit: 0.06, extracurricular: 0.02, leadership: 0.01, achievement: 0.01 },
};

// Every profile must sum to 1, or that country's composites are silently
// scaled wrong for every student. Checked at module load so a typo fails
// immediately and loudly rather than skewing predictions unnoticed.
for (const [country, w] of Object.entries({ Default: DEFAULT_WEIGHTS, ...COUNTRY_WEIGHTS })) {
  const total = w.academic + w.requirementsFit + w.programFit + w.extracurricular + w.leadership + w.achievement;
  // Float arithmetic, so compare with a tolerance rather than to exactly 1.
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`Dimension weights for "${country}" sum to ${total}, not 1.`);
  }
}

/** Falls back to the default profile for any country without its own. */
export function resolveWeights(countryName: string | null | undefined): DimensionWeights {
  return (countryName ? COUNTRY_WEIGHTS[countryName] : undefined) ?? DEFAULT_WEIGHTS;
}

function computeCompositeScore(s: ProfileDimensionScores, weights: DimensionWeights): number {
  const composite =
    s.academicScore * weights.academic +
    s.requirementsFitScore * weights.requirementsFit +
    s.programFitScore * weights.programFit +
    s.extracurricularScore * weights.extracurricular +
    s.leadershipScore * weights.leadership +
    s.achievementScore * weights.achievement;
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

/**
 * How strongly a profile is allowed to move a school's real admission odds.
 * Applied in LOG-ODDS space, which is the standard way to shift a probability
 * without it running off either end: an average applicant (composite 50) sits
 * at the school's published rate, a stronger one is lifted, a weaker one
 * pushed down, and the result can never exceed 100% or go negative no matter
 * how extreme the profile.
 *
 * 1.2 is deliberately conservative. At Harvard's real 3.7%, a composite of 85
 * lands near 8% rather than the 14% the old tier-band produced -- a strong
 * applicant genuinely does beat the base rate at a hyper-selective school, but
 * not by the 4x the coarse band implied.
 */
const LOG_ODDS_GAIN = 1.2;

/**
 * Midpoint anchored on the school's ACTUAL published acceptance rate.
 *
 * This exists because the tier-band path above quantises the rate into five
 * buckets before the math ever sees it, and the tier is the only
 * school-specific input -- so every school inside one bucket returned an
 * identical percentage for a given student. Aurora (80.9%), Bowie (72.4%) and
 * Angelo State (83%) all sit in "low" and all returned the same number, which
 * made unrelated schools look like they had been individually analysed when
 * the rate had in fact been discarded.
 *
 * Anchoring on the real rate keeps the whole point of the tier system -- a
 * strong profile is still structurally capped at a selective school, because
 * the shift is relative to that school's own odds -- while letting genuinely
 * different schools produce genuinely different numbers.
 */
function midpointFromRealRate(composite: number, rate: number): number {
  // Clamp away from the asymptotes so logit() stays finite for 0% / 100%.
  const base = Math.min(0.995, Math.max(0.005, rate / 100));
  const logit = Math.log(base / (1 - base));
  const rawShift = LOG_ODDS_GAIN * ((composite - 50) / 50);

  // Deliberately ASYMMETRIC, and this is a product decision, not a modelling
  // nicety: over-estimating a student's chances is far more damaging than
  // under-estimating them. A number that comes in a little low reads as
  // conservative; one that comes in high and is wrong costs someone a
  // safety application.
  //
  // So downward shifts apply at full strength, while upward shifts are damped
  // -- and damped hardest exactly where the risk is worst, at the most
  // selective schools. At Harvard's 3.7% a strong profile lands near 5%
  // (~1.4x the base rate) rather than the 8% a symmetric shift gave, or the
  // 14% the old tier band gave. At an 80%-admit school the damping is
  // effectively 1.0 and nothing changes, because a lift there is genuinely
  // earned and carries no such downside.
  const upwardDamping = Math.min(1, 0.35 + base);
  const shifted = logit + (rawShift > 0 ? rawShift * upwardDamping : rawShift);

  const p = 1 / (1 + Math.exp(-shifted));
  return Math.min(97, Math.max(0.5, p * 100));
}

// ---- Step 3: confidence -- how much do we trust the underlying data? ----
export interface ConfidenceInput {
  selectivityBasis: SelectivityResult["basis"];
  acceptanceRateLevel: "program" | "university" | "faculty" | null;
  hasRequirementsOnRecord: boolean;
  hasCompleteProfile: boolean;
}

function computeConfidence(input: ConfidenceInput): PredictionConfidence {
  // "ai_estimate" is pinned to low alongside "unknown" -- deliberately, and
  // this is the single most important line in reinstating it. If it fell
  // through to the "moderate" default below, bringing the AI estimate back
  // would have NARROWED the displayed range (+/-8 instead of +/-13), making a
  // model's guess read as MORE certain than honestly admitting we have no
  // data. A figure with no published source behind it must widen the band,
  // never tighten it.
  if (
    input.selectivityBasis === "unknown" ||
    input.selectivityBasis === "ai_estimate" ||
    !input.hasCompleteProfile
  ) {
    return "low";
  }
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
  confidenceInput: Omit<ConfidenceInput, "selectivityBasis">,
  /** Selects the country's weighting profile. Null falls back to the default. */
  countryName?: string | null
): AdmissionPrediction {
  const weights = resolveWeights(countryName);
  const composite = computeCompositeScore(scores, weights);
  // Prefer the school's real published rate when we have one; fall back to the
  // tier band only for rank_proxy / ai_estimate / unknown, where there is no
  // real number to anchor to.
  const midpoint =
    selectivity.basis === "acceptance_rate" && selectivity.rate != null
      ? midpointFromRealRate(composite, selectivity.rate)
      : computeMidpoint(composite, selectivity.tier);
  const confidence = computeConfidence({ ...confidenceInput, selectivityBasis: selectivity.basis });
  const halfWidth = RANGE_HALF_WIDTH[confidence];

  const chanceMin = Math.max(0, Math.round(midpoint - halfWidth));
  let chanceMax = Math.min(100, Math.round(midpoint + halfWidth));

  // A weak profile at a school with a REAL published rate gets its midpoint
  // pushed below that rate on purpose (see midpointFromRealRate -- downward
  // shifts apply at full strength). But the range around the midpoint is
  // symmetric, and a weak profile also carries lower confidence and therefore a
  // wider half-width, so chanceMax could land back ABOVE the school's own
  // average -- quietly undoing the correction and leaving the optimistic end of
  // the range reading like a real shot.
  //
  // Clamp the top of the range to the rate itself in that case. It binds only
  // when the midpoint is genuinely below the rate AND the half-width would
  // otherwise carry the top back over it, so it corrects an overstatement
  // rather than compressing every range toward the rate. A midpoint at or
  // above the rate is the strong-profile case and is left alone: topping out
  // above the school's average is correct there.
  if (selectivity.basis === "acceptance_rate" && selectivity.rate != null && midpoint < selectivity.rate) {
    chanceMax = Math.min(chanceMax, Math.round(selectivity.rate));
  }

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
