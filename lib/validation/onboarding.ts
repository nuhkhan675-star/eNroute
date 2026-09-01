import { z } from "zod";

export const subjectEntrySchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string(),
  level: z.string().nullable(),
  grade: z.string().min(1, "Grade is required"),
});
export type SubjectEntry = z.infer<typeof subjectEntrySchema>;

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
  SAT: "SAT",
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

export const onboardingDraftSchema = z.object({
  curriculumId: z.string().uuid().nullable(),
  subjects: z.array(subjectEntrySchema).default([]),
  fieldOfInterestId: z.string().uuid().nullable(),
  extracurriculars: z.array(extracurricularEntrySchema).default([]),
  examScores: z.array(examScoreEntrySchema).default([]),
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export const ONBOARDING_STEPS = [
  "curriculum",
  "subjects",
  "fieldOfInterest",
  "extracurriculars",
  "examScores",
  "review",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
