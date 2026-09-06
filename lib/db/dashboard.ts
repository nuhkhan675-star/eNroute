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
 * Every analysis for the profile, evidenced and estimated alike, each carrying
 * its selectivityBasis. The split is made in the UI rather than here: matches
 * backed by a published rate or a ranking are shown by default, and the rest
 * sit behind an explicit control, so a student can still reach them without
 * estimates quietly carrying the same visual weight as real data.
 */
export async function getDashboardMatches(profileId: string): Promise<DashboardMatchCard[]> {
  const records = await getAllUniversityAnalysesForProfile(profileId);
  return records
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
