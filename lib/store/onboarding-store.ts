import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExamScoreEntry,
  ExtracurricularEntry,
  OnboardingDraft,
  SubjectEntry,
} from "@/lib/validation/onboarding";

const emptyDraft: OnboardingDraft = {
  curriculumId: null,
  subjects: [],
  fieldOfInterestId: null,
  extracurriculars: [],
  examScores: [],
};

interface OnboardingState {
  draft: OnboardingDraft;
  setCurriculum: (curriculumId: string | null) => void;
  addSubject: (entry: SubjectEntry) => void;
  removeSubject: (index: number) => void;
  setSubjects: (entries: SubjectEntry[]) => void;
  setFieldOfInterest: (fieldOfInterestId: string | null) => void;
  addExtracurricular: (entry: ExtracurricularEntry) => void;
  updateExtracurricular: (id: string, patch: Partial<ExtracurricularEntry>) => void;
  removeExtracurricular: (id: string) => void;
  addExamScore: (entry: ExamScoreEntry) => void;
  removeExamScore: (id: string) => void;
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
      setFieldOfInterest: (fieldOfInterestId) =>
        set((s) => ({ draft: { ...s.draft, fieldOfInterestId } })),
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
      addExamScore: (entry) =>
        set((s) => ({ draft: { ...s.draft, examScores: [...s.draft.examScores, entry] } })),
      removeExamScore: (id) =>
        set((s) => ({
          draft: { ...s.draft, examScores: s.draft.examScores.filter((e) => e.id !== id) },
        })),
      reset: () => set({ draft: emptyDraft }),
    }),
    { name: "admissions-onboarding-draft-v3" }
  )
);
