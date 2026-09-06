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
  /**
   * True only when this university has NEITHER a real published acceptance
   * rate NOR a ranking -- i.e. it would otherwise land at "unknown"
   * selectivity. Decided by the caller from real data, never by the model,
   * so the model can never talk its way into overriding a real figure.
   */
  needsAcceptanceRateEstimate: boolean;
  /**
   * A pre-computed statement of how the student's UCAS Tariff total compares
   * to this university's published band. Null when the student is not on
   * A-levels or the university has no band on record. The comparison is
   * arithmetic and is done in code -- the model reports it, never redoes it.
   */
  tariffAssessment?: string | null;
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
university where they are given.

Where a UCAS Tariff comparison is supplied, it has already been calculated for you against this
university's published band. Use its verdict directly and reflect it in "requirements_fit_score" and
in "strengths" or "gaps" -- do not recompute the points, convert grades yourself, or second-guess
which side of the band the student falls on. Those bands are the middle 50% of ADMITTED students, not a cutoff:
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

ACCEPTANCE RATES. Never state or imply an acceptance rate anywhere in your prose -- not in
"reasoning", "strengths", "gaps", or any other text field. How selective a school is normally comes
from real published data elsewhere in the system, never from you.

The single exception is the "estimated_acceptance_rate" field, and ONLY for universities explicitly
marked below as "NO SELECTIVITY DATA ON RECORD". For those, and only those, supply your best
estimate of that university's overall undergraduate acceptance rate (0-100) from your general
knowledge of the institution -- its reputation, country, type, size and competitiveness.

Read this next part carefully, because getting it wrong is worse than useless:
- If you do not genuinely recognise the university, or you would be guessing from its name alone,
  return null. Null is a good answer and the CORRECT answer for an institution you do not actually
  know. A wrong number is far more damaging than no number, because the system treats what you
  return as a real signal.
- Do not derive a rate from the name, from the country's general competitiveness, or from the fact
  that the university appears in this list. Base it on actual knowledge of that specific
  institution, or return null.
- Do not anchor on a figure you remember for a similarly-named school.
- In "estimated_acceptance_rate_basis", state in one short sentence what the estimate rests on
  (e.g. "large public flagship, historically admits a substantial majority of applicants").
  Return null there too whenever the rate is null.
- For every university NOT marked "NO SELECTIVITY DATA ON RECORD", return null for both fields.
  We already hold real data for those and your estimate would be discarded.

You still never decide the student's admission probability or a Reach/Target/Likely label. The
estimate above describes the SCHOOL, not the student; the deterministic engine decides what it
means for this applicant.

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
${u.requirements.length > 0 ? u.requirements.map((r) => `- ${r}`).join("\n") : "None recorded -- do not assume any specific score requirement exists."}

Selectivity data on record: ${u.needsAcceptanceRateEstimate ? "NONE -- NO SELECTIVITY DATA ON RECORD. You may estimate estimated_acceptance_rate for this university, or return null if you do not genuinely know it." : "Yes, real data already held -- return null for estimated_acceptance_rate."}

UCAS Tariff comparison (ALREADY COMPUTED, treat as fact): ${u.tariffAssessment ?? "Not applicable -- the student is not on A-levels, or this university has no published tariff band on record."}`
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
