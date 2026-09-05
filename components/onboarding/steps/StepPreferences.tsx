"use client";

import { useOnboardingStore } from "@/lib/store/onboarding-store";
import {
  climateOptions,
  industryHubOptions,
  rankingBandOptions,
  CLIMATE_LABELS,
  INDUSTRY_HUB_LABELS,
  RANKING_BAND_LABELS,
} from "@/lib/validation/onboarding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  onNext: () => void;
  onBack: () => void;
}

// Lifestyle/fit preferences -- optional, informational for now. Only
// preferredRankingBand is wired into an actual filter (dashboard matches
// list); climate and industry hub are stored and shown but not used to
// score or rank universities, since we have no real data to back a fit
// score on those dimensions.
export function StepPreferences({ onNext, onBack }: Props) {
  const draft = useOnboardingStore((s) => s.draft);
  const setPreferredClimate = useOnboardingStore((s) => s.setPreferredClimate);
  const setPreferredIndustryHub = useOnboardingStore((s) => s.setPreferredIndustryHub);
  const setPreferredRankingBand = useOnboardingStore((s) => s.setPreferredRankingBand);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>
          Optional -- these help us show you more relevant options, but never affect your admission
          chance estimates.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label>Preferred climate</Label>
          <Select
            items={Object.fromEntries(climateOptions.map((v) => [v, CLIMATE_LABELS[v]]))}
            value={draft.preferredClimate ?? "no_preference"}
            onValueChange={(v) => setPreferredClimate(v as typeof draft.preferredClimate)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {climateOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {CLIMATE_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Industry hub</Label>
          <Select
            items={Object.fromEntries(industryHubOptions.map((v) => [v, INDUSTRY_HUB_LABELS[v]]))}
            value={draft.preferredIndustryHub ?? "no_preference"}
            onValueChange={(v) => setPreferredIndustryHub(v as typeof draft.preferredIndustryHub)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {industryHubOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {INDUSTRY_HUB_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Preferred ranking band</Label>
          <Select
            items={Object.fromEntries(rankingBandOptions.map((v) => [v, RANKING_BAND_LABELS[v]]))}
            value={draft.preferredRankingBand ?? "no_preference"}
            onValueChange={(v) => setPreferredRankingBand(v as typeof draft.preferredRankingBand)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rankingBandOptions.map((v) => (
                <SelectItem key={v} value={v}>
                  {RANKING_BAND_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
