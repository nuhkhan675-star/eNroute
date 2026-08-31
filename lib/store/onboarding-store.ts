import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExtracurricularEntry,
  OnboardingDraft,
  SubjectEntry,
} from "@/lib/validation/onboarding";

const emptyDraft: OnboardingDraft = {
  curriculumId: null,
  subjects: [],
  extracurriculars: [],
  intendedProgramCategoryId: null,
  preferredCountryIds: [],
  budgetAmount: null,
  budgetCurrency: null,
  budgetIncludesLiving: null,
  budgetSkipped: false,
};

interface OnboardingState {
  draft: OnboardingDraft;
  setCurriculum: (curriculumId: string | null) => void;
  addSubject: (entry: SubjectEntry) => void;
  removeSubject: (index: number) => void;
  setSubjects: (entries: SubjectEntry[]) => void;
  addExtracurricular: (entry: ExtracurricularEntry) => void;
  updateExtracurricular: (id: string, patch: Partial<ExtracurricularEntry>) => void;
  removeExtracurricular: (id: string) => void;
  setIntendedProgramCategory: (categoryId: string | null) => void;
  setPreferredCountries: (countryIds: string[]) => void;
  setBudget: (patch: Partial<Pick<OnboardingDraft, "budgetAmount" | "budgetCurrency" | "budgetIncludesLiving" | "budgetSkipped">>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      draft: emptyDraft,
      setCurriculum: (curriculumId) =>
        set((s) => ({ draft: { ...s.draft, curriculumId, subjects: [] } })),
      addSubject: (entry) =>
        set((s) => ({ draft: { ...s.draft, subjects: [...s.draft.subjects, entry] } })),
      removeSubject: (index) =>
        set((s) => ({
          draft: { ...s.draft, subjects: s.draft.subjects.filter((_, i) => i !== index) },
        })),
      setSubjects: (entries) => set((s) => ({ draft: { ...s.draft, subjects: entries } })),
      addExtracurricular: (entry) =>
        set((s) => ({
          draft: { ...s.draft, extracurriculars: [...s.draft.extracurriculars, entry] },
        })),
      updateExtracurricular: (id, patch) =>
        set((s) => ({
          draft: {
            ...s.draft,
            extracurriculars: s.draft.extracurriculars.map((e) =>
              e.id === id ? { ...e, ...patch } : e
            ),
          },
        })),
      removeExtracurricular: (id) =>
        set((s) => ({
          draft: {
            ...s.draft,
            extracurriculars: s.draft.extracurriculars.filter((e) => e.id !== id),
          },
        })),
      setIntendedProgramCategory: (categoryId) =>
        set((s) => ({ draft: { ...s.draft, intendedProgramCategoryId: categoryId } })),
      setPreferredCountries: (countryIds) =>
        set((s) => ({ draft: { ...s.draft, preferredCountryIds: countryIds } })),
      setBudget: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      reset: () => set({ draft: emptyDraft }),
    }),
    { name: "admissions-onboarding-draft" }
  )
);
