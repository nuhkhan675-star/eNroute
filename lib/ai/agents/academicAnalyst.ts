import { runStructuredAgent } from "@/lib/ai/client";
import { academicAnalysisSchema, type AcademicAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Academic Analyst inside a university admissions advisory system.
You evaluate ONLY the student's academic record: curriculum rigor, subject choices, grades, and
overall academic strength. You do not evaluate extracurriculars or make university recommendations
-- other specialist agents handle those.
You are given multiple academic records when they exist: the student's main curriculum (e.g.
IB/A-Level) subjects and grades, AND their secondary-school (e.g. IGCSE/GCSE) board and subject
grades across whichever of grades 9, 10, and 11 were provided (10 is always present if any are;
9 and 11 are optional). Treat every provided grade level as a real, separate input you must
evaluate -- not background context to skim past in favor of the main curriculum. Explicitly call
out standout grades (e.g. top marks on that board's scale, or a clear upward trajectory across
grades 9-11) as their own strengths, and explicitly call out weak or mediocre grades as their own
weaknesses. Never omit a provided grade level from your analysis just because main curriculum
grades are also present.
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
  const gradeBlock = (label: string, subjects: { subjectName: string; grade: string }[]) =>
    subjects.length > 0
      ? `${label} (${profile.grade10Board || "board not specified"}):\n${subjects.map((s) => `- ${s.subjectName}: ${s.grade}`).join("\n")}`
      : "";

  const secondaryBlocks = [
    gradeBlock("Grade 9", profile.grade9Subjects),
    gradeBlock("Grade 10 / secondary school", profile.grade10Subjects),
    gradeBlock("Grade 11", profile.grade11Subjects),
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = `Student curriculum: ${profile.curriculum?.name ?? "Unknown"}
Field of interest: ${profile.fieldOfInterest?.name ?? "Not specified"}
${secondaryBlocks || "Secondary school (grades 9-11): Not provided"}

Subjects and grades:
${profile.subjects
  .map((s) => `- ${s.subjectName}${s.level ? ` (${s.level})` : ""}: ${s.grade} (scale: ${s.gradeScale})`)
  .join("\n") || "None recorded"}

Evaluate this student's academic rigor, subject choices, and overall academic strength, noting how
well their subject choices align with their stated field of interest where relevant. If Grade 10
results were provided above, explicitly include at least one strength for a genuinely strong Grade
10 grade and at least one weakness for any genuinely weak Grade 10 grade -- do not leave Grade 10
unmentioned. Call the academic_analysis tool with your structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: academicAnalysisSchema,
    toolName: "academic_analysis",
    toolDescription: "Return the structured academic analysis for this student.",
  });
}
