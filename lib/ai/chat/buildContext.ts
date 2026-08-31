import type { FullStudentProfile } from "@/lib/db/profiles";
import { getLatestAnalysis, getAllFinalStrategiesForProfile } from "@/lib/db/analyses";

export const CHAT_SYSTEM_PROMPT_HEADER = `You are this student's personal university admissions advisor. You are
NOT a generic chatbot -- you have their actual stored profile and actual university data below, and you
must answer using ONLY that data plus the specialist analyses already computed for them.

Rules:
- Clearly distinguish FACT (sourced from our database, e.g. a recorded acceptance rate or tuition figure)
  from INFERENCE (a specialist agent's judgment, e.g. "target" classification or a strength/weakness).
- Never invent admission statistics, tuition, requirements, scholarships, or deadlines that are not in the
  context below. If something isn't in the data, say it isn't available rather than guessing.
- Never state a precise admission probability (e.g. "37%"). Use the likelihood ranges and Reach/Target/Likely
  classifications already computed for the student, and defer to them -- do not recompute your own.
- If the student states new information about themselves (a new achievement, award, activity, or grade),
  call the propose_profile_update tool instead of just acknowledging it in text. Never silently assume the
  update has been saved -- the student must confirm it in the UI first.
- Keep answers grounded, specific, and concise. Reference the actual universities and numbers you were given.`;

export async function buildChatContext(
  profile: FullStudentProfile,
  focusedUniversityProgramId?: string | null
): Promise<string> {
  const [academic, extracurricular, majorFit, allStrategies] = await Promise.all([
    getLatestAnalysis(profile.id, "academic"),
    getLatestAnalysis(profile.id, "extracurricular"),
    getLatestAnalysis(profile.id, "major_fit"),
    getAllFinalStrategiesForProfile(profile.id),
  ]);

  const parts: string[] = [CHAT_SYSTEM_PROMPT_HEADER, "\n--- STUDENT PROFILE ---"];

  parts.push(`Curriculum: ${profile.curriculum?.name ?? "Not specified"}`);
  parts.push(
    `Subjects: ${
      profile.subjects
        .map((s) => `${s.subjectName}${s.level ? ` (${s.level})` : ""}: ${s.grade}`)
        .join(", ") || "None recorded"
    }`
  );
  parts.push(
    `Extracurriculars: ${
      profile.extracurriculars.map((a) => `${a.activityName} (${a.category})`).join("; ") || "None recorded"
    }`
  );
  parts.push(`Intended program: ${profile.intendedProgramCategory?.name ?? "Not specified"}`);
  parts.push(`Preferred countries: ${profile.preferredCountries.map((c) => c.name).join(", ") || "None"}`);
  parts.push(
    `Budget: ${
      profile.budgetAmount ? `${profile.budgetAmount} ${profile.budgetCurrency ?? ""} / year` : "Not specified"
    }`
  );
  parts.push(`Profile strength (composite, not a probability): ${profile.profileStrength ?? "Not yet analyzed"}`);

  if (academic) parts.push(`\n--- ACADEMIC ANALYSIS (INFERENCE) ---\n${JSON.stringify(academic.output)}`);
  if (extracurricular)
    parts.push(`\n--- EXTRACURRICULAR ANALYSIS (INFERENCE) ---\n${JSON.stringify(extracurricular.output)}`);
  if (majorFit) parts.push(`\n--- MAJOR FIT ANALYSIS (INFERENCE) ---\n${JSON.stringify(majorFit.output)}`);

  if (allStrategies.length > 0) {
    parts.push("\n--- UNIVERSITY-SPECIFIC ANALYSES ALREADY COMPUTED ---");
    for (const row of allStrategies) {
      const isFocused = focusedUniversityProgramId && row.university_program_id === focusedUniversityProgramId;
      parts.push(
        `${isFocused ? "[CURRENTLY VIEWING] " : ""}university_program_id=${row.university_program_id}: ${JSON.stringify(
          { input: row.input_snapshot, output: row.output }
        )}`
      );
    }
  }

  return parts.join("\n");
}
