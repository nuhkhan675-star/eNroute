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

const SCORE_ROWS: { key: keyof NonNullable<Props["bundle"]["scores"]>; label: string }[] = [
  { key: "academic", label: "Academic competitiveness" },
  { key: "programFit", label: "Program fit" },
  { key: "extracurricular", label: "Extracurricular profile" },
  { key: "requirementsFit", label: "Requirements fit" },
  { key: "overall", label: "Overall competitiveness" },
];

export function ProgramAnalysis({ bundle, universityName, photoUrl }: Props) {
  const { classification, finalStrategy, scholarshipAnalysis, scores } = bundle;

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
            an invented exact probability, not an official admission prediction.
          </p>
          <Separator />
          <p className="text-sm">{finalStrategy.narrative}</p>
        </CardContent>
      </Card>

      {scores && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model assessment</CardTitle>
            <p className="text-xs text-muted-foreground">
              Our model&apos;s read of your profile against this program -- not an official university
              score.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {SCORE_ROWS.map((row) => (
              <div key={row.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{scores[row.key].toFixed(1)}/10</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
