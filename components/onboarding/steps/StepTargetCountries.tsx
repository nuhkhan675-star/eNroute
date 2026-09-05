"use client";

import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { getAdmissionsContext } from "@/lib/content/admissionsContext";
import type { Country } from "@/lib/db/reference";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  countries: Country[];
  onNext: () => void;
  onBack: () => void;
}

// Empty selection = "no preference" -- matches against every supported
// country. This directly powers which universities are treated as
// "relevant" for automatic analysis (see getRelevantUniversities).
export function StepTargetCountries({ countries, onNext, onBack }: Props) {
  const targetCountryIds = useOnboardingStore((s) => s.draft.targetCountryIds ?? []);
  const setTargetCountryIds = useOnboardingStore((s) => s.setTargetCountryIds);

  const toggle = (id: string) => {
    setTargetCountryIds(
      targetCountryIds.includes(id) ? targetCountryIds.filter((c) => c !== id) : [...targetCountryIds, id]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Which countries are you targeting?</CardTitle>
        <CardDescription>
          Select any number, or leave all unselected for no preference. This decides which
          universities we automatically check your chances against.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => {
            const selected = targetCountryIds.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {c.name}
              </button>
            );
          })}
        </div>

        {targetCountryIds.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No preference selected -- we&apos;ll check your chances across all supported countries.
          </p>
        )}

        {targetCountryIds.length > 0 && (
          <div className="flex flex-col gap-3">
            {targetCountryIds.map((id) => {
              const country = countries.find((c) => c.id === id);
              if (!country) return null;
              const context = getAdmissionsContext(country.iso_code);
              if (!context) return null;
              return (
                <div key={id} className="rounded-lg border border-border bg-muted/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Admissions context: {country.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{context.summary}</p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
