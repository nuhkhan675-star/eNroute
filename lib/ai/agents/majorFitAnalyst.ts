import { runStructuredAgent } from "@/lib/ai/client";
import { majorFitAnalysisSchema, type MajorFitAnalysis, type AcademicAnalysis, type ExtracurricularAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Major Fit Analyst inside a university admissions advisory system.
Given the academic and extracurricular analyses already produced by other specialist agents, judge
how well-prepared and how genuinely interested this student appears to be in their intended program.
Identify concrete gaps rather than generic advice. Base your evaluation strictly on the data given.`;

export async function runMajorFitAnalyst(
  profile: FullStudentProfile,
  academic: AcademicAnalysis,
  extracurricular: ExtracurricularAnalysis
): Promise<MajorFitAnalysis> {
  const prompt = `Intended program: ${profile.intendedProgramCategory?.name ?? "Not specified"}

Academic analysis:
${JSON.stringify(academic, null, 2)}

Extracurricular analysis:
${JSON.stringify(extracurricular, null, 2)}

Assess this student's fit for their intended program: academic preparation, extracurricular
relevance, demonstrated interest, and specific gaps. Call the major_fit_analysis tool with your
structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: majorFitAnalysisSchema,
    toolName: "major_fit_analysis",
    toolDescription: "Return the structured major-fit analysis for this student.",
  });
}
