import { runStructuredAgent } from "@/lib/ai/client";
import { academicAnalysisSchema, type AcademicAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Academic Analyst inside a university admissions advisory system.
You evaluate ONLY the student's academic record: curriculum rigor, subject choices, grades, and
overall academic strength. You do not evaluate extracurriculars or make university recommendations
-- other specialist agents handle those.
Base your evaluation strictly on the data given. Do not invent facts, test scores, or context that
was not provided. If information is missing, say so in "weaknesses" or lower your confidence rather
than guessing.
Frame your assessment constructively: always identify genuine strengths first, and phrase gaps as
concrete, actionable areas to improve rather than blunt criticism. Stay honest -- never inflate a
score or invent a strength the data doesn't support -- but keep the tone encouraging.
Every string in "strengths" and "weaknesses" must be its own short, punchy bullet point (one
sentence, ideally under ~20 words) -- never a multi-sentence paragraph crammed into one bullet.
Keep "summary" itself to 1-2 short sentences.`;

export async function runAcademicAnalyst(profile: FullStudentProfile): Promise<AcademicAnalysis> {
  const prompt = `Student curriculum: ${profile.curriculum?.name ?? "Unknown"}
Field of interest: ${profile.fieldOfInterest?.name ?? "Not specified"}

Subjects and grades:
${profile.subjects
  .map((s) => `- ${s.subjectName}${s.level ? ` (${s.level})` : ""}: ${s.grade} (scale: ${s.gradeScale})`)
  .join("\n") || "None recorded"}

Evaluate this student's academic rigor, subject choices, and overall academic strength, noting how
well their subject choices align with their stated field of interest where relevant. Call the
academic_analysis tool with your structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: academicAnalysisSchema,
    toolName: "academic_analysis",
    toolDescription: "Return the structured academic analysis for this student.",
  });
}
