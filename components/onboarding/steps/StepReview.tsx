"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/store/onboarding-store";
import { submitOnboarding } from "@/lib/actions/profile";
import { EXAM_LABELS, CLIMATE_LABELS, INDUSTRY_HUB_LABELS, RANKING_BAND_LABELS } from "@/lib/validation/onboarding";
import type { Curriculum, ProgramCategory, Country } from "@/lib/db/reference";
import type { ProfileVersion } from "@/lib/db/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown } from "lucide-react";

interface Props {
  curricula: Curriculum[];
  categories: ProgramCategory[];
  countries: Country[];
  profileVersions: ProfileVersion[];
  onBack: () => void;
}

export function StepReview({ curricula, categories, countries, profileVersions, onBack }: Props) {
  const draft = useOnboardingStore((s) => s.draft);
  const reset = useOnboardingStore((s) => s.reset);
  const loadDraft = useOnboardingStore((s) => s.loadDraft);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showMethodology, setShowMethodology] = useState(false);

  const curriculum = curricula.find((c) => c.id === draft.curriculumId);
  const fieldOfInterest = categories.find((c) => c.id === draft.fieldOfInterestId);
  const targetCountryNames = countries.filter((c) => (draft.targetCountryIds ?? []).includes(c.id)).map((c) => c.name);

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
        <button
          type="button"
          onClick={() => setShowMethodology((v) => !v)}
          className="flex items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`size-3.5 transition-transform ${showMethodology ? "rotate-180" : ""}`} />
          How we analyze your profile
        </button>
        {showMethodology && (
          <div className="rounded-lg border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
            <p>
              We score six dimensions of your profile (academic competitiveness, program fit,
              extracurricular strength, leadership, achievements, and requirements fit), each 0-100.
              Those scores are combined with each university&apos;s real selectivity data -- never
              its ranking or prestige directly -- to produce your estimate. A university with thin or
              no verified admissions data gets a wider, lower-confidence estimate rather than a
              falsely precise one.
            </p>
          </div>
        )}

        {profileVersions.length > 0 && (
          <>
            <div>
              <p className="font-medium">Recent profiles</p>
              <p className="text-xs text-muted-foreground">
                Pick an older version to load it back into the form above and keep editing.
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {profileVersions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{new Date(v.createdAt).toLocaleString()}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => loadDraft(v.draft)}>
                      Use this version
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <Separator />
          </>
        )}

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
          {draft.casCompleted != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              CAS: {draft.casCompleted ? "Complete" : "Not yet complete"}
            </p>
          )}
        </div>
        <Separator />
        <div>
          <p className="font-medium">Target countries</p>
          <p className="text-muted-foreground">
            {targetCountryNames.length > 0 ? targetCountryNames.join(", ") : "No preference"}
          </p>
        </div>
        <Separator />
        <div>
          <p className="font-medium">
            Secondary school results {draft.grade10Board ? `(${draft.grade10Board})` : ""}
          </p>
          {(draft.grade9Subjects ?? []).length > 0 && (
            <>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Grade 9</p>
              <ul className="text-muted-foreground">
                {(draft.grade9Subjects ?? []).map((s) => (
                  <li key={s.id}>
                    {s.subjectName} — {s.grade}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="mt-1 text-xs font-medium text-muted-foreground">Grade 10</p>
          <ul className="text-muted-foreground">
            {(draft.grade10Subjects ?? []).map((s) => (
              <li key={s.id}>
                {s.subjectName} — {s.grade}
              </li>
            ))}
            {(draft.grade10Subjects ?? []).length === 0 && <li>—</li>}
          </ul>
          {(draft.grade11Subjects ?? []).length > 0 && (
            <>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Grade 11</p>
              <ul className="text-muted-foreground">
                {(draft.grade11Subjects ?? []).map((s) => (
                  <li key={s.id}>
                    {s.subjectName} — {s.grade}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <Separator />
        <div>
          <p className="font-medium">Field of interest</p>
          <p className="text-muted-foreground">{fieldOfInterest?.name ?? "—"}</p>
        </div>
        <Separator />
        <div>
          <p className="font-medium">Preferences</p>
          <p className="text-muted-foreground">
            {draft.preferredClimate ? CLIMATE_LABELS[draft.preferredClimate] : "No preference"} climate ·{" "}
            {draft.preferredIndustryHub ? INDUSTRY_HUB_LABELS[draft.preferredIndustryHub] : "No preference"} ·{" "}
            {draft.preferredRankingBand ? RANKING_BAND_LABELS[draft.preferredRankingBand] : "No preference"} ranking
          </p>
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
