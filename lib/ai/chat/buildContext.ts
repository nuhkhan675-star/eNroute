import type { FullStudentProfile } from "@/lib/db/profiles";
import { getLatestAnalysis, getUniversityAnalysis, getAllUniversityAnalysesForProfile } from "@/lib/db/analyses";
import { getUniversityWithPrograms } from "@/lib/db/universities";
import { CATEGORY_LABELS } from "@/lib/ai/prediction/scoringEngine";

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
  focusedUniversityId?: string | null
): Promise<string> {
  const [academic, extracurricular, focusedAnalysis, allAnalyses, focusedUniversity] = await Promise.all([
    getLatestAnalysis(profile.id, "academic"),
    getLatestAnalysis(profile.id, "extracurricular"),
    focusedUniversityId ? getUniversityAnalysis(profile.id, focusedUniversityId) : null,
    getAllUniversityAnalysesForProfile(profile.id),
    focusedUniversityId ? getUniversityWithPrograms(focusedUniversityId) : null,
  ]);

  const parts: string[] = [CHAT_SYSTEM_PROMPT_HEADER, "\n--- STUDENT PROFILE ---"];

  parts.push(`Curriculum: ${profile.curriculum?.name ?? "Not specified"}`);
  parts.push(`Field of interest: ${profile.fieldOfInterest?.name ?? "Not specified"}`);
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
  parts.push(
    `Exam scores: ${
      profile.examScores.map((e) => `${e.examType}: ${e.score}`).join(", ") || "None recorded"
    }`
  );
  parts.push(`Profile strength (composite, not a probability): ${profile.profileStrength ?? "Not yet analyzed"}`);

  if (academic) parts.push(`\n--- ACADEMIC ANALYSIS (INFERENCE) ---\n${JSON.stringify(academic.output)}`);
  if (extracurricular)
    parts.push(`\n--- EXTRACURRICULAR ANALYSIS (INFERENCE) ---\n${JSON.stringify(extracurricular.output)}`);
  if (focusedAnalysis)
    parts.push(
      `\n--- ADMISSION ANALYSIS FOR CURRENTLY VIEWED UNIVERSITY (INFERENCE -- chance range and category are computed deterministically from selectivity data, never invented) ---\n${JSON.stringify(
        {
          chanceRange: `${focusedAnalysis.chanceMin}-${focusedAnalysis.chanceMax}%`,
          category: CATEGORY_LABELS[focusedAnalysis.category],
          selectivityLevel: focusedAnalysis.selectivityLevel,
          confidence: focusedAnalysis.confidence,
          strengths: focusedAnalysis.strengths,
          gaps: focusedAnalysis.gaps,
          reasoning: focusedAnalysis.reasoning,
        }
      )}`
    );

  if (focusedUniversity) {
    parts.push(`\n--- CURRENTLY VIEWED UNIVERSITY FACTS (FACT, from our database) ---`);
    parts.push(`${focusedUniversity.name} (${focusedUniversity.city ?? "city unknown"}, ${focusedUniversity.countryName})`);
    parts.push(
      `Known specialities: ${focusedUniversity.specialities.join(", ") || "None recorded"}`
    );
    parts.push(
      `Real programs on record: ${
        focusedUniversity.programs.map((p) => `${p.displayName} (${p.categoryName})`).join("; ") || "None recorded"
      }`
    );
  }

  if (allAnalyses.length > 0) {
    parts.push("\n--- UNIVERSITY-SPECIFIC ANALYSES ALREADY COMPUTED ---");
    for (const a of allAnalyses) {
      const isFocused = focusedUniversityId && a.universityId === focusedUniversityId;
      parts.push(
        `${isFocused ? "[CURRENTLY VIEWING] " : ""}${a.universityName}: ${a.chanceMin}-${a.chanceMax}% (${CATEGORY_LABELS[a.category]}, ${a.selectivityLevel} selectivity, ${a.confidence} confidence)`
      );
    }
  }

  return parts.join("\n");
}
