import type { ScholarshipAnalysis } from "@/lib/ai/schemas";
import type { ScholarshipInput } from "@/lib/ai/agents/scholarshipAnalyst";

// Deterministic arithmetic -- the AI (Scholarship Analyst) only supplies a
// likelihood label per scholarship; every number here is either a fact from
// the DB (tuition, scholarship amount) or a bound computed from those facts.
// We report a range (best/worst case) rather than a single weighted-average
// point estimate, since a point estimate would imply false precision about
// which scholarships actually come through.

export interface CostEstimateResult {
  currency: string | null;
  tuitionAmount: number | null;
  bestCaseNetCost: number | null; // tuition minus every "high likelihood" scholarship
  worstCaseNetCost: number | null; // tuition with no scholarships applied
  notes: string[];
}

export function computeCostEstimate(
  tuitionInternationalAmount: number | null,
  tuitionCurrency: string | null,
  scholarships: ScholarshipInput[],
  scholarshipAnalysis: ScholarshipAnalysis
): CostEstimateResult {
  const notes: string[] = [];

  if (tuitionInternationalAmount == null) {
    notes.push("Tuition is not verified in our database yet, so a cost estimate is not available.");
    return {
      currency: tuitionCurrency,
      tuitionAmount: null,
      bestCaseNetCost: null,
      worstCaseNetCost: null,
      notes,
    };
  }

  const highLikelihoodNames = new Set(
    scholarshipAnalysis.candidate_scholarships
      .filter((s) => s.likelihood === "high")
      .map((s) => s.name)
  );

  const fixedHighLikelihoodOffset = scholarships
    .filter((s) => highLikelihoodNames.has(s.name) && s.amountType === "fixed" && s.amount != null)
    .reduce((sum, s) => sum + (s.amount ?? 0), 0);

  const hasVariableOrPercentageHighLikelihood = scholarships.some(
    (s) => highLikelihoodNames.has(s.name) && s.amountType !== "fixed"
  );
  if (hasVariableOrPercentageHighLikelihood) {
    notes.push(
      "One or more likely scholarships have a percentage or variable amount not reflected in the best-case figure below -- check the scholarship's own details."
    );
  }

  notes.push("Living expenses are not yet in our verified dataset and are not included in this estimate.");

  return {
    currency: tuitionCurrency,
    tuitionAmount: tuitionInternationalAmount,
    bestCaseNetCost: Math.max(0, tuitionInternationalAmount - fixedHighLikelihoodOffset),
    worstCaseNetCost: tuitionInternationalAmount,
    notes,
  };
}
