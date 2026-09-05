import { runStructuredAgent } from "@/lib/ai/client";
import {
  programFitBatchResponseSchema,
  type ProgramFitBatchItem,
  type AcademicAnalysis,
  type ExtracurricularAnalysis,
} from "@/lib/ai/schemas";

export interface UniversityToAnalyze {
  universityId: string;
  universityName: string;
  /** Subject areas this university is known for -- descriptive context, never a gate. */
  specialities: string[];
  /** Real programs on record at this university, if any -- descriptive context only. */
  knownPrograms: string[];
  /** Published score bands for admitted students, if we have them on record. */
  requirements: string[];
}

const SYSTEM_PROMPT = `You are the University Fit Analyst inside a university admissions advisory system.
You are given a student's already-computed academic and extracurricular analyses ONCE, and a LIST of
target universities to evaluate against that same profile. Produce one structured analysis per
university.

Your job is ONLY qualitative assessment: how well this student's profile fits EACH specific
university broadly, in the context of their field of interest, what's genuinely strong, and what's
genuinely missing. You are NOT evaluating fit against one single named degree program -- evaluate
general admissibility and fit for this university as a whole, using whatever specialities or real
programs you're told it's known for as context. You do NOT decide, state, or imply an admission
probability, percentage, or chance of getting in, and you do NOT decide a Reach/Target/Likely-style
label -- a separate deterministic system computes that from your scores and from each university's
real selectivity data. Never write a sentence like "you have a good/moderate/low chance of
admission" -- stick to describing fit, strengths, and gaps.

Score "program_fit_score" (0-10) on how well the student's academic background, subject choices, and
demonstrated interest align with this university's known specialities/programs and their own stated
field of interest.

Score "requirements_fit_score" (0-10) against the admitted-student score bands listed for that
university where they are given. Those bands are the middle 50% of ADMITTED students, not a cutoff:
scoring above the upper figure means the student is comfortably competitive on that measure, below
the lower figure means they are behind most admits, and inside the band means they are typical.
Where the student's own test scores are directly comparable, say so concretely in "strengths" or
"gaps" -- e.g. that their score sits above or below that university's admitted range. Do not convert
between different qualifications you cannot map reliably (an IB total is not an SAT score); if the
student's qualification isn't comparable to the bands given, judge general readiness instead and say
that the published bands weren't directly comparable. Where no bands are listed for a university,
lean on general subject/grade readiness and say so in "gaps" rather than inventing a requirement.

For "candidate_scholarships": leave this empty unless you were explicitly given real scholarship data
for this university -- never invent one, its amount, or its criteria.

Never state or estimate a university's acceptance rate. How selective a school is comes from real
published data elsewhere in the system, never from you -- an invented rate has no source behind it.

Frame every assessment constructively: identify genuine strengths first, phrase gaps as concrete,
actionable areas rather than blunt criticism, and never inflate a score or invent a strength the
data doesn't support. Every string in "strengths" and "gaps" must be its own short, punchy bullet
(one sentence, under ~20 words) specific to THIS student's data against THAT university -- never a
generic template line. Prioritize "improvement_recommendations" by realistic impact (high/medium/low)
and don't recommend something the profile is already strong in. Keep each university's "reasoning" to
2-3 plain sentences -- the strengths/gaps/recommendations lists already carry the detail.

CRITICAL: return exactly one entry in "analyses" for every university you were given, each with its
"university_id" copied exactly as given -- never fewer, never more, never a duplicate.`;

export async function runUniversityFitAnalystBatch(input: {
  academic: AcademicAnalysis;
  extracurricular: ExtracurricularAnalysis;
  universities: UniversityToAnalyze[];
}): Promise<Map<string, ProgramFitBatchItem>> {
  const { academic, extracurricular, universities } = input;

  const universitiesBlock = universities
    .map(
      (u, i) => `--- UNIVERSITY ${i + 1} (university_id: ${u.universityId}) ---
Name: ${u.universityName}

Known for (specialities): ${u.specialities.length > 0 ? u.specialities.join(", ") : "Not recorded"}

Real programs on record: ${u.knownPrograms.length > 0 ? u.knownPrograms.join(", ") : "None recorded -- do not assume a specific program exists"}

Admitted-student score bands (FACT, from our database):
${u.requirements.length > 0 ? u.requirements.map((r) => `- ${r}`).join("\n") : "None recorded -- do not assume any specific score requirement exists."}`
    )
    .join("\n\n");

  const prompt = `Academic analysis (already computed, profile-level, applies to every university below):
${JSON.stringify(academic, null, 2)}

Extracurricular analysis (already computed, profile-level, applies to every university below):
${JSON.stringify(extracurricular, null, 2)}

Evaluate this student's fit against EACH of the following ${universities.length} universit${universities.length === 1 ? "y" : "ies"}:

${universitiesBlock}

Call the university_fit_batch tool with one entry in "analyses" per university above.`;

  const result = await runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: programFitBatchResponseSchema,
    toolName: "university_fit_batch",
    toolDescription: "Return one structured university-fit analysis per university given.",
    maxTokens: 1200 * universities.length + 500,
  });

  const byId = new Map<string, ProgramFitBatchItem>();
  for (const item of result.analyses) byId.set(item.university_id, item);
  return byId;
}
