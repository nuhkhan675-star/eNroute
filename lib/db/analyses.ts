import { createClient } from "@/lib/supabase/server";
import { AI_MODEL } from "@/lib/ai/client";
import type { PredictionCategory, PredictionConfidence } from "@/lib/ai/prediction/scoringEngine";
import type { SelectivityTier, SelectivityResult } from "@/lib/ai/prediction/selectivity";

export type SelectivityBasis = SelectivityResult["basis"];

// Profile-level analyses only (academic, extracurricular) -- these are the
// two Gemini calls that run once per profile and are cached forever (until
// the profile changes). University-specific results live in
// university_analysis (below), not here.
export type AnalysisType = "academic" | "extracurricular";

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
  analysisType: AnalysisType;
  input: unknown;
  output: unknown;
  modelUsed?: string;
}): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("ai_analyses").insert({
    profile_id: params.profileId,
    university_program_id: null,
    analysis_type: params.analysisType,
    input_snapshot: params.input as never,
    output: params.output as never,
    model_used: params.modelUsed ?? AI_MODEL,
  });
  if (error) throw error;
}

export async function getLatestAnalysis(profileId: string, analysisType: AnalysisType): Promise<AiAnalysisRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_analyses")
    .select("*")
    .eq("profile_id", profileId)
    .eq("analysis_type", analysisType)
    .is("university_program_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AiAnalysisRow | null;
}

// ============================================================================
// university_analysis -- the canonical, structured prediction result for one
// (profile, program) pair. See lib/ai/prediction/scoringEngine.ts for how
// chanceMin/chanceMax/category/confidence are computed -- Gemini never
// produces these, only the qualitative scores/strengths/gaps that feed in.
// ============================================================================

export interface RecommendationItem {
  priority: "high" | "medium" | "low";
  tip: string;
}
export interface CandidateScholarship {
  name: string;
  likelihood: "high" | "moderate" | "low";
  reasoning: string;
}

export interface UniversityAnalysisRecord {
  profileId: string;
  universityId: string;
  universityName: string;
  city: string | null;
  countryName: string;
  photoUrl: string | null;
  chanceMin: number;
  chanceMax: number;
  category: PredictionCategory;
  selectivityLevel: SelectivityTier;
  /** Where the selectivity signal came from -- drives honest "(our estimate)" labelling in the UI. */
  selectivityBasis: SelectivityBasis;
  /** The acceptance rate actually used (real or estimated), 0-100, if any. */
  selectivityRate: number | null;
  academicScore: number;
  programFitScore: number;
  extracurricularScore: number;
  leadershipScore: number;
  achievementScore: number;
  requirementsFitScore: number;
  strengths: string[];
  gaps: string[];
  recommendations: RecommendationItem[];
  reasoning: string;
  confidence: PredictionConfidence;
  candidateScholarships: CandidateScholarship[];
  modelVersion: string;
  universityDataVersion: string | null;
  analyzedAt?: string;
}

export async function saveUniversityAnalysis(record: UniversityAnalysisRecord): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("university_analysis").upsert(
    {
      profile_id: record.profileId,
      university_id: record.universityId,
      chance_min: record.chanceMin,
      chance_max: record.chanceMax,
      category: record.category,
      selectivity_level: record.selectivityLevel,
      selectivity_basis: record.selectivityBasis,
      selectivity_rate: record.selectivityRate,
      academic_score: record.academicScore,
      program_fit_score: record.programFitScore,
      extracurricular_score: record.extracurricularScore,
      leadership_score: record.leadershipScore,
      achievement_score: record.achievementScore,
      requirements_fit_score: record.requirementsFitScore,
      strengths: record.strengths as never,
      gaps: record.gaps as never,
      recommendations: record.recommendations as never,
      candidate_scholarships: record.candidateScholarships as never,
      reasoning: record.reasoning,
      confidence: record.confidence,
      model_version: record.modelVersion,
      university_data_version: record.universityDataVersion,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,university_id" }
  );
  if (error) throw error;
}

function rowToRecord(row: any): UniversityAnalysisRecord {
  const u = row.universities;
  return {
    profileId: row.profile_id,
    universityId: u?.id ?? "",
    universityName: u?.name ?? "",
    city: u?.city ?? null,
    countryName: u?.countries?.name ?? "",
    photoUrl: u?.photo_url ?? null,
    chanceMin: row.chance_min,
    chanceMax: row.chance_max,
    category: row.category,
    selectivityLevel: row.selectivity_level,
    selectivityBasis: row.selectivity_basis ?? "unknown",
    selectivityRate: row.selectivity_rate,
    academicScore: row.academic_score,
    programFitScore: row.program_fit_score,
    extracurricularScore: row.extracurricular_score,
    leadershipScore: row.leadership_score,
    achievementScore: row.achievement_score,
    requirementsFitScore: row.requirements_fit_score,
    strengths: row.strengths ?? [],
    gaps: row.gaps ?? [],
    recommendations: row.recommendations ?? [],
    reasoning: row.reasoning,
    confidence: row.confidence,
    candidateScholarships: row.candidate_scholarships ?? [],
    modelVersion: row.model_version,
    universityDataVersion: row.university_data_version,
    analyzedAt: row.updated_at,
  };
}

const UNIVERSITY_ANALYSIS_SELECT = "*, universities(id, name, city, photo_url, countries(name))";

export async function getUniversityAnalysis(
  profileId: string,
  universityId: string
): Promise<UniversityAnalysisRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("university_analysis")
    .select(UNIVERSITY_ANALYSIS_SELECT)
    .eq("profile_id", profileId)
    .eq("university_id", universityId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data) : null;
}

// Batched (not per-card) lookup, keyed by university id. Used by the
// universities grid to show an estimate badge without a fresh AI call.
export async function getUniversityAnalysesByUniversity(
  profileId: string
): Promise<Record<string, UniversityAnalysisRecord>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("university_analysis")
    .select(UNIVERSITY_ANALYSIS_SELECT)
    .eq("profile_id", profileId);
  if (error) throw error;

  const map: Record<string, UniversityAnalysisRecord> = {};
  for (const row of (data ?? []) as any[]) {
    const record = rowToRecord(row);
    map[record.universityId] = record;
  }
  return map;
}

export async function getAllUniversityAnalysesForProfile(profileId: string): Promise<UniversityAnalysisRecord[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("university_analysis")
    .select(UNIVERSITY_ANALYSIS_SELECT)
    .eq("profile_id", profileId)
    .order("chance_min", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToRecord);
}

export async function deleteUniversityAnalysesForProfile(profileId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("university_analysis").delete().eq("profile_id", profileId);
  if (error) throw error;
}
