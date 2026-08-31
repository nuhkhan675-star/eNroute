import { runStructuredAgent } from "@/lib/ai/client";
import { extracurricularAnalysisSchema, type ExtracurricularAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Extracurricular Analyst inside a university admissions advisory
system. Evaluate the student's activities on leadership, commitment (duration + depth), impact,
achievement/selectivity, initiative, and relevance to their intended program -- NOT on quantity.
A student with two deep, high-impact activities should score higher than one with ten shallow ones.
Base your evaluation strictly on the data given; do not invent achievements or impact that were not
described.`;

export async function runExtracurricularAnalyst(
  profile: FullStudentProfile
): Promise<ExtracurricularAnalysis> {
  const prompt = `Intended program: ${profile.intendedProgramCategory?.name ?? "Not specified"}

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

Evaluate depth, leadership, commitment, impact, and relevance to the intended program. Call the
extracurricular_analysis tool with your structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: extracurricularAnalysisSchema,
    toolName: "extracurricular_analysis",
    toolDescription: "Return the structured extracurricular analysis for this student.",
  });
}
