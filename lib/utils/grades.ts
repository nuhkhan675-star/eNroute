// Maps a subject's grade_scale (from the DB) to the concrete dropdown
// options offered in the onboarding form. Keeps grade entry as a dropdown
// across curricula instead of free text, per the product requirement.
export function getGradeOptionsForScale(scale: string): string[] {
  switch (scale) {
    case "1-7":
      return ["7", "6", "5", "4", "3", "2", "1"];
    case "1-5":
      return ["5", "4", "3", "2", "1"];
    case "A*-E":
      return ["A*", "A", "B", "C", "D", "E", "U"];
    case "A*-G":
      return ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];
    case "A-E":
      return ["A", "B", "C", "D", "E"];
    case "A-F":
      return ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"];
    case "0-100":
      return Array.from({ length: 101 }, (_, i) => String(100 - i));
    default:
      return Array.from({ length: 101 }, (_, i) => String(100 - i));
  }
}
