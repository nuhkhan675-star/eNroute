// Deterministic university/program selectivity classification. This is
// intentionally separate from the profile-scoring engine (scoringEngine.ts)
// and from prestige/ranking -- selectivity answers "how hard is it to get
// in at all," which is the single biggest input the old system was missing
// (a fixed competitiveness threshold applied the same way to every school,
// so a strong profile could cross into "Likely" at Stanford exactly as
// easily as at a school with a 70% acceptance rate).
//
// The same methodology applies to every university -- there is no
// school-specific logic anywhere in this file or in scoringEngine.ts.

export type SelectivityTier = "extreme" | "very_high" | "high" | "moderate" | "low";

export interface SelectivityInput {
  /** Best available acceptance rate for this program, 0-100, if we have real data on record. */
  acceptanceRate: number | null;
  /** Whether that rate is program-specific, university-wide, or absent. */
  acceptanceRateLevel: "program" | "university" | "faculty" | null;
  /** Best available QS-style global rank, used ONLY as a fallback proxy when no real rate exists. */
  globalRank: number | null;
  /**
   * A model-estimated acceptance rate, 0-100. Used ONLY as a last resort,
   * when there is neither a real published rate nor a ranking. Null whenever
   * we didn't ask for one, or the model declined to guess because it had no
   * genuine knowledge of the school -- declining is an expected outcome and
   * leaves us at "unknown", which is strictly more honest than a fabricated
   * number.
   */
  aiEstimatedAcceptanceRate?: number | null;
}

export interface SelectivityResult {
  tier: SelectivityTier;
  /**
   * The rate the tier was derived from, 0-100, when one exists. Carried
   * through so the scoring engine can anchor on the ACTUAL number instead of
   * re-deriving a coarse band from the tier -- two schools at 61% and 99%
   * share a tier but are not remotely equivalent, and collapsing them was
   * producing byte-identical predictions for unrelated schools.
   */
  rate: number | null;
  /**
   * Where the tier came from, in strict priority order: a real published
   * acceptance rate, then a ranking-derived proxy, then a model estimate,
   * then an honest "unknown".
   *
   * "ai_estimate" was removed once before (migration 0004) because the model
   * was forced to produce a rate for EVERY university, which manufactured
   * sourceless numbers. It is back under much tighter terms: it can only be
   * reached when both real signals are absent, the model is explicitly
   * allowed to decline, and it is pinned to "low" confidence and labelled
   * distinctly in the UI. It must never displace real data -- the ordering in
   * getSelectivityTier() below is what guarantees that.
   */
  basis: "acceptance_rate" | "rank_proxy" | "ai_estimate" | "unknown";
}

// Fixed acceptance-rate bands. These are the primary, reliable signal.
function tierFromAcceptanceRate(rate: number): SelectivityTier {
  if (rate <= 5) return "extreme";
  if (rate <= 15) return "very_high";
  if (rate <= 35) return "high";
  if (rate <= 60) return "moderate";
  return "low";
}

// A rank-based fallback is ONLY a weak proxy for "how selective is this
// school probably" when we have no real acceptance-rate data -- it is never
// used as a probability input (that would violate the "ranking must not
// directly determine admission probability" rule). Deliberately more
// conservative than the acceptance-rate bands: a rank alone can't
// distinguish an EXTREME school from a merely VERY_HIGH one reliably, so
// the top band here maps to VERY_HIGH, never EXTREME.
function tierFromRankProxy(rank: number): SelectivityTier {
  if (rank <= 50) return "very_high";
  if (rank <= 150) return "high";
  if (rank <= 400) return "moderate";
  return "low";
}

// A model-estimated rate is read through the SAME bands as a real rate --
// but capped so it can never claim EXTREME. Recall is decent for famous
// schools and poor for obscure ones, and the schools that reach this branch
// are by definition the ones we hold no data on, i.e. the obscure end. An
// estimate confident enough to put a school in the sub-5% bracket is exactly
// the kind of false precision this tier must not produce, so the top band is
// clamped to VERY_HIGH, mirroring the rank proxy's identical caution.
function tierFromAiEstimate(rate: number): SelectivityTier {
  const tier = tierFromAcceptanceRate(rate);
  return tier === "extreme" ? "very_high" : tier;
}

export function getSelectivityTier(input: SelectivityInput): SelectivityResult {
  // Priority order is the whole safety property of this function: real data
  // first, always. A model estimate can only ever fill a genuine vacuum.
  if (input.acceptanceRate != null) {
    return { tier: tierFromAcceptanceRate(input.acceptanceRate), basis: "acceptance_rate", rate: input.acceptanceRate };
  }
  if (input.globalRank != null) {
    return { tier: tierFromRankProxy(input.globalRank), basis: "rank_proxy", rate: null };
  }
  if (input.aiEstimatedAcceptanceRate != null) {
    return { tier: tierFromAiEstimate(input.aiEstimatedAcceptanceRate), basis: "ai_estimate", rate: input.aiEstimatedAcceptanceRate };
  }
  // No signal at all -- default to a mid-range guess rather than assuming
  // either extreme, and flag it as unknown so the confidence layer widens
  // the output range accordingly.
  return { tier: "moderate", basis: "unknown", rate: null };
}
