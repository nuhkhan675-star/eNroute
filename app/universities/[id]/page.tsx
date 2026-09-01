import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversityWithPrograms, getUniversityProgramDetail } from "@/lib/db/universities";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getProgramAnalysisBundle, type ProgramAnalysisBundle } from "@/lib/db/analyses";
import { ensureGeneralAnalyses } from "@/lib/ai/orchestrator";
import { analyzeUniversityProgram } from "@/lib/ai/analyzeProgram";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { ProgramAnalysis } from "@/components/universities/ProgramAnalysis";
import { AnalyzeProgramButton } from "@/components/universities/AnalyzeProgramButton";
import { RankingBadge } from "@/components/universities/RankingBadge";
import { CompareToggle } from "@/components/universities/CompareToggle";
import { MessageCircle } from "lucide-react";

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const university = await getUniversityWithPrograms(id);
  if (!university) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileByUserId(user.id) : null;

  const chosenProgram =
    university.programs.length > 0
      ? (university.programs.find((p) => p.categoryId === profile?.fieldOfInterest?.id) ?? university.programs[0])
      : null;

  const chosenProgramDetail = chosenProgram ? await getUniversityProgramDetail(chosenProgram.id) : null;

  let bundle: ProgramAnalysisBundle | null = null;
  let analysisError: string | null = null;

  if (profile && chosenProgram) {
    bundle = await getProgramAnalysisBundle(profile.id, chosenProgram.id);
    if (!bundle) {
      try {
        const { academic, extracurricular } = await ensureGeneralAnalyses(profile);
        const result = await analyzeUniversityProgram({
          profile,
          academic,
          extracurricular,
          universityProgramId: chosenProgram.id,
        });
        if (result) {
          bundle = {
            classification: result.classification,
            finalStrategy: result.finalStrategy,
            scholarshipAnalysis: result.scholarshipAnalysis,
            scores: result.scores,
            analyzedAt: new Date().toISOString(),
          };
        }
      } catch (err) {
        analysisError = err instanceof Error ? err.message : "We couldn't analyze your chances here yet.";
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <UniversityPhoto
        photoUrl={university.photoUrl}
        alt={university.name}
        className="mb-6 h-48 w-full rounded-2xl border border-white/10"
        sizes="672px"
        iconClassName="size-12"
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{university.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {[university.city, university.countryName].filter(Boolean).join(", ")}
            {university.universityType ? ` · ${university.universityType}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <CompareToggle universityId={university.id} />
          {university.rankings.map((r, i) => (
            <RankingBadge key={i} ranking={{ value: r.value, type: r.type, org: r.org, year: r.year }} />
          ))}
        </div>
      </div>

      {university.website && (
        <a
          href={university.website}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm text-primary underline underline-offset-4"
        >
          {university.website}
        </a>
      )}
      {university.description ? (
        <p className="mt-4 text-sm">{university.description}</p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          We don&apos;t have a verified overview of this university yet.
        </p>
      )}
      {university.photoAttribution && (
        <p className="mt-2 text-xs text-muted-foreground">Photo: {university.photoAttribution}</p>
      )}

      <h2 className="mt-8 text-lg font-medium">Programs available</h2>
      <div className="mt-3 flex flex-col gap-3">
        {university.programs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No programs recorded for this university yet.
          </p>
        )}
        {university.programs.map((p) => (
          <Link key={p.id} href={`/universities/${university.id}/programs/${p.id}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{p.displayName}</p>
                  <p className="text-sm text-muted-foreground">{p.categoryName}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {p.degreeLevel}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {chosenProgram && (
        <>
          <h2 className="mt-8 text-lg font-medium">
            Admission requirements <span className="text-xs font-normal text-muted-foreground">(FACT)</span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">For {chosenProgram.displayName}.</p>
          <Card className="mt-3">
            <CardContent className="flex flex-col gap-2 py-4">
              {!chosenProgramDetail || chosenProgramDetail.requirements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not recorded in our database yet.</p>
              ) : (
                chosenProgramDetail.requirements.map((r, i) => (
                  <p key={i} className="text-sm">
                    {r.description}
                    {r.minGrade ? ` (min: ${r.minGrade})` : ""}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <h2 className="mt-8 text-lg font-medium">Your chances</h2>
      <div className="mt-3">
        {!user ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              <a href="/login" className="underline">
                Log in
              </a>{" "}
              to see a personalized analysis for this university.
            </CardContent>
          </Card>
        ) : !profile ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Complete your{" "}
              <a href="/onboarding" className="underline">
                profile
              </a>{" "}
              to see a personalized analysis.
            </CardContent>
          </Card>
        ) : university.programs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              We don&apos;t have program-level data for this university yet, so we can&apos;t
              estimate your chances honestly. Check back as we add more universities.
            </CardContent>
          </Card>
        ) : analysisError ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center text-sm text-muted-foreground">
              {analysisError}
              {chosenProgram && <AnalyzeProgramButton universityProgramId={chosenProgram.id} />}
            </CardContent>
          </Card>
        ) : bundle && chosenProgram ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Based on {chosenProgram.displayName}
              {chosenProgram.categoryId === profile.fieldOfInterest?.id
                ? " (matches your field of interest)"
                : " -- closest program we have data for"}
              .
            </p>
            <ProgramAnalysis bundle={bundle} universityName={university.name} photoUrl={university.photoUrl} />
            <div className="flex justify-center gap-3">
              <AnalyzeProgramButton universityProgramId={chosenProgram.id} hasExistingAnalysis />
              <Link
                href={`/chat?program=${chosenProgram.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-sm hover:border-primary/50 hover:bg-primary/10"
              >
                <MessageCircle className="size-4" /> Ask the advisor about this
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
