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

export const majorFitAnalysisSchema = z.object({
  major_fit_score: z.number().min(0).max(10),
  requirements_fit_score: z.number().min(0).max(10),
  academic_preparation: z.string(),
  extracurricular_relevance: z.string(),
  demonstrated_interest: z.string(),
  gaps: z.array(z.string()),
  summary: z.string(),
  confidence: confidenceSchema,
});
export type MajorFitAnalysis = z.infer<typeof majorFitAnalysisSchema>;

export const scholarshipAnalysisSchema = z.object({
  candidate_scholarships: z.array(
    z.object({
      name: z.string(),
      likelihood: z.enum(["high", "moderate", "low"]),
      reasoning: z.string(),
    })
  ),
  summary: z.string(),
  confidence: confidenceSchema,
});
export type ScholarshipAnalysis = z.infer<typeof scholarshipAnalysisSchema>;

export const classificationSchema = z.enum(["reach", "target", "likely"]);

export const improvementPrioritySchema = z.enum(["high", "medium", "low"]);

export const finalStrategySchema = z.object({
  classification: classificationSchema,
  narrative: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missing_profile_components: z.array(z.string()),
  improvement_tips: z.array(
    z.object({
      priority: improvementPrioritySchema,
      tip: z.string(),
    })
  ),
  confidence: confidenceSchema,
});
export type FinalStrategy = z.infer<typeof finalStrategySchema>;

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
