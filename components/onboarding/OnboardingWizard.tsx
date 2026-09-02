"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_STEPS, type OnboardingDraft, type OnboardingStep } from "@/lib/validation/onboarding";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { Curriculum, ProgramCategory } from "@/lib/db/reference";
import { StepCurriculum } from "./steps/StepCurriculum";
import { StepSubjects } from "./steps/StepSubjects";
import { StepGrade10 } from "./steps/StepGrade10";
import { StepFieldOfInterest } from "./steps/StepFieldOfInterest";
import { StepExtracurriculars } from "./steps/StepExtracurriculars";
import { StepExamScores } from "./steps/StepExamScores";
import { StepReview } from "./steps/StepReview";

const STEP_LABELS: Record<OnboardingStep, string> = {
  curriculum: "Curriculum",
  subjects: "Subjects & Grades",
  grade10: "Grade 10 Result",
  fieldOfInterest: "Field of Interest",
  extracurriculars: "Extracurriculars",
  examScores: "Test Scores",
  review: "Review & Analyze",
};

interface Props {
  curricula: Curriculum[];
  categories: ProgramCategory[];
  existingDraft: OnboardingDraft | null;
}

export function OnboardingWizard({ curricula, categories, existingDraft }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex];
  const hydrateIfEmpty = useOnboardingStore((s) => s.hydrateIfEmpty);

  useEffect(() => {
    if (existingDraft) hydrateIfEmpty(existingDraft);
    // Only ever run once on mount -- this seeds an untouched draft, it must
    // not re-fire and stomp on edits the user makes afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {step === "grade10" && <StepGrade10 onNext={goNext} onBack={goBack} />}
      {step === "fieldOfInterest" && (
        <StepFieldOfInterest categories={categories} onNext={goNext} onBack={goBack} />
      )}
      {step === "extracurriculars" && <StepExtracurriculars onNext={goNext} onBack={goBack} />}
      {step === "examScores" && <StepExamScores onNext={goNext} onBack={goBack} />}
      {step === "review" && <StepReview curricula={curricula} categories={categories} onBack={goBack} />}
    </div>
  );
}
