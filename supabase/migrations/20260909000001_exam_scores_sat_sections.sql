-- Allow the SAT section scores the app already offers.
--
-- StepExamScores lets a student enter SAT Math and SAT Reading & Writing
-- separately (see examTypes in lib/validation/onboarding.ts), because US
-- universities publish section bands rather than a single combined figure.
-- The check constraint from 20260831000004 was never widened to match, so
-- saving a profile that contained either one failed with
-- "new row violates check constraint exam_scores_exam_type_check" -- and the
-- whole profile save failed with it, not just the exam row.

alter table public.exam_scores
  drop constraint if exists exam_scores_exam_type_check;

alter table public.exam_scores
  add constraint exam_scores_exam_type_check check (exam_type in (
    'SAT',
    'SAT_MATH',
    'SAT_READING_WRITING',
    'ACT',
    'IELTS',
    'TOEFL_IBT',
    'DUOLINGO',
    'GRE',
    'GMAT',
    'PTE_ACADEMIC',
    'OTHER'
  ));
