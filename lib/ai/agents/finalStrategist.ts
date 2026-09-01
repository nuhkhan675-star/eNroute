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
import type { RequirementInput } from "@/lib/ai/agents/majorFitAnalyst";

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
verified FACT (state it as such) from what is your INFERENCE.
Write in an encouraging, constructive tone: open by naming what's genuinely working in the
student's favor before addressing gaps, and phrase every weakness as something actionable rather
than a verdict. Never inflate the classification or invent a strength that isn't supported by the
analyses you were given -- honesty about a Reach classification matters -- but the narrative should
leave the student feeling like they know what to do next, not discouraged.

Across "strengths", "weaknesses", and "missing_profile_components", make sure you cover -- to the
extent the data given supports it -- all of: (1) what in the profile helped, (2) what weakened it,
(3) how the grades compare against whatever academic/admission data is available, (4) whether the
subject combination fits the program, (5) how relevant the extracurriculars are, (6) whether
published minimum requirements are met, (7) how selective this university/program is, (8) how
complete/reliable the underlying data is (say so plainly when data is thin, don't hide it). Every
bullet must be specific to THIS student's actual data, never a generic template line. For example,
instead of "Your extracurriculars could be stronger," write something like "Your football
leadership shows sustained commitment, but the profile has no evidence of finance-related
initiative, which matters more for a program where demonstrated interest in the field is weighed."

Keep "narrative" SHORT: 2-3 plain sentences max, like a quick verdict a friend would give you --
not an essay. The detailed strengths, weaknesses, and improvement tips already go in their own
list fields below it, so do not restate them in the narrative or pad it with repeated detail.
Every string in "strengths", "weaknesses", and "missing_profile_components" must be its own short,
punchy bullet point (one sentence, ideally under ~20 words) -- never a multi-sentence paragraph
crammed into one bullet.`;

export interface FinalStrategistInput {
  profile: FullStudentProfile;
  universityName?: string;
  programName?: string;
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  majorFit: MajorFitAnalysis;
  classification: ClassificationResult;
  factualAcceptanceRate: number | null;
  requirements?: RequirementInput[];
}

export async function runFinalStrategist(input: FinalStrategistInput): Promise<FinalStrategy> {
  const {
    universityName,
    programName,
    academic,
    extracurricular,
    majorFit,
    classification,
    factualAcceptanceRate,
    requirements = [],
  } = input;

  const prompt = `${universityName ? `Target university: ${universityName}` : "This is a general profile analysis (no specific university selected)."}
${programName ? `Target program: ${programName}` : ""}

COMPUTED CLASSIFICATION (do not change this): ${classification.classification.toUpperCase()}
Likelihood range to use verbatim: ${classification.likelihoodRangeLabel}
Confidence: ${classification.confidence}
${
  factualAcceptanceRate != null
    ? `FACT: recorded acceptance rate is ${factualAcceptanceRate}%.`
    : "No verified acceptance-rate data is available for this program -- say so explicitly rather than guessing."
}

Verified admission requirements for this program (FACT, from our database):
${
  requirements.length > 0
    ? requirements.map((r) => `- ${r.description}${r.minGrade ? ` (min: ${r.minGrade})` : ""}`).join("\n")
    : "None recorded for this program yet."
}

Academic analysis: ${JSON.stringify(academic)}
Extracurricular analysis: ${JSON.stringify(extracurricular)}
Major fit analysis: ${JSON.stringify(majorFit)}

Where a verified requirement above is clearly met or clearly not met by the student's profile,
reflect that explicitly in "strengths" or "missing_profile_components" and mark it FACT rather
than inference. Write the final strategist result. The "classification" field must be exactly
"${classification.classification}". Call the final_strategy tool with your structured result.`;

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
