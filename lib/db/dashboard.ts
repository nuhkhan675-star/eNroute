import { createClient } from "@/lib/supabase/server";
import type { Classification, ClassificationResult } from "@/lib/ai/classification";
import type { FinalStrategy } from "@/lib/ai/schemas";

export interface DashboardMatchCard {
  universityProgramId: string;
  universityId: string;
  universityName: string;
  city: string | null;
  countryName: string;
  photoUrl: string | null;
  programDisplayName: string;
  classification: Classification;
  likelihoodRangeLabel: string;
  confidence: ClassificationResult["confidence"];
  narrativeSummary: string;
  analyzedAt: string;
}

export async function getDashboardMatches(profileId: string): Promise<DashboardMatchCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_analyses")
    .select(
      `id, created_at, university_program_id, input_snapshot, output,
       university_programs(id, display_name, universities(id, name, city, photo_url, countries(name)))`
    )
    .eq("profile_id", profileId)
    .eq("analysis_type", "final_strategy")
    .not("university_program_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // One card per university_program_id -- keep only the most recent analysis.
  const seen = new Set<string>();
  const cards: DashboardMatchCard[] = [];
  for (const row of (data ?? []) as any[]) {
    if (seen.has(row.university_program_id)) continue;
    seen.add(row.university_program_id);

    const up = row.university_programs;
    if (!up) continue;
    const classification = row.input_snapshot?.classification as ClassificationResult | undefined;
    const output = row.output as FinalStrategy;
    if (!classification) continue;

    cards.push({
      universityProgramId: row.university_program_id,
      universityId: up.universities.id,
      universityName: up.universities.name,
      city: up.universities.city,
      photoUrl: up.universities.photo_url,
      countryName: up.universities.countries?.name ?? "",
      programDisplayName: up.display_name,
      classification: classification.classification,
      likelihoodRangeLabel: classification.likelihoodRangeLabel,
      confidence: classification.confidence,
      narrativeSummary: output.narrative,
      analyzedAt: row.created_at,
    });
  }

  const order: Record<Classification, number> = { reach: 0, target: 1, likely: 2 };
  return cards.sort((a, b) => order[a.classification] - order[b.classification]);
}
