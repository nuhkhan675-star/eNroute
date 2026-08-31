"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_STEPS, type OnboardingStep } from "@/lib/validation/onboarding";
import type { Curriculum, ProgramCategory, Country } from "@/lib/db/reference";
import { StepCurriculum } from "./steps/StepCurriculum";
import { StepSubjects } from "./steps/StepSubjects";
import { StepExtracurriculars } from "./steps/StepExtracurriculars";
import { StepDegree } from "./steps/StepDegree";
import { StepCountries } from "./steps/StepCountries";
import { StepBudget } from "./steps/StepBudget";
import { StepReview } from "./steps/StepReview";

const STEP_LABELS: Record<OnboardingStep, string> = {
  curriculum: "Curriculum",
  subjects: "Subjects & Grades",
  extracurriculars: "Extracurriculars",
  degree: "Intended Degree",
  countries: "Preferred Countries",
  budget: "Budget",
  review: "Review & Analyze",
};

interface Props {
  curricula: Curriculum[];
  programCategories: ProgramCategory[];
  countries: Country[];
}

export function OnboardingWizard({ curricula, programCategories, countries }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex];

  const goNext = () => setStepIndex((i) => Math.min(i + 1, ONBOARDING_STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
          <span>{STEP_LABELS[step]}</span>
        </div>
        <Progress value={((stepIndex + 1) / ONBOARDING_STEPS.length) * 100} />
      </div>

      {step === "curriculum" && <StepCurriculum curricula={curricula} onNext={goNext} />}
      {step === "subjects" && <StepSubjects curricula={curricula} onNext={goNext} onBack={goBack} />}
      {step === "extracurriculars" && <StepExtracurriculars onNext={goNext} onBack={goBack} />}
      {step === "degree" && (
        <StepDegree programCategories={programCategories} onNext={goNext} onBack={goBack} />
      )}
      {step === "countries" && (
        <StepCountries countries={countries} onNext={goNext} onBack={goBack} />
      )}
      {step === "budget" && <StepBudget onNext={goNext} onBack={goBack} />}
      {step === "review" && (
        <StepReview
          curricula={curricula}
          programCategories={programCategories}
          countries={countries}
          onBack={goBack}
        />
      )}
    </div>
  );
}
