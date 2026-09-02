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

const IMPACT_SECTIONS: { priority: "high" | "medium" | "low"; label: string; style: string }[] = [
  { priority: "high", label: "High impact", style: "bg-red-500/15 text-red-400 border border-red-500/30" },
  { priority: "medium", label: "Medium impact", style: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  { priority: "low", label: "Optional", style: "bg-white/10 text-muted-foreground border border-white/15" },
];

const LEVEL_LABEL: Record<string, string> = {
  university: "university-wide",
  faculty: "faculty-wide",
  program: "program-specific",
};

export interface FactualRateForCompare {
  year: number;
  acceptanceRate: number | null;
  level: "university" | "faculty" | "program";
}

interface Props {
  bundle: ProgramAnalysisBundle;
  universityName?: string;
  photoUrl?: string | null;
  factualRate?: FactualRateForCompare | null;
}

const SCORE_ROWS: { key: keyof NonNullable<Props["bundle"]["scores"]>; label: string }[] = [
  { key: "academic", label: "Academic competitiveness" },
  { key: "programFit", label: "Program fit" },
  { key: "extracurricular", label: "Extracurricular profile" },
  { key: "requirementsFit", label: "Requirements fit" },
  { key: "overall", label: "Overall competitiveness" },
];

export function ProgramAnalysis({ bundle, universityName, photoUrl, factualRate }: Props) {
  const { classification, finalStrategy, scholarshipAnalysis, scores } = bundle;
  const hasFactualRate = factualRate && factualRate.acceptanceRate != null;
  const combinedGaps = [...finalStrategy.weaknesses, ...finalStrategy.missing_profile_components];

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
            <span className="capitalize">{finalStrategy.confidence} confidence</span> · This is a
            model-based estimate, not a guaranteed outcome, computed from your profile and whatever
            verified admissions data we have — never an invented exact probability, not an official
            admission prediction.
          </p>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            {hasFactualRate ? (
              <>
                <p className="text-xs text-muted-foreground">
                  University historical acceptance rate ({LEVEL_LABEL[factualRate!.level]}, {factualRate!.year})
                </p>
                <p className="text-sm font-medium">{factualRate!.acceptanceRate}%</p>
                <p className="mt-2 text-xs text-muted-foreground">Your estimated admission likelihood</p>
                <p className="text-sm font-medium">{classification.likelihoodRangeLabel.replace("Estimated admission likelihood: ", "")}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  These differ because the published rate reflects all applicants across a past
                  admissions cycle, while your estimate weighs your specific academic record, subject
                  fit, and extracurriculars against this program&apos;s requirements.
                  {factualRate!.level !== "program" &&
                    " University-level acceptance data was available, but program-specific admission data was not — treat your estimate as more directly relevant."}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No verified historical acceptance-rate data is available for this program yet, so your
                estimate above is based solely on your profile against this program&apos;s published
                requirements.
              </p>
            )}
          </div>

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
            <CardTitle className="text-base">What your profile already has</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {finalStrategy.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-emerald-400">✓</span> {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What your profile is missing</CardTitle>
          </CardHeader>
          <CardContent>
            {combinedGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your profile currently meets the major requirements we could verify.
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {combinedGaps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0">•</span> {s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What would strengthen your application</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {IMPACT_SECTIONS.map((section) => {
            const tips = finalStrategy.improvement_tips.filter((t) => t.priority === section.priority);
            if (tips.length === 0) return null;
            return (
              <div key={section.priority}>
                <Badge className={`uppercase ${section.style}`}>{section.label}</Badge>
                <ul className="mt-2 flex flex-col gap-1 pl-1 text-sm text-muted-foreground">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0">•</span> {tip.tip}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
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
