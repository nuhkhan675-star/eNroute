// Deterministic composite used to cache student_profiles.profile_strength.
// University-agnostic (academic + extracurricular only) since the profile
// itself no longer targets a specific program -- major fit is computed
// separately, per-program, when the student checks their chances somewhere
// specific.
export function computeProfileStrength(academicScore: number, extracurricularScore: number): number {
  const composite = academicScore * 0.6 + extracurricularScore * 0.4;
  return Math.round(composite * 10) / 10; // one decimal, 0-10 scale
}
