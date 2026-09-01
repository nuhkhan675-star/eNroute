import { runStructuredAgent } from "@/lib/ai/client";
import { extracurricularAnalysisSchema, type ExtracurricularAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Extracurricular Analyst inside a university admissions advisory
system. Evaluate the student's activities on leadership, commitment (duration + depth), impact,
achievement/selectivity, and initiative -- NOT on quantity. A student with two deep, high-impact
activities should score higher than one with ten shallow ones. Base your evaluation strictly on
the data given; do not invent achievements or impact that were not described.
Frame your assessment constructively: always identify genuine strengths first, and phrase gaps as
concrete, actionable areas to improve rather than blunt criticism. Stay honest -- never inflate a
score or invent a strength the data doesn't support -- but keep the tone encouraging.
Every string in "strengths" and "weaknesses" must be its own short, punchy bullet point (one
sentence, ideally under ~20 words) -- never a multi-sentence paragraph crammed into one bullet.
Keep "summary" itself to 1-2 short sentences.`;

export async function runExtracurricularAnalyst(
  profile: FullStudentProfile
): Promise<ExtracurricularAnalysis> {
  const prompt = `Field of interest: ${profile.fieldOfInterest?.name ?? "Not specified"}

Activities:
${
  profile.extracurriculars
    .map(
      (a, i) =>
        `${i + 1}. ${a.activityName} (${a.category}${a.role ? `, role: ${a.role}` : ""}${
          a.yearsInvolved ? `, ${a.yearsInvolved} years` : ""
        })
   Description: ${a.description ?? "—"}
   Achievements: ${a.achievements ?? "—"}
   Impact: ${a.impact ?? "—"}`
    )
    .join("\n\n") || "No extracurricular activities recorded."
}

Evaluate depth, leadership, commitment, and impact. Call the extracurricular_analysis tool with
your structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: extracurricularAnalysisSchema,
    toolName: "extracurricular_analysis",
    toolDescription: "Return the structured extracurricular analysis for this student.",
  });
}
