import { getAllUniversityAnalysesForProfile } from "@/lib/db/analyses";
import type { UniversityAnalysisRecord } from "@/lib/db/analyses";

export interface DashboardMatchCard {
  universityId: string;
  universityName: string;
  city: string | null;
  countryName: string;
  photoUrl: string | null;
  category: UniversityAnalysisRecord["category"];
  chanceMin: number;
  chanceMax: number;
  confidence: UniversityAnalysisRecord["confidence"];
  reasoning: string;
  /** Drives the honest source label on the card -- see UniversityMatchCard. */
  selectivityBasis: UniversityAnalysisRecord["selectivityBasis"];
  analyzedAt?: string;
}

const CATEGORY_ORDER: Record<UniversityAnalysisRecord["category"], number> = {
  high_reach: 0,
  reach: 1,
  target: 2,
  likely: 3,
};

/**
 * The recommended feed. Deliberately limited to universities backed by a real
 * published acceptance rate or a world ranking.
 *
 * Analyses resting on a model estimate are still computed, stored and shown
 * wherever the student asked for that specific school -- search, the
 * university's own page -- with the estimate labelled. They are just not
 * surfaced as recommendations, because a suggestion the system cannot evidence
 * carries the same visual weight as one it can, and that is the part that
 * misleads. Older estimate-based rows already in the table are filtered here
 * rather than deleted, so nothing the student previously looked at is lost.
 */
export async function getDashboardMatches(profileId: string): Promise<DashboardMatchCard[]> {
  const records = await getAllUniversityAnalysesForProfile(profileId);
  return records
    .filter((r) => r.selectivityBasis === "acceptance_rate" || r.selectivityBasis === "rank_proxy")
    .map((r) => ({
      universityId: r.universityId,
      universityName: r.universityName,
      city: r.city,
      countryName: r.countryName,
      photoUrl: r.photoUrl,
      category: r.category,
      chanceMin: r.chanceMin,
      chanceMax: r.chanceMax,
      confidence: r.confidence,
      reasoning: r.reasoning,
      selectivityBasis: r.selectivityBasis,
      analyzedAt: r.analyzedAt,
    }))
    .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
}
