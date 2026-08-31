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

export const budgetIncludesLivingOptions = ["yes", "no", "not_sure"] as const;

export const onboardingDraftSchema = z.object({
  curriculumId: z.string().uuid().nullable(),
  subjects: z.array(subjectEntrySchema).default([]),
  extracurriculars: z.array(extracurricularEntrySchema).default([]),
  intendedProgramCategoryId: z.string().uuid().nullable(),
  preferredCountryIds: z.array(z.string().uuid()).default([]),
  budgetAmount: z.number().positive().nullable(),
  budgetCurrency: z.string().nullable(),
  budgetIncludesLiving: z.enum(budgetIncludesLivingOptions).nullable(),
  budgetSkipped: z.boolean().default(false),
});
export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;

export const ONBOARDING_STEPS = [
  "curriculum",
  "subjects",
  "extracurriculars",
  "degree",
  "countries",
  "budget",
  "review",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];
