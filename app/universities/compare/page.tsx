import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversityWithPrograms, getUniversityCardExtras } from "@/lib/db/universities";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUniversityAnalysis } from "@/lib/db/analyses";
import { CATEGORY_LABELS, chancePoint } from "@/lib/ai/prediction/scoringEngine";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { RankingBadge } from "@/components/universities/RankingBadge";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

const MAX_COMPARE = 4;

const CATEGORY_STYLES: Record<string, string> = {
  high_reach: "bg-red-500/15 text-red-300 border border-red-500/40",
  reach: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
  target: "bg-blue-500/15 text-blue-300 border border-blue-500/40",
  likely: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const ids = (idsParam ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_COMPARE);
  if (ids.length < 2) notFound();

  const user = await getCurrentUser();
  const profile = user ? await getProfileByUserId(user.id) : null;

  const universities = await Promise.all(ids.map((id) => getUniversityWithPrograms(id)));
  const validUniversities = universities.filter((u): u is NonNullable<typeof u> => u != null);
  if (validUniversities.length < 2) notFound();

  const extrasByUniversity = await getUniversityCardExtras(validUniversities.map((u) => u.id));

  const analyses = profile
    ? await Promise.all(
        validUniversities.map(async (u) => ({
          universityId: u.id,
          analysis: await getUniversityAnalysis(profile.id, u.id),
        }))
      )
    : [];
  const analysisByUniversity = Object.fromEntries(analyses.map((b) => [b.universityId, b]));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Compare universities</h1>
      <p className="mt-1 text-muted-foreground">
        Side-by-side facts and (where you&apos;ve already checked) your admission estimate -- nothing
        here is computed fresh just from viewing this page.
      </p>

      <div className="mt-6 overflow-x-auto">
        <div className="grid min-w-[640px] gap-4" style={{ gridTemplateColumns: `repeat(${validUniversities.length}, minmax(220px, 1fr))` }}>
          {validUniversities.map((u) => (
            <div key={u.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <UniversityPhoto
                photoUrl={u.photoUrl}
                alt={u.name}
                className="h-28 w-full rounded-lg"
                sizes="300px"
                iconClassName="size-8"
              />
              <div>
                <Link href={`/universities/${u.id}`} className="font-medium hover:text-primary">
                  {u.name}
                </Link>
                <p className="text-sm text-muted-foreground">{[u.city, u.countryName].filter(Boolean).join(", ")}</p>
              </div>

              <Row label="Ranking">
                {u.rankings.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {u.rankings.map((r, i) => (
                      <RankingBadge key={i} ranking={r} />
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Not ranked</span>
                )}
              </Row>

              <Row label="Tuition (from)">
                {extrasByUniversity[u.id]?.cheapestTuitionAmount != null ? (
                  <span className="text-sm">
                    {extrasByUniversity[u.id].cheapestTuitionAmount!.toLocaleString()}{" "}
                    {extrasByUniversity[u.id].cheapestTuitionCurrency}/yr
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Data unavailable</span>
                )}
              </Row>

              <Row label="Scholarships">
                {extrasByUniversity[u.id]?.hasScholarships ? (
                  <span className="flex items-center gap-1 text-sm text-primary">
                    <Award className="size-3.5" /> Available
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">None recorded</span>
                )}
              </Row>

              <Row label="Your chances">
                {!profile ? (
                  <span className="text-sm text-muted-foreground">Log in to see</span>
                ) : analysisByUniversity[u.id]?.analysis ? (
                  <div className="flex flex-col gap-1">
                    <Badge className={`w-fit gap-1 ${CATEGORY_STYLES[analysisByUniversity[u.id].analysis!.category]}`}>
                      {CATEGORY_LABELS[analysisByUniversity[u.id].analysis!.category]} ·{" "}
                      {chancePoint(analysisByUniversity[u.id].analysis!.chanceMin, analysisByUniversity[u.id].analysis!.chanceMax)}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {analysisByUniversity[u.id].analysis!.confidence} confidence
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Not yet analyzed --{" "}
                    <Link href={`/universities/${u.id}`} className="underline">
                      check it
                    </Link>
                  </span>
                )}
              </Row>

              <Link
                href={`/universities/${u.id}`}
                className="mt-2 text-center text-sm text-primary underline underline-offset-4"
              >
                View full analysis
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
