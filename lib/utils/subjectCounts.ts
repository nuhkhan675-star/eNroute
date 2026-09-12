// How many subject slots to pre-populate on the Subjects & Grades step, per
// curriculum. These reflect each board's typical/required subject count
// (e.g. IB Diploma requires exactly 6), so the student sees the right number
// of rows to fill in instead of an open-ended "add one at a time" loop.
// Students can still add or remove rows if their situation differs.
const SUBJECT_COUNT_BY_CURRICULUM_CODE: Record<string, number> = {
  IB: 8, // 6 subjects + Theory of Knowledge + Extended Essay
  A_LEVELS: 3,
  CBSE: 5,
  ICSE: 5,
  ISC: 5,
  AP: 4,
  US_HS_DIPLOMA: 6,
  AU_CURRICULUM: 5,
  OTHER: 4,
};

export function getExpectedSubjectCount(curriculumCode: string | undefined): number {
  if (!curriculumCode) return 4;
  return SUBJECT_COUNT_BY_CURRICULUM_CODE[curriculumCode] ?? 4;
}

// The most subjects a real record can hold, per curriculum. One shared cap
// of twelve let an A Level student list twelve subjects, which no sixth form
// offers -- five is already Further Maths plus an EPQ on top of a full load.
// Each ceiling is the board's realistic maximum with a little slack, not its
// typical count; that is what the table above is for. IB is fixed at six and
// enforced separately on its own branch of the form.
const MAX_SUBJECT_COUNT_BY_CURRICULUM_CODE: Record<string, number> = {
  A_LEVELS: 5,
  CBSE: 7, // five compulsory, an optional sixth, occasionally a skill subject
  ICSE: 8, // seven is the standard Class 10 slate
  ISC: 7, // English plus up to five or six electives
  AU_CURRICULUM: 7, // five or six ATAR subjects
  AP: 12, // taken across several years, so genuinely open-ended
  US_HS_DIPLOMA: 12,
  OTHER: 12,
};

export const DEFAULT_MAX_SUBJECT_COUNT = 12;

export function getMaxSubjectCount(curriculumCode: string | undefined): number {
  if (!curriculumCode) return DEFAULT_MAX_SUBJECT_COUNT;
  return MAX_SUBJECT_COUNT_BY_CURRICULUM_CODE[curriculumCode] ?? DEFAULT_MAX_SUBJECT_COUNT;
}
