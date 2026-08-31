// Deterministic composite used to cache student_profiles.profile_strength.
// Same weighting as the classification's competitiveness index, kept as a
// separate function since this one isn't tied to a specific university.
export function computeProfileStrength(
  academicScore: number,
  extracurricularScore: number,
  majorFitScore: number
): number {
  const composite = academicScore * 0.5 + extracurricularScore * 0.25 + majorFitScore * 0.25;
  return Math.round(composite * 10) / 10; // one decimal, 0-10 scale
}
