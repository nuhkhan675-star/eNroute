import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/ai/client";

export type AnalysisType =
  | "academic"
  | "extracurricular"
  | "major_fit"
  | "scholarship"
  | "cost"
  | "final_strategy";

export interface AiAnalysisRow {
  id: string;
  profile_id: string;
  university_program_id: string | null;
  analysis_type: AnalysisType;
  input_snapshot: unknown;
  output: unknown;
  model_used: string;
  created_at: string;
}

export async function saveAnalysis(params: {
  profileId: string;
  universityProgramId?: string | null;
  analysisType: AnalysisType;
  input: unknown;
  output: unknown;
  modelUsed?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_analyses").insert({
    profile_id: params.profileId,
    university_program_id: params.universityProgramId ?? null,
    analysis_type: params.analysisType,
    input_snapshot: params.input as never,
    output: params.output as never,
    model_used: params.modelUsed ?? AI_MODEL,
  });
  if (error) throw error;
}

export async function getLatestAnalysis(
  profileId: string,
  analysisType: AnalysisType,
  universityProgramId: string | null = null
): Promise<AiAnalysisRow | null> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_analyses")
    .select("*")
    .eq("profile_id", profileId)
    .eq("analysis_type", analysisType)
    .order("created_at", { ascending: false })
    .limit(1);

  query = universityProgramId
    ? query.eq("university_program_id", universityProgramId)
    : query.is("university_program_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as AiAnalysisRow | null;
}

export interface ProgramAnalysisBundle {
  classification: import("@/lib/ai/classification").ClassificationResult;
  finalStrategy: import("@/lib/ai/schemas").FinalStrategy;
  scholarshipAnalysis: import("@/lib/ai/schemas").ScholarshipAnalysis | null;
  costEstimate: import("@/lib/ai/costEstimate").CostEstimateResult | null;
  analyzedAt: string;
}

export async function getProgramAnalysisBundle(
  profileId: string,
  universityProgramId: string
): Promise<ProgramAnalysisBundle | null> {
  const [finalStrategyRow, scholarshipRow, costRow] = await Promise.all([
    getLatestAnalysis(profileId, "final_strategy", universityProgramId),
    getLatestAnalysis(profileId, "scholarship", universityProgramId),
    getLatestAnalysis(profileId, "cost", universityProgramId),
  ]);
  if (!finalStrategyRow) return null;

  return {
    classification: (finalStrategyRow.input_snapshot as any)?.classification,
    finalStrategy: finalStrategyRow.output as import("@/lib/ai/schemas").FinalStrategy,
    scholarshipAnalysis: (scholarshipRow?.output as import("@/lib/ai/schemas").ScholarshipAnalysis) ?? null,
    costEstimate: (costRow?.output as import("@/lib/ai/costEstimate").CostEstimateResult) ?? null,
    analyzedAt: finalStrategyRow.created_at,
  };
}

export async function getAllFinalStrategiesForProfile(profileId: string): Promise<AiAnalysisRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("profile_id", profileId)
    .eq("analysis_type", "final_strategy")
    .not("university_program_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AiAnalysisRow[]) ?? [];
}
