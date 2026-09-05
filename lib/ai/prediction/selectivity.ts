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
}

export interface SelectivityResult {
  tier: SelectivityTier;
  /**
   * Whether the tier came from a real published acceptance rate or a
   * rank-based proxy. There is deliberately no "AI estimate" state: asking a
   * model to invent a plausible-sounding acceptance rate produces a number
   * with no source, no URL and no date, which the rest of this app's
   * data-provenance rules forbid.
   */
  basis: "acceptance_rate" | "rank_proxy" | "unknown";
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

export function getSelectivityTier(input: SelectivityInput): SelectivityResult {
  if (input.acceptanceRate != null) {
    return { tier: tierFromAcceptanceRate(input.acceptanceRate), basis: "acceptance_rate" };
  }
  if (input.globalRank != null) {
    return { tier: tierFromRankProxy(input.globalRank), basis: "rank_proxy" };
  }
  // No signal at all -- default to a mid-range guess rather than assuming
  // either extreme, and flag it as unknown so the confidence layer widens
  // the output range accordingly.
  return { tier: "moderate", basis: "unknown" };
}
