import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExamScoreEntry,
  ExtracurricularEntry,
  Grade10SubjectEntry,
  OnboardingDraft,
  SubjectEntry,
} from "@/lib/validation/onboarding";

const emptyDraft: OnboardingDraft = {
  curriculumId: null,
  subjects: [],
  grade10Board: null,
  grade10Subjects: [],
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
  setGrade10Board: (grade10Board: string | null) => void;
  addGrade10Subject: (entry: Grade10SubjectEntry) => void;
  removeGrade10Subject: (id: string) => void;
  setGrade10Subjects: (entries: Grade10SubjectEntry[]) => void;
  setFieldOfInterest: (fieldOfInterestId: string | null) => void;
  addExtracurricular: (entry: ExtracurricularEntry) => void;
  updateExtracurricular: (id: string, patch: Partial<ExtracurricularEntry>) => void;
  removeExtracurricular: (id: string) => void;
  addExamScore: (entry: ExamScoreEntry) => void;
  removeExamScore: (id: string) => void;
  reset: () => void;
  hydrateIfEmpty: (draft: OnboardingDraft) => void;
}

function isEmptyDraft(draft: OnboardingDraft): boolean {
  return (
    draft.curriculumId === null &&
    draft.subjects.length === 0 &&
    draft.fieldOfInterestId === null &&
    draft.extracurriculars.length === 0 &&
    draft.examScores.length === 0 &&
    !draft.grade10Board &&
    (draft.grade10Subjects ?? []).length === 0
  );
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
      setGrade10Board: (grade10Board) => set((s) => ({ draft: { ...s.draft, grade10Board } })),
      addGrade10Subject: (entry) =>
        set((s) => ({ draft: { ...s.draft, grade10Subjects: [...s.draft.grade10Subjects, entry] } })),
      removeGrade10Subject: (id) =>
        set((s) => ({
          draft: { ...s.draft, grade10Subjects: s.draft.grade10Subjects.filter((e) => e.id !== id) },
        })),
      setGrade10Subjects: (entries) => set((s) => ({ draft: { ...s.draft, grade10Subjects: entries } })),
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
      // Only fills in an already-saved profile when the current draft is
      // still untouched -- never clobbers in-progress edits (e.g. from a
      // refresh mid-wizard).
      hydrateIfEmpty: (draft) =>
        set((s) => (isEmptyDraft(s.draft) ? { draft } : s)),
    }),
    { name: "admissions-onboarding-draft-v4" }
  )
);
