import { runStructuredAgent } from "@/lib/ai/client";
import {
  finalStrategySchema,
  type FinalStrategy,
  type AcademicAnalysis,
  type ExtracurricularAnalysis,
  type MajorFitAnalysis,
} from "@/lib/ai/schemas";
import type { ClassificationResult } from "@/lib/ai/classification";
import type { FullStudentProfile } from "@/lib/db/profiles";

const SYSTEM_PROMPT = `You are the Final Admissions Strategist inside a university admissions
advisory system. You are given: the outputs of specialist analyst agents, and a classification
(Reach/Target/Likely) that has ALREADY been computed deterministically from the student's scores and
factual admission-statistics data. Your job is to write a clear, honest narrative explanation that is
CONSISTENT with the given classification -- you must not contradict it or imply a different, more
precise probability than the range you are given. Your "classification" field in the response MUST
exactly match the classification you were given.

Identify SPECIFIC weaknesses, not generic advice ("do more extracurriculars" is not acceptable).
Prioritize improvement tips by realistic impact (high/medium/low), and do not recommend unnecessary
activities if the student's profile is already strong in that area. Clearly separate what is a
verified FACT (state it as such) from what is your INFERENCE.`;

export interface FinalStrategistInput {
  profile: FullStudentProfile;
  universityName?: string;
  programName?: string;
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  majorFit: MajorFitAnalysis;
  classification: ClassificationResult;
  factualAcceptanceRate: number | null;
}

export async function runFinalStrategist(input: FinalStrategistInput): Promise<FinalStrategy> {
  const {
    profile,
    universityName,
    programName,
    academic,
    extracurricular,
    majorFit,
    classification,
    factualAcceptanceRate,
  } = input;

  const prompt = `Student intended program: ${profile.intendedProgramCategory?.name ?? "Not specified"}
${universityName ? `Target university: ${universityName}` : "This is a general profile analysis (no specific university selected)."}
${programName ? `Target program: ${programName}` : ""}

COMPUTED CLASSIFICATION (do not change this): ${classification.classification.toUpperCase()}
Likelihood range to use verbatim: ${classification.likelihoodRangeLabel}
Confidence: ${classification.confidence}
${
  factualAcceptanceRate != null
    ? `FACT: recorded acceptance rate is ${factualAcceptanceRate}%.`
    : "No verified acceptance-rate data is available for this program -- say so explicitly rather than guessing."
}

Academic analysis: ${JSON.stringify(academic)}
Extracurricular analysis: ${JSON.stringify(extracurricular)}
Major fit analysis: ${JSON.stringify(majorFit)}

Write the final strategist result. The "classification" field must be exactly "${classification.classification}".
Call the final_strategy tool with your structured result.`;

  const result = await runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: finalStrategySchema,
    toolName: "final_strategy",
    toolDescription: "Return the final structured admissions strategy narrative.",
    maxTokens: 3000,
  });

  // Belt-and-suspenders: the classification is a deterministic fact, not an
  // AI decision, so we overwrite it even if the model drifted.
  return { ...result, classification: classification.classification };
}
