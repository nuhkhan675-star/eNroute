/**
 * UCAS Tariff points for A-level grades.
 *
 * Only meaningful for the A_LEVELS curriculum. UCAS does publish an IB
 * conversion, but it is a separate and more involved table (per-subject, HL/SL
 * dependent, plus core points), so nothing here should be pointed at IB, CBSE
 * or AP grades -- a number produced that way would look authoritative and be
 * wrong.
 *
 * Grades are stored as literal strings ("A*", "A", ...) -- verified against
 * student_subjects rather than assumed, and matching the A*-E dropdown in
 * lib/utils/grades.ts.
 */
const A_LEVEL_TARIFF_POINTS: Record<string, number> = {
  "A*": 56,
  A: 48,
  B: 40,
  C: 32,
  D: 24,
  E: 16,
  // U is a real, selectable grade in the A*-E dropdown and is genuinely worth
  // zero points, so it is listed explicitly. Leaving it out would have sent
  // every student holding a U down the "cannot compute" path, which is a
  // different and less accurate outcome than scoring it correctly as nil.
  U: 0,
};

/**
 * Total UCAS Tariff points for a set of A-level grades.
 *
 * Returns null -- never 0 -- whenever the total cannot be computed. An
 * unrecognised grade string must not silently read as "zero points", because
 * downstream that is indistinguishable from a genuinely terrible result and
 * would understate the student rather than admitting we don't know.
 */
export function computeUcasTariffPoints(aLevelGrades: string[]): number | null {
  if (aLevelGrades.length === 0) return null;

  let total = 0;
  for (const grade of aLevelGrades) {
    const points = A_LEVEL_TARIFF_POINTS[grade];
    if (points == null) return null;
    total += points;
  }
  return total;
}

/** How a student's tariff total sits against a university's published band. */
export type TariffStanding = "above" | "within" | "below";

/**
 * Places a tariff total against a published 25th-75th percentile band.
 *
 * The band is the middle 50% of admitted students, not a cutoff, so "below"
 * means behind most admits rather than ineligible -- wording the caller is
 * responsible for preserving.
 */
export function compareToTariffBand(
  points: number,
  min: number | null,
  max: number | null
): TariffStanding | null {
  if (min == null && max == null) return null;
  if (max != null && points > max) return "above";
  if (min != null && points < min) return "below";
  return "within";
}
