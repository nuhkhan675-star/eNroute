"use client";

import { useState } from "react";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { examTypes, EXAM_LABELS } from "@/lib/validation/onboarding";
import type { Country } from "@/lib/db/reference";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const SCORE_PLACEHOLDER: Record<string, string> = {
  SAT: "e.g. 1450 (out of 1600)",
  ACT: "e.g. 32 (out of 36)",
  IELTS: "e.g. 7.5 (band score)",
  TOEFL_IBT: "e.g. 105 (out of 120)",
  DUOLINGO: "e.g. 130 (out of 160)",
  GRE: "e.g. 325 (out of 340)",
  GMAT: "e.g. 700 (out of 800)",
  PTE_ACADEMIC: "e.g. 75 (out of 90)",
  OTHER: "Score / result",
};

const SAT_SECTION_SCORES = Array.from({ length: 61 }, (_, i) => String(200 + i * 10));

interface Props {
  countries: Country[];
  onNext: () => void;
  onBack: () => void;
}

export function StepExamScores({ countries, onNext, onBack }: Props) {
  const examScores = useOnboardingStore((s) => s.draft.examScores);
  const addExamScore = useOnboardingStore((s) => s.addExamScore);
  const removeExamScore = useOnboardingStore((s) => s.removeExamScore);
  const targetCountryIds = useOnboardingStore((s) => s.draft.targetCountryIds ?? []);

  const targetsUS = countries.some((c) => c.iso_code === "US" && targetCountryIds.includes(c.id));

  const [examType, setExamType] = useState<(typeof examTypes)[number] | null>(null);
  const [score, setScore] = useState("");

  const canAdd = examType && score.trim();

  const handleAdd = () => {
    if (!examType || !score.trim()) return;
    addExamScore({ id: crypto.randomUUID(), examType, score: score.trim() });
    setExamType(null);
    setScore("");
  };

  const satMathScore = examScores.find((e) => e.examType === "SAT_MATH");
  const satRWScore = examScores.find((e) => e.examType === "SAT_READING_WRITING");

  const setSatSection = (examType: "SAT_MATH" | "SAT_READING_WRITING", value: string) => {
    const existing = examScores.find((e) => e.examType === examType);
    if (existing) removeExamScore(existing.id);
    if (value) addExamScore({ id: crypto.randomUUID(), examType, score: value });
  };

  const otherExamTypes = examTypes.filter((t) => t !== "SAT_MATH" && t !== "SAT_READING_WRITING");
  const otherScores = examScores.filter((e) => e.examType !== "SAT_MATH" && e.examType !== "SAT_READING_WRITING");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standardized test scores</CardTitle>
        <CardDescription>
          Add any exams you&apos;ve taken (SAT, IELTS, GRE, etc.) with your score. Optional — skip
          this if you haven&apos;t taken any yet.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {targetsUS && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">
              Shown because you selected the US as a target country -- SAT sections apply regardless
              of curriculum.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>SAT Math</Label>
                <Select
                  items={Object.fromEntries(SAT_SECTION_SCORES.map((s) => [s, s]))}
                  value={satMathScore?.score ?? null}
                  onValueChange={(v) => setSatSection("SAT_MATH", v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {SAT_SECTION_SCORES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>SAT Reading & Writing</Label>
                <Select
                  items={Object.fromEntries(SAT_SECTION_SCORES.map((s) => [s, s]))}
                  value={satRWScore?.score ?? null}
                  onValueChange={(v) => setSatSection("SAT_READING_WRITING", v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {SAT_SECTION_SCORES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Select
            items={Object.fromEntries(otherExamTypes.map((t) => [t, EXAM_LABELS[t]]))}
            value={examType}
            onValueChange={(v) => setExamType(v as (typeof examTypes)[number] | null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Exam" />
            </SelectTrigger>
            <SelectContent>
              {otherExamTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {EXAM_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-2">
            <Input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder={examType ? SCORE_PLACEHOLDER[examType] : "Score"}
            />
          </div>

          <Button type="button" variant="secondary" onClick={handleAdd} disabled={!canAdd}>
            + Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {otherScores.map((e) => (
            <Badge key={e.id} variant="outline" className="gap-1 py-1.5">
              {EXAM_LABELS[e.examType]}: {e.score}
              <button
                type="button"
                onClick={() => removeExamScore(e.id)}
                aria-label={`Remove ${EXAM_LABELS[e.examType]}`}
                className="ml-1 rounded-full hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

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
