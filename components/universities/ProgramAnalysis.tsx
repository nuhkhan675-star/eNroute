import type { ProgramAnalysisBundle } from "@/lib/db/analyses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";

const CLASSIFICATION_STYLES: Record<string, string> = {
  reach: "bg-red-500/15 text-red-400 border border-red-500/30",
  target: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  likely: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
};

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-500/15 text-red-400 border border-red-500/30",
  medium: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  low: "bg-white/10 text-muted-foreground border border-white/15",
};

interface Props {
  bundle: ProgramAnalysisBundle;
  universityName?: string;
  photoUrl?: string | null;
}

export function ProgramAnalysis({ bundle, universityName, photoUrl }: Props) {
  const { classification, finalStrategy, scholarshipAnalysis, costEstimate } = bundle;

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <UniversityPhoto
              photoUrl={photoUrl ?? null}
              alt={universityName ?? ""}
              className="size-11 shrink-0 overflow-hidden rounded-full border border-white/10"
              sizes="44px"
              iconClassName="size-5"
            />
            <CardTitle className="text-base">Admissions estimate</CardTitle>
          </div>
          <Badge className={`capitalize ${CLASSIFICATION_STYLES[classification.classification]}`}>
            {classification.classification}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">{classification.likelihoodRangeLabel}</p>
          <p className="text-xs text-muted-foreground">
            {finalStrategy.confidence} confidence · This is a model-based estimate, not a guaranteed
            outcome, computed from your profile and whatever verified admissions data we have — never
            an invented exact probability.
          </p>
          <Separator />
          <p className="text-sm">{finalStrategy.narrative}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground">
              {finalStrategy.strengths.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weaknesses</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground">
              {finalStrategy.weaknesses.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {finalStrategy.missing_profile_components.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Missing from your profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-4 text-sm text-muted-foreground">
              {finalStrategy.missing_profile_components.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Improvement tips</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {finalStrategy.improvement_tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge className={`shrink-0 uppercase ${PRIORITY_STYLES[tip.priority]}`}>{tip.priority}</Badge>
              <p className="text-sm">{tip.tip}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {scholarshipAnalysis && scholarshipAnalysis.candidate_scholarships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scholarship fit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {scholarshipAnalysis.candidate_scholarships.map((s, i) => (
              <div key={i}>
                <p className="text-sm font-medium">
                  {s.name} <Badge variant="outline" className="ml-1 capitalize">{s.likelihood} likelihood</Badge>
                </p>
                <p className="text-sm text-muted-foreground">{s.reasoning}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {costEstimate && costEstimate.tuitionAmount != null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estimated cost</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-sm">
              Best case (likely scholarships applied): {costEstimate.bestCaseNetCost} {costEstimate.currency}
            </p>
            <p className="text-sm">
              Worst case (no scholarships): {costEstimate.worstCaseNetCost} {costEstimate.currency}
            </p>
            {costEstimate.notes.map((n, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {n}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
