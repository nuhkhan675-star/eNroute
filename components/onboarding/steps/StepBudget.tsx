"use client";

import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const CURRENCIES = ["USD", "GBP", "EUR", "SGD", "CAD", "AUD", "AED", "INR"];

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function StepBudget({ onNext, onBack }: Props) {
  const budget = useOnboardingStore((s) => s.draft);
  const setBudget = useOnboardingStore((s) => s.setBudget);

  const preferNotToSay = budget.budgetSkipped;

  return (
    <Card>
      <CardHeader>
        <CardTitle>What is your maximum yearly budget?</CardTitle>
        <CardDescription>Optional — we can still analyze your profile without it.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-2 text-sm font-normal">
            <input
              type="checkbox"
              checked={preferNotToSay}
              onChange={(e) =>
                setBudget(
                  e.target.checked
                    ? { budgetSkipped: true, budgetAmount: null, budgetCurrency: null, budgetIncludesLiving: null }
                    : { budgetSkipped: false }
                )
              }
              className="h-4 w-4"
            />
            Prefer not to say
          </Label>
        </div>

        {!preferNotToSay && (
          <>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <div className="flex flex-col gap-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min={0}
                  value={budget.budgetAmount ?? ""}
                  onChange={(e) =>
                    setBudget({ budgetAmount: e.target.value ? Number(e.target.value) : null })
                  }
                  placeholder="e.g. 40000"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Currency</Label>
                <Select
                  items={Object.fromEntries(CURRENCIES.map((c) => [c, c]))}
                  value={budget.budgetCurrency}
                  onValueChange={(v) => setBudget({ budgetCurrency: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Does this budget include living expenses?</Label>
              <RadioGroup
                value={budget.budgetIncludesLiving ?? undefined}
                onValueChange={(v) => setBudget({ budgetIncludesLiving: v as "yes" | "no" | "not_sure" })}
                className="flex gap-6"
              >
                {(["yes", "no", "not_sure"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={v} />
                    {v === "yes" ? "Yes" : v === "no" ? "No" : "Not sure"}
                  </label>
                ))}
              </RadioGroup>
            </div>
          </>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Continue</Button>
        </div>
      </CardContent>
    </Card>
  );
}
