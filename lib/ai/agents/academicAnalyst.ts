import { runStructuredAgent } from "@/lib/ai/client";
import { academicAnalysisSchema, type AcademicAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Academic Analyst inside a university admissions advisory system.
You evaluate ONLY the student's academic record: curriculum rigor, subject choices, grades, and
academic fit for their intended program. You do not evaluate extracurriculars or make university
recommendations -- other specialist agents handle those.
Base your evaluation strictly on the data given. Do not invent facts, test scores, or context that
was not provided. If information is missing, say so in "weaknesses" or lower your confidence rather
than guessing.`;

export async function runAcademicAnalyst(profile: FullStudentProfile): Promise<AcademicAnalysis> {
  const prompt = `Student curriculum: ${profile.curriculum?.name ?? "Unknown"}

Subjects and grades:
${profile.subjects
  .map((s) => `- ${s.subjectName}${s.level ? ` (${s.level})` : ""}: ${s.grade} (scale: ${s.gradeScale})`)
  .join("\n") || "None recorded"}

Intended program: ${profile.intendedProgramCategory?.name ?? "Not specified"}

Evaluate this student's academic rigor, subject choice alignment with their intended program, and
overall academic strength. Call the academic_analysis tool with your structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: academicAnalysisSchema,
    toolName: "academic_analysis",
    toolDescription: "Return the structured academic analysis for this student.",
  });
}
