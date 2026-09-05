// General, publicly-known descriptions of how each supported country's
// undergraduate admissions process typically weighs academics vs. holistic
// factors. Deliberately qualitative (no invented precise percentages) --
// this is background context for the student, not a data source the
// prediction engine reads from.
export interface AdmissionsContextEntry {
  countryCode: string; // matches countries.iso_code
  summary: string;
}

export const ADMISSIONS_CONTEXT: AdmissionsContextEntry[] = [
  {
    countryCode: "US",
    summary:
      "US admissions are broadly holistic: academic record and rigor matter a great deal, but extracurricular depth, essays, and recommendations are weighed alongside them rather than one factor dominating.",
  },
  {
    countryCode: "GB",
    summary:
      "UK admissions are primarily academic and course-specific: your grades and subject choices in areas directly relevant to the course you're applying for carry the most weight, more than broad extracurricular involvement.",
  },
  {
    countryCode: "IN",
    summary:
      "Indian admissions are overwhelmingly exam- and grade-driven -- entrance exam scores (or board results, depending on the institution) are usually the deciding factor, with extracurriculars playing a minor role at most institutions.",
  },
  {
    countryCode: "AU",
    summary:
      "Australian admissions are mostly grade-based, using a calculated academic rank from your final school results, with extracurriculars and personal statements mattering more for a smaller set of competitive programs.",
  },
  {
    countryCode: "HK",
    summary:
      "Hong Kong admissions blend strong academic results with interviews for many programs, giving more weight to holistic factors than India but less than the US.",
  },
  {
    countryCode: "SG",
    summary:
      "Singapore admissions weigh academic results first and most heavily, with essays or interviews as a secondary factor at the more selective institutions.",
  },
];

export function getAdmissionsContext(countryCode: string): AdmissionsContextEntry | undefined {
  return ADMISSIONS_CONTEXT.find((c) => c.countryCode === countryCode);
}
