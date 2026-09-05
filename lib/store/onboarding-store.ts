import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ExamScoreEntry,
  ExtracurricularEntry,
  Grade9SubjectEntry,
  Grade10SubjectEntry,
  Grade11SubjectEntry,
  OnboardingDraft,
  SubjectEntry,
} from "@/lib/validation/onboarding";

const emptyDraft: OnboardingDraft = {
  curriculumId: null,
  subjects: [],
  casCompleted: null,
  targetCountryIds: [],
  grade10Board: null,
  grade9Subjects: [],
  grade10Subjects: [],
  grade11Subjects: [],
  fieldOfInterestId: null,
  preferredClimate: null,
  preferredIndustryHub: null,
  preferredRankingBand: null,
  extracurriculars: [],
  examScores: [],
};

interface OnboardingState {
  draft: OnboardingDraft;
  setCurriculum: (curriculumId: string | null) => void;
  addSubject: (entry: SubjectEntry) => void;
  removeSubject: (index: number) => void;
  setSubjects: (entries: SubjectEntry[]) => void;
  setCasCompleted: (value: boolean | null) => void;
  setTargetCountryIds: (ids: string[]) => void;
  setGrade10Board: (grade10Board: string | null) => void;
  setGrade9Subjects: (entries: Grade9SubjectEntry[]) => void;
  addGrade10Subject: (entry: Grade10SubjectEntry) => void;
  removeGrade10Subject: (id: string) => void;
  setGrade10Subjects: (entries: Grade10SubjectEntry[]) => void;
  setGrade11Subjects: (entries: Grade11SubjectEntry[]) => void;
  setFieldOfInterest: (fieldOfInterestId: string | null) => void;
  setPreferredClimate: (value: OnboardingDraft["preferredClimate"]) => void;
  setPreferredIndustryHub: (value: OnboardingDraft["preferredIndustryHub"]) => void;
  setPreferredRankingBand: (value: OnboardingDraft["preferredRankingBand"]) => void;
  addExtracurricular: (entry: ExtracurricularEntry) => void;
  updateExtracurricular: (id: string, patch: Partial<ExtracurricularEntry>) => void;
  removeExtracurricular: (id: string) => void;
  addExamScore: (entry: ExamScoreEntry) => void;
  removeExamScore: (id: string) => void;
  reset: () => void;
  hydrateIfEmpty: (draft: OnboardingDraft) => void;
  // Unconditionally replaces the draft (e.g. loading a saved profile
  // version) -- unlike hydrateIfEmpty, this is explicit user action and may
  // overwrite in-progress edits, which is exactly the point.
  loadDraft: (draft: OnboardingDraft) => void;
}

function isEmptyDraft(draft: OnboardingDraft): boolean {
  return (
    draft.curriculumId === null &&
    draft.subjects.length === 0 &&
    draft.fieldOfInterestId === null &&
    draft.extracurriculars.length === 0 &&
    draft.examScores.length === 0 &&
    !draft.grade10Board &&
    (draft.grade10Subjects ?? []).length === 0 &&
    (draft.grade9Subjects ?? []).length === 0 &&
    (draft.grade11Subjects ?? []).length === 0 &&
    (draft.targetCountryIds ?? []).length === 0
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
      setCasCompleted: (value) => set((s) => ({ draft: { ...s.draft, casCompleted: value } })),
      setTargetCountryIds: (ids) => set((s) => ({ draft: { ...s.draft, targetCountryIds: ids } })),
      setGrade10Board: (grade10Board) => set((s) => ({ draft: { ...s.draft, grade10Board } })),
      setGrade9Subjects: (entries) => set((s) => ({ draft: { ...s.draft, grade9Subjects: entries } })),
      addGrade10Subject: (entry) =>
        set((s) => ({ draft: { ...s.draft, grade10Subjects: [...s.draft.grade10Subjects, entry] } })),
      removeGrade10Subject: (id) =>
        set((s) => ({
          draft: { ...s.draft, grade10Subjects: s.draft.grade10Subjects.filter((e) => e.id !== id) },
        })),
      setGrade10Subjects: (entries) => set((s) => ({ draft: { ...s.draft, grade10Subjects: entries } })),
      setGrade11Subjects: (entries) => set((s) => ({ draft: { ...s.draft, grade11Subjects: entries } })),
      setFieldOfInterest: (fieldOfInterestId) =>
        set((s) => ({ draft: { ...s.draft, fieldOfInterestId } })),
      setPreferredClimate: (value) => set((s) => ({ draft: { ...s.draft, preferredClimate: value } })),
      setPreferredIndustryHub: (value) => set((s) => ({ draft: { ...s.draft, preferredIndustryHub: value } })),
      setPreferredRankingBand: (value) => set((s) => ({ draft: { ...s.draft, preferredRankingBand: value } })),
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
      loadDraft: (draft) => set({ draft }),
    }),
    { name: "admissions-onboarding-draft-v5" }
  )
);
