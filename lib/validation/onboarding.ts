import { z } from "zod";

export const subjectEntrySchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  level: z.string().nullable(),
  grade: z.string().min(1, "Grade is required"),
});
export type SubjectEntry = z.infer<typeof subjectEntrySchema>;

export const grade10SubjectEntrySchema = z.object({
  id: z.string(), // client-side draft id
  subjectName: z.string().min(1, "Subject name is required"),
  grade: z.string().min(1, "Grade is required"),
});
export type Grade10SubjectEntry = z.infer<typeof grade10SubjectEntrySchema>;

// Grade 9 and 11 use the identical shape -- optional secondary-school layers
// alongside the required Grade 10 above.
export const grade9SubjectEntrySchema = grade10SubjectEntrySchema;
export type Grade9SubjectEntry = z.infer<typeof grade9SubjectEntrySchema>;
export const grade11SubjectEntrySchema = grade10SubjectEntrySchema;
export type Grade11SubjectEntry = z.infer<typeof grade11SubjectEntrySchema>;

export const extracurricularCategories = [
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
] as const;

export const extracurricularEntrySchema = z.object({
  id: z.string(), // client-side draft id
  activityName: z.string().min(1, "Activity name is required"),
  category: z.enum(extracurricularCategories),
  role: z.string().optional(),
  yearsInvolved: z.number().min(0).max(10).optional(),
  description: z.string().optional(),
  achievements: z.string().optional(),
  impact: z.string().optional(),
});
export type ExtracurricularEntry = z.infer<typeof extracurricularEntrySchema>;

export const examTypes = [
  "SAT",
  "SAT_MATH",
  "SAT_READING_WRITING",
  "ACT",
  "IELTS",
  "TOEFL_IBT",
  "DUOLINGO",
  "GRE",
  "GMAT",
  "PTE_ACADEMIC",
  "OTHER",
] as const;

export const EXAM_LABELS: Record<(typeof examTypes)[number], string> = {
  SAT: "SAT (combined/other)",
  SAT_MATH: "SAT Math",
  SAT_READING_WRITING: "SAT Reading & Writing",
  ACT: "ACT",
  IELTS: "IELTS",
  TOEFL_IBT: "TOEFL iBT",
  DUOLINGO: "Duolingo English Test",
  GRE: "GRE",
  GMAT: "GMAT",
  PTE_ACADEMIC: "PTE Academic",
  OTHER: "Other",
};

export const examScoreEntrySchema = z.object({
  id: z.string(), // client-side draft id
  examType: z.enum(examTypes),
  score: z.string().min(1, "Score is required"),
});
export type ExamScoreEntry = z.infer<typeof examScoreEntrySchema>;

export const climateOptions = ["no_preference", "warm", "balanced", "cold"] as const;
export const industryHubOptions = [
  "no_preference",
  "tech",
  "finance",
  "business",
  "creative",
  "research",
  "healthcare",
  "government_policy",
  "manufacturing_engineering",
] as const;
export const rankingBandOptions = ["no_preference", "top_50", "top_100", "top_200"] as const;

export const CLIMATE_LABELS: Record<(typeof climateOptions)[number], string> = {
  no_preference: "No preference",
  warm: "Warm",
  balanced: "Balanced",
  cold: "Cold",
};
export const INDUSTRY_HUB_LABELS: Record<(typeof industryHubOptions)[number], string> = {
  no_preference: "No preference",
  tech: "Tech hub",
  finance: "Finance capital",
  business: "Business hub",
  creative: "Creative hub",
  research: "Research hub",
  healthcare: "Healthcare & biotech hub",
  government_policy: "Government & policy hub",
  manufacturing_engineering: "Manufacturing & engineering hub",
};
export const RANKING_BAND_LABELS: Record<(typeof rankingBandOptions)[number], string> = {
  no_preference: "No preference",
  top_50: "Top 50",
  top_100: "Top 100",
  top_200: "Top 200",
};

export const onboardingDraftSchema = z.object({
  curriculumId: z.string().uuid().nullable(),
  subjects: z.array(subjectEntrySchema).default([]),
  casCompleted: z.boolean().nullable(),
  targetCountryIds: z.array(z.string().uuid()).default([]),
  // One board covers grades 9-11 -- a student virtually always stays on the
  // same secondary curriculum across those years.
  grade10Board: z.string().nullable(),
  grade9Subjects: z.array(grade9SubjectEntrySchema).default([]),
  grade10Subjects: z.array(grade10SubjectEntrySchema).default([]),
  grade11Subjects: z.array(grade11SubjectEntrySchema).default([]),
  fieldOfInterestId: z.string().uuid().nullable(),
  preferredClimate: z.enum(climateOptions).nullable(),
  preferredIndustryHub: z.enum(industryHubOptions).nullable(),
  preferredRankingBand: z.enum(rankingBandOptions).nullable(),
  extracurriculars: z.array(extracurricularEntrySchema).default([]),
  examScores: z.array(examScoreEntrySchema).default([]),
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export const ONBOARDING_STEPS = [
  "curriculum",
  "subjects",
  "targetCountries",
  "secondaryGrades",
  "fieldOfInterest",
  "preferences",
  "extracurriculars",
  "examScores",
  "review",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
