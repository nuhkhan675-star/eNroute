import { runStructuredAgent } from "@/lib/ai/client";
import { scholarshipAnalysisSchema, type ScholarshipAnalysis, type AcademicAnalysis, type ExtracurricularAnalysis } from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `You are the Scholarship Analyst inside a university admissions advisory
system. You are given a list of scholarships that ACTUALLY EXIST for this university/program
(sourced from the database) along with the student's profile. For each scholarship, estimate
whether the student is likely eligible based on its stated eligibility criteria and the student's
profile -- do not invent scholarships that were not given to you, and do not state amounts or
criteria other than what was provided.`;

export interface ScholarshipInput {
  name: string;
  amountType: string;
  amount: number | null;
  currency: string | null;
  eligibilityText: string | null;
}

export async function runScholarshipAnalyst(
  academic: AcademicAnalysis,
  extracurricular: ExtracurricularAnalysis,
  scholarships: ScholarshipInput[]
): Promise<ScholarshipAnalysis> {
  if (scholarships.length === 0) {
    return {
      candidate_scholarships: [],
      summary: "No scholarships are recorded for this program in our database yet.",
      confidence: "low",
    };
  }

  const prompt = `Student academic summary: ${academic.summary}
Student extracurricular summary: ${extracurricular.summary}

Scholarships on record for this university/program:
${scholarships
  .map(
    (s) =>
      `- ${s.name} (${s.amountType}${s.amount ? `, ${s.amount} ${s.currency ?? ""}` : ""})\n  Eligibility: ${
        s.eligibilityText ?? "Not specified"
      }`
  )
  .join("\n")}

For each scholarship, estimate the student's eligibility likelihood. Call the scholarship_analysis
tool with your structured result.`;

  return runStructuredAgent({
    system: SYSTEM_PROMPT,
    prompt,
    schema: scholarshipAnalysisSchema,
    toolName: "scholarship_analysis",
    toolDescription: "Return the structured scholarship analysis for this student and university.",
  });
}
