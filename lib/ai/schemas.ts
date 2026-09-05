import { z } from "zod";

export const confidenceSchema = z.enum(["high", "moderate", "low"]);

export const academicAnalysisSchema = z.object({
  academic_score: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  summary: z.string(),
  confidence: confidenceSchema,
});
export type AcademicAnalysis = z.infer<typeof academicAnalysisSchema>;

export const extracurricularAnalysisSchema = z.object({
  extracurricular_score: z.number().min(0).max(10),
  leadership_score: z.number().min(0).max(10),
  commitment_score: z.number().min(0).max(10),
  impact_score: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  summary: z.string(),
  confidence: confidenceSchema,
});
export type ExtracurricularAnalysis = z.infer<typeof extracurricularAnalysisSchema>;

// Gemini's ONLY job for a specific program is qualitative assessment --
// program_fit and requirements_fit are the two scores it produces (academic,
// extracurricular, leadership and achievement scores all come from the
// already-cached, profile-level academic/extracurricular analyses instead of
// being asked for again). It must NEVER state or imply an admission
// probability or percentage -- that is computed separately by the
// deterministic scoring engine in lib/ai/prediction/, which is the only
// place a chance range or Reach/Target/Likely category is decided.
export const improvementPrioritySchema = z.enum(["high", "medium", "low"]);

export const programFitAnalysisSchema = z.object({
  program_fit_score: z.number().min(0).max(10),
  requirements_fit_score: z.number().min(0).max(10),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  improvement_recommendations: z.array(
    z.object({
      priority: improvementPrioritySchema,
      tip: z.string(),
    })
  ),
  candidate_scholarships: z.array(
    z.object({
      name: z.string(),
      likelihood: z.enum(["high", "moderate", "low"]),
      reasoning: z.string(),
    })
  ),
  reasoning: z.string(),
  confidence: confidenceSchema,
});
export type ProgramFitAnalysis = z.infer<typeof programFitAnalysisSchema>;

// True multi-university batching: one Gemini call evaluates several
// universities at once against the same (already-included-once) profile,
// instead of one call per university. university_id lets the caller map
// each returned entry back to the right university -- Gemini is told
// explicitly to return exactly one entry per university it was given,
// keyed by that id, never more or fewer.
export const programFitBatchItemSchema = programFitAnalysisSchema.extend({
  university_id: z.string(),
});
export const programFitBatchResponseSchema = z.object({
  analyses: z.array(programFitBatchItemSchema),
});
export type ProgramFitBatchItem = z.infer<typeof programFitBatchItemSchema>;

export const proposeProfileUpdateSchema = z.object({
  kind: z.enum(["extracurricular", "subject_grade"]),
  summary: z.string(),
  extracurricular: z
    .object({
      activityName: z.string(),
      category: z.enum([
        "sports",
        "leadership",
        "volunteering",
        "entrepreneurship",
        "research",
        "internship",
        "academic_competition",
        "arts",
        "music",
        "technology",
        "community_service",
        "student_organization",
        "work_experience",
        "other",
      ]),
      role: z.string().optional(),
      yearsInvolved: z.number().optional(),
      description: z.string().optional(),
      achievements: z.string().optional(),
      impact: z.string().optional(),
    })
    .optional(),
});
export type ProposeProfileUpdate = z.infer<typeof proposeProfileUpdateSchema>;
