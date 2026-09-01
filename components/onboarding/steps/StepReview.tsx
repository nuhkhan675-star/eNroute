"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { submitOnboarding } from "@/lib/actions/profile";
import { EXAM_LABELS } from "@/lib/validation/onboarding";
import type { Curriculum, ProgramCategory } from "@/lib/db/reference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Props {
  curricula: Curriculum[];
  categories: ProgramCategory[];
  onBack: () => void;
}

export function StepReview({ curricula, categories, onBack }: Props) {
  const draft = useOnboardingStore((s) => s.draft);
  const reset = useOnboardingStore((s) => s.reset);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const curriculum = curricula.find((c) => c.id === draft.curriculumId);
  const fieldOfInterest = categories.find((c) => c.id === draft.fieldOfInterestId);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await submitOnboarding(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      reset();
      router.push("/dashboard");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review your profile</CardTitle>
        <CardDescription>Confirm everything looks right before we rate it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div>
          <p className="font-medium">Curriculum</p>
          <p className="text-muted-foreground">{curriculum?.name ?? "—"}</p>
        </div>
        <Separator />
        <div>
          <p className="font-medium">Subjects ({draft.subjects.length})</p>
          <ul className="text-muted-foreground">
            {draft.subjects.map((s, i) => (
              <li key={i}>
                {s.subjectName}
                {s.level ? ` (${s.level})` : ""} — {s.grade}
              </li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <p className="font-medium">Field of interest</p>
          <p className="text-muted-foreground">{fieldOfInterest?.name ?? "—"}</p>
        </div>
        <Separator />
        <div>
          <p className="font-medium">Extracurriculars ({draft.extracurriculars.length})</p>
          <ul className="text-muted-foreground">
            {draft.extracurriculars.map((a) => (
              <li key={a.id}>{a.activityName}</li>
            ))}
          </ul>
        </div>
        <Separator />
        <div>
          <p className="font-medium">Test scores ({draft.examScores.length})</p>
          <ul className="text-muted-foreground">
            {draft.examScores.map((e) => (
              <li key={e.id}>
                {EXAM_LABELS[e.examType]}: {e.score}
              </li>
            ))}
            {draft.examScores.length === 0 && <li>None provided</li>}
          </ul>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} disabled={isPending}>
            Back
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : "Rate My Profile"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
