import { notFound } from "next/navigation";
import { getUniversityWithPrograms, getUniversitiesForAnalysis } from "@/lib/db/universities";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUniversityAnalysis } from "@/lib/db/analyses";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { ProgramAnalysis } from "@/components/universities/ProgramAnalysis";
import { AnalyzeUniversityButton } from "@/components/universities/AnalyzeUniversityButton";
import { RankingBadge } from "@/components/universities/RankingBadge";
import { CompareToggle } from "@/components/universities/CompareToggle";
import { SaveToggle } from "@/components/universities/SaveToggle";
import { isUniversitySaved } from "@/lib/db/saved";
import { } from "lucide-react";

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const university = await getUniversityWithPrograms(id);
  if (!university) notFound();

  const user = await getCurrentUser();
  const profile = user ? await getProfileByUserId(user.id) : null;

  // Cache-only read -- never triggers a Gemini call just from viewing this
  // page. Analysis only runs when the student explicitly clicks "Analyze My
  // Chances" (see AnalyzeUniversityButton), so browsing several universities
  // never silently burns API quota. Chances are computed per-university now,
  // not per-program -- a missing program on record never blocks this.
  const [analysis, statsMap, saved] = await Promise.all([
    profile ? getUniversityAnalysis(profile.id, university.id) : Promise.resolve(null),
    getUniversitiesForAnalysis([university.id]),
    profile ? isUniversitySaved(profile.id, university.id) : Promise.resolve(false),
  ]);
  const factualStats = statsMap.get(university.id)?.admissionStatistics ?? null;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <UniversityPhoto
        photoUrl={university.photoUrl}
        alt={university.name}
        className="mb-6 h-48 w-full rounded-2xl border border-border"
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
          {user && <SaveToggle universityId={university.id} initialSaved={saved} />}
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
        <p className="mt-2 text-xs text-muted-foreground">
          Photo:{" "}
          {university.photoSourceUrl ? (
            <a href={university.photoSourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {university.photoAttribution}
            </a>
          ) : (
            university.photoAttribution
          )}
        </p>
      )}

      {(university.specialities.length > 0 || university.programs.length > 0) && (
        <>
          <h2 className="mt-8 text-lg font-medium">Specialities &amp; programs</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Descriptive detail about what this university offers -- your chance estimate below is
            computed for the university as a whole, not any one specific program.
          </p>
          {university.specialities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {university.specialities.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
          )}
          {university.programs.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm text-muted-foreground">
              {university.programs.map((p) => (
                <li key={p.id}>
                  {p.displayName} <span className="text-xs">({p.categoryName})</span>
                </li>
              ))}
            </ul>
          )}
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
        ) : analysis ? (
          <div className="flex flex-col gap-4">
            <ProgramAnalysis analysis={analysis} factualRate={factualStats} />
            <div className="flex justify-center gap-3">
              <AnalyzeUniversityButton universityId={university.id} hasExistingAnalysis />
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center text-sm text-muted-foreground">
              See an estimate of your admission chances, strengths, and gaps for {university.name}.
              <AnalyzeUniversityButton universityId={university.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
