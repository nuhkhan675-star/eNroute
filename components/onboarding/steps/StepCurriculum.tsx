"use client";

import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { Curriculum } from "@/lib/db/reference";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  curricula: Curriculum[];
  onNext: () => void;
}

export function StepCurriculum({ curricula, onNext }: Props) {
  const curriculumId = useOnboardingStore((s) => s.draft.curriculumId);
  const setCurriculum = useOnboardingStore((s) => s.setCurriculum);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Which curriculum/board are you studying?</CardTitle>
        <CardDescription>This determines which subjects and grades we ask about next.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Select
          items={Object.fromEntries(curricula.map((c) => [c.id, c.name]))}
          value={curriculumId}
          onValueChange={setCurriculum}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your curriculum" />
          </SelectTrigger>
          <SelectContent>
            {curricula.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!curriculumId}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
