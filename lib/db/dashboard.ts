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
  analyzedAt?: string;
}

const CATEGORY_ORDER: Record<UniversityAnalysisRecord["category"], number> = {
  high_reach: 0,
  reach: 1,
  target: 2,
  likely: 3,
};

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
      analyzedAt: r.analyzedAt,
    }))
    .sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]);
}
