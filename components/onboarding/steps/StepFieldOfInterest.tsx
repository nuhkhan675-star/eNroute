"use client";

import { useOnboardingStore } from "@/lib/store/onboarding-store";
import type { ProgramCategory } from "@/lib/db/reference";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  categories: ProgramCategory[];
  onNext: () => void;
  onBack: () => void;
}

export function StepFieldOfInterest({ categories, onNext, onBack }: Props) {
  const fieldOfInterestId = useOnboardingStore((s) => s.draft.fieldOfInterestId);
  const setFieldOfInterest = useOnboardingStore((s) => s.setFieldOfInterest);

  const groups = new Map<string, ProgramCategory[]>();
  for (const c of categories) {
    if (!groups.has(c.parent_group)) groups.set(c.parent_group, []);
    groups.get(c.parent_group)!.push(c);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>What field are you interested in?</CardTitle>
        <CardDescription>
          We use this to rate your profile against your area of interest -- not to pick a specific
          university or program for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Select
          items={Object.fromEntries(categories.map((c) => [c.id, c.name]))}
          value={fieldOfInterestId}
          onValueChange={setFieldOfInterest}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select your field of interest" />
          </SelectTrigger>
          <SelectContent>
            {[...groups.entries()].map(([group, items]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext} disabled={!fieldOfInterestId}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
