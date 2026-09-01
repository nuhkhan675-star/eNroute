import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/ai/client";

export type AnalysisType = "academic" | "extracurricular" | "major_fit" | "scholarship" | "final_strategy";

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

export interface ModelAssessmentScores {
  academic: number;
  extracurricular: number;
  programFit: number;
  requirementsFit: number;
  overall: number;
}

export interface ProgramAnalysisBundle {
  classification: import("@/lib/ai/classification").ClassificationResult;
  finalStrategy: import("@/lib/ai/schemas").FinalStrategy;
  scholarshipAnalysis: import("@/lib/ai/schemas").ScholarshipAnalysis | null;
  scores: ModelAssessmentScores | null;
  analyzedAt: string;
}

export async function getProgramAnalysisBundle(
  profileId: string,
  universityProgramId: string
): Promise<ProgramAnalysisBundle | null> {
  const [finalStrategyRow, scholarshipRow, majorFitRow, academicRow, extracurricularRow] = await Promise.all([
    getLatestAnalysis(profileId, "final_strategy", universityProgramId),
    getLatestAnalysis(profileId, "scholarship", universityProgramId),
    getLatestAnalysis(profileId, "major_fit", universityProgramId),
    getLatestAnalysis(profileId, "academic"),
    getLatestAnalysis(profileId, "extracurricular"),
  ]);
  if (!finalStrategyRow) return null;

  const classification = (finalStrategyRow.input_snapshot as any)?.classification as
    | import("@/lib/ai/classification").ClassificationResult
    | undefined;
  const majorFit = majorFitRow?.output as import("@/lib/ai/schemas").MajorFitAnalysis | undefined;
  const academic = academicRow?.output as import("@/lib/ai/schemas").AcademicAnalysis | undefined;
  const extracurricular = extracurricularRow?.output as import("@/lib/ai/schemas").ExtracurricularAnalysis | undefined;

  const scores: ModelAssessmentScores | null =
    majorFit && typeof majorFit.requirements_fit_score === "number" && academic && extracurricular && classification
      ? {
          academic: academic.academic_score,
          extracurricular: extracurricular.extracurricular_score,
          programFit: majorFit.major_fit_score,
          requirementsFit: majorFit.requirements_fit_score,
          overall: Math.round(classification.competitivenessIndex) / 10,
        }
      : null;

  return {
    classification: classification as import("@/lib/ai/classification").ClassificationResult,
    finalStrategy: finalStrategyRow.output as import("@/lib/ai/schemas").FinalStrategy,
    scholarshipAnalysis: (scholarshipRow?.output as import("@/lib/ai/schemas").ScholarshipAnalysis) ?? null,
    scores,
    analyzedAt: finalStrategyRow.created_at,
  };
}

export interface CachedChanceEstimate {
  classification: import("@/lib/ai/classification").Classification;
  likelihoodRangeLabel: string;
  confidence: string;
  programName: string | null;
  whySnippet: string | null;
}

// Cheap, no-AI-call lookup: which universities has this student already had
// their chances computed for, keyed by university id. Used to show an
// estimate badge on university list cards without triggering fresh AI
// analysis for every card on the page.
export async function getCachedChanceEstimatesByUniversity(
  profileId: string
): Promise<Record<string, CachedChanceEstimate>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("created_at, input_snapshot, output, university_programs(university_id, display_name)")
    .eq("profile_id", profileId)
    .eq("analysis_type", "final_strategy")
    .not("university_program_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const map: Record<string, CachedChanceEstimate> = {};
  for (const row of (data ?? []) as any[]) {
    const universityId = row.university_programs?.university_id;
    if (!universityId || map[universityId]) continue;
    const classification = row.input_snapshot?.classification;
    if (!classification) continue;
    const narrative: string | undefined = row.output?.narrative;
    map[universityId] = {
      classification: classification.classification,
      likelihoodRangeLabel: classification.likelihoodRangeLabel,
      confidence: classification.confidence,
      programName: row.university_programs?.display_name ?? null,
      whySnippet: narrative ? narrative.split(/(?<=[.!?])\s/)[0] : null,
    };
  }
  return map;
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
