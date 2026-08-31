import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUniversityProgramDetail } from "@/lib/db/universities";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getProgramAnalysisBundle } from "@/lib/db/analyses";
import { ProgramFacts } from "@/components/universities/ProgramFacts";
import { ProgramAnalysis } from "@/components/universities/ProgramAnalysis";
import { AnalyzeProgramButton } from "@/components/universities/AnalyzeProgramButton";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { Card, CardContent } from "@/components/ui/card";

export default async function ProgramAnalysisPage({
  params,
}: {
  params: Promise<{ id: string; programId: string }>;
}) {
  const { programId } = await params;

  const detail = await getUniversityProgramDetail(programId);
  if (!detail) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await getProfileByUserId(user.id) : null;
  const bundle = profile ? await getProgramAnalysisBundle(profile.id, programId) : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <UniversityPhoto
        photoUrl={detail.university.photoUrl}
        alt={detail.university.name}
        className="mb-6 h-44 w-full rounded-2xl border border-white/10"
        sizes="768px"
        iconClassName="size-12"
      />

      <p className="text-sm text-muted-foreground">{detail.university.name}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{detail.displayName}</h1>
      <p className="mt-1 text-muted-foreground">
        {detail.categoryName} · {detail.degreeLevel}
        {detail.durationYears ? ` · ${detail.durationYears} years` : ""}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-medium">Program facts</h2>
          <ProgramFacts detail={detail} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-medium">Your chances</h2>
          {!user ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <a href="/login" className="underline">
                  Log in
                </a>{" "}
                to see a personalized analysis for this program.
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
          ) : bundle ? (
            <div className="flex flex-col gap-4">
              <ProgramAnalysis
                bundle={bundle}
                universityName={detail.university.name}
                photoUrl={detail.university.photoUrl}
              />
              <AnalyzeProgramButton universityProgramId={programId} />
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center text-sm text-muted-foreground">
                See an estimate of your admission chances, scholarship fit, and cost for this specific
                program.
                <AnalyzeProgramButton universityProgramId={programId} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
