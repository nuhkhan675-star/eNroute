import { runStructuredAgent } from "@/lib/ai/client";
import { majorFitAnalysisSchema, type MajorFitAnalysis, type AcademicAnalysis, type ExtracurricularAnalysis } from "@/lib/ai/schemas";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Major Fit Analyst inside a university admissions advisory system.
Given the academic and extracurricular analyses already produced by other specialist agents, judge
how well-prepared and how genuinely interested this student appears to be in a SPECIFIC target
program (given below). Identify concrete gaps rather than generic advice. Base your evaluation
strictly on the data given.
Frame your assessment constructively: always identify genuine strengths first, and phrase gaps as
concrete, actionable areas to improve rather than blunt criticism. Stay honest -- never inflate a
score or invent a strength the data doesn't support -- but keep the tone encouraging.`;

// The student's profile is university-agnostic (no "intended program" is
// collected during onboarding). Major fit is instead computed fresh each
// time against whichever specific program the student is checking their
// chances for, via the targetProgramName param.
export interface RequirementInput {
  description: string;
  minGrade: string | null;
}

export async function runMajorFitAnalyst(
  profile: FullStudentProfile,
  academic: AcademicAnalysis,
  extracurricular: ExtracurricularAnalysis,
  targetProgramName: string,
  requirements: RequirementInput[] = []
): Promise<MajorFitAnalysis> {
  const prompt = `Target program: ${targetProgramName}

Academic analysis:
${JSON.stringify(academic, null, 2)}

Extracurricular analysis:
${JSON.stringify(extracurricular, null, 2)}

Verified admission requirements for this program (FACT, from our database):
${
  requirements.length > 0
    ? requirements.map((r) => `- ${r.description}${r.minGrade ? ` (min: ${r.minGrade})` : ""}`).join("\n")
    : "None recorded -- do not assume any specific requirement exists."
}

Assess this student's fit for the target program: academic preparation, extracurricular
relevance, demonstrated interest, and specific gaps. Where a verified requirement above is clearly
met or clearly not met by the student's profile, say so explicitly and note it's based on a
verified requirement -- don't guess about requirements not listed above.

Score "requirements_fit_score" (0-10) specifically on how well the profile satisfies the verified
requirements list above -- 10 means every listed requirement is clearly met, lower scores reflect
missed or unconfirmed requirements. If no requirements are recorded, score it based on how
reasonable the profile looks for a program of this type in general, and say in "gaps" that no
official requirements were available to check against. Call the major_fit_analysis tool with your
structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: majorFitAnalysisSchema,
    toolName: "major_fit_analysis",
    toolDescription: "Return the structured major-fit analysis for this student.",
  });
}
