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
