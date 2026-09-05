import type { UniversityAnalysisRecord } from "@/lib/db/analyses";
import { CATEGORY_LABELS, chancePoint } from "@/lib/ai/prediction/scoringEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";

const CATEGORY_STYLES: Record<string, string> = {
  high_reach: "bg-red-500/15 text-red-300 border border-red-500/40",
  reach: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
  target: "bg-blue-500/15 text-blue-300 border border-blue-500/40",
  likely: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
};

const SELECTIVITY_LABELS: Record<string, string> = {
  extreme: "Extremely selective",
  very_high: "Very highly selective",
  high: "Highly selective",
  moderate: "Moderately selective",
  low: "Less selective",
};

const IMPACT_SECTIONS: { priority: "high" | "medium" | "low"; label: string; style: string }[] = [
  { priority: "high", label: "High impact", style: "bg-red-500/15 text-red-400 border border-red-500/30" },
  { priority: "medium", label: "Medium impact", style: "bg-amber-500/15 text-amber-400 border border-amber-500/30" },
  { priority: "low", label: "Optional", style: "bg-secondary text-muted-foreground border border-border" },
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
  analysis: UniversityAnalysisRecord;
  factualRate?: FactualRateForCompare | null;
}

const SCORE_ROWS: { key: keyof Pick<UniversityAnalysisRecord, "academicScore" | "programFitScore" | "extracurricularScore" | "leadershipScore" | "achievementScore" | "requirementsFitScore">; label: string }[] = [
  { key: "academicScore", label: "Academic competitiveness" },
  { key: "programFitScore", label: "Program fit" },
  { key: "extracurricularScore", label: "Extracurricular profile" },
  { key: "leadershipScore", label: "Leadership / impact" },
  { key: "achievementScore", label: "Achievement strength" },
  { key: "requirementsFitScore", label: "Requirements fit" },
];

export function ProgramAnalysis({ analysis, factualRate }: Props) {
  const hasFactualRate = factualRate && factualRate.acceptanceRate != null;
  const isExtremelySelective = analysis.selectivityLevel === "extreme" || analysis.selectivityLevel === "very_high";

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <UniversityPhoto
              photoUrl={analysis.photoUrl}
              alt={analysis.universityName}
              className="size-11 shrink-0 overflow-hidden rounded-full border border-border"
              sizes="44px"
              iconClassName="size-5"
            />
            <CardTitle className="text-base">Admissions estimate</CardTitle>
          </div>
          <Badge className={CATEGORY_STYLES[analysis.category]}>{CATEGORY_LABELS[analysis.category]}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-semibold tracking-tight">
            {chancePoint(analysis.chanceMin, analysis.chanceMax)}%
          </p>
          <p className="text-xs text-muted-foreground">
            {SELECTIVITY_LABELS[analysis.selectivityLevel]} program ·{" "}
            <span className="capitalize">{analysis.confidence} confidence</span>
            {isExtremelySelective && " · admissions at this level of selectivity are especially unpredictable"}
          </p>
          <p className="text-xs text-muted-foreground">
            Estimated by our admissions model from your profile and whatever verified admissions data
            we have. This is not an official prediction or guarantee from the university, and it is
            never a precise number pretending to be certain.
          </p>

          <div className="rounded-lg border border-border bg-muted/60 p-3">
            {hasFactualRate ? (
              <>
                <p className="text-xs text-muted-foreground">
                  University historical acceptance rate ({LEVEL_LABEL[factualRate!.level]}, {factualRate!.year})
                </p>
                <p className="text-sm font-medium">{factualRate!.acceptanceRate}%</p>
                <p className="mt-2 text-xs text-muted-foreground">Your estimated admission likelihood</p>
                <p className="text-sm font-medium">{chancePoint(analysis.chanceMin, analysis.chanceMax)}%</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  These differ because the published rate reflects all applicants across a past
                  admissions cycle, while your estimate weighs your specific academic record, subject
                  fit, and extracurriculars against this program&apos;s requirements and this
                  university&apos;s overall selectivity.
                  {factualRate!.level !== "program" &&
                    " University-level acceptance data was available, but program-specific admission data was not — treat your estimate as more directly relevant."}
                </p>
              </>
            ) : analysis.selectivityBasis === "ai_estimate" ? (
              <>
                {/* No published rate and no ranking existed for this school, so
                    the selectivity baseline came from the model's general
                    knowledge. That is a materially weaker footing than either
                    real branch above, so it is stated outright rather than
                    blended into the generic "no data" wording. */}
                <p className="text-xs font-medium text-amber-400">
                  AI-estimated selectivity &mdash; not from a published source
                </p>
                {analysis.selectivityRate != null && (
                  <p className="mt-1 text-sm font-medium">
                    ~{analysis.selectivityRate}% <span className="text-xs font-normal text-muted-foreground">(estimated, unverified)</span>
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  We hold no published acceptance rate and no world ranking for this university, so
                  its selectivity was estimated by our AI from general knowledge of the institution.
                  Treat it as a rough starting point, not a fact &mdash; it carries no source, and your
                  estimate above is shown at low confidence with a deliberately wide range because of it.
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                No verified historical acceptance-rate data is available for this program yet, so your
                estimate above leans more heavily on this university&apos;s general selectivity level
                and your profile against this program&apos;s published requirements.
              </p>
            )}
          </div>

          <Separator />
          <p className="text-sm">{analysis.reasoning}</p>
        </CardContent>
      </Card>

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
              <span className="font-medium">{analysis[row.key]}/100</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What your profile already has</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="shrink-0 text-emerald-400">✓</span> {s}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">What your profile is missing</CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.gaps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Your profile currently meets the major requirements we could verify.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {analysis.gaps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0">•</span> {s}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">What would strengthen your application</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {IMPACT_SECTIONS.map((section) => {
            const tips = analysis.recommendations.filter((t) => t.priority === section.priority);
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

      {analysis.candidateScholarships.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Scholarship fit</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            {analysis.candidateScholarships.map((s, i) => (
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
