import Link from "next/link";
import { notFound } from "next/navigation";
import {
  searchUniversities,
  getUniversitiesByCountry,
  getUniversityCardExtras,
  getRelevantUniversities,
  buildShortlist,
  type UniversitySearchResult,
  type UniversityCardExtras,
} from "@/lib/db/universities";
import { getCountryById, getProgramCategories } from "@/lib/db/reference";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getUniversityAnalysesByUniversity, type UniversityAnalysisRecord } from "@/lib/db/analyses";
import { getDashboardMatches } from "@/lib/db/dashboard";
import { getSavedUniversityIds } from "@/lib/db/saved";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { FilterSortForm } from "@/components/universities/FilterSortForm";
import { CompareBar } from "@/components/universities/CompareBar";
import { UniversityGrid } from "@/components/universities/UniversityGrid";
import { TargetUniversityAnalysis } from "@/components/universities/TargetUniversityAnalysis";
import { DashboardMatchesQueue } from "@/components/dashboard/DashboardMatchesQueue";
import { ArrowLeft } from "lucide-react";

const CLASSIFICATION_ORDER: Record<string, number> = { likely: 0, target: 1, reach: 2, high_reach: 3 };
type SortKey = "name" | "ranking" | "tuition" | "likelihood";

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; country?: string; category?: string; sort?: string }>;
}) {
  const { q, country, category, sort } = await searchParams;

  if (q && q.trim().length > 1) {
    const results = await searchUniversities(q.trim());
    return (
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">Looking for a specific university?</h1>
        <p className="mt-1 text-muted-foreground">Search our database of universities and their programs.</p>

        <SearchForm defaultValue={q} />

        <div className="mt-6 flex flex-col gap-3">
          {results.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No universities matched &ldquo;{q}&rdquo; in our database yet.
            </p>
          )}
          <UniversityList results={results} />
        </div>

        <Link href="/universities" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to countries
        </Link>
      </div>
    );
  }

  if (country) {
    const [countryRow, categories] = await Promise.all([getCountryById(country), getProgramCategories()]);
    if (!countryRow) notFound();

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = user ? await getProfileByUserId(user.id) : null;

    // Never filter the list by field of interest automatically -- our
    // per-university program coverage is still thin (many schools only have
    // 1-3 programs on record), so defaulting the *list* to "has a matching
    // program" silently hid the other 47/50 universities in a country
    // instead of just deprioritizing them. An explicit category pick in the
    // URL still filters normally.
    const results = await getUniversitiesByCountry(country, category || undefined);

    const [initialEstimates, extras, savedIds] = await Promise.all([
      profile
        ? getUniversityAnalysesByUniversity(profile.id)
        : Promise.resolve({} as Record<string, UniversityAnalysisRecord>),
      getUniversityCardExtras(results.map((u) => u.id)),
      profile ? getSavedUniversityIds(profile.id) : Promise.resolve(new Set<string>()),
    ]);

    // Every university is analyzable regardless of whether it has a program
    // on record -- field of interest only decides which ones auto-queue for
    // background analysis (avoids firing a Gemini call for all 50 schools in
    // a country on page load; the rest are still one click away via
    // "Analyze My Chances" on their own page). This is a plain DB read (no
    // AI call), so the page can render every card immediately with
    // whatever's cached and let the client fill in the rest progressively.
    const relevant = profile
      ? await getRelevantUniversities(profile.fieldOfInterest?.id ?? null, [country])
      : [];
    const matchedIds = new Set(relevant.filter((r) => r.matchesFieldOfInterest).map((r) => r.universityId));
    const pendingAnalysis = results
      .filter((u) => matchedIds.has(u.id) && !initialEstimates[u.id])
      .map((u) => u.id);

    const sortKey: SortKey =
      sort === "ranking" || sort === "tuition" || sort === "likelihood" ? sort : "name";
    const sorted = sortResults(results, extras, initialEstimates, sortKey);

    // Without an explicit sort, surface the universities that match the
    // student's field of interest first -- closest to shortlisted's
    // "best-fit first" feel -- without hiding the rest of the country's
    // catalog to get there.
    const display =
      sortKey === "name" && profile?.fieldOfInterest
        ? [...sorted].sort((a, b) => Number(matchedIds.has(b.id)) - Number(matchedIds.has(a.id)))
        : sorted;

    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <Link href="/universities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to countries
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Universities in {countryRow.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {results.length} universit{results.length === 1 ? "y" : "ies"} in our database.
          {profile?.fieldOfInterest && !category
            ? ` Universities with a ${profile.fieldOfInterest.name} program on record are shown first, with your estimated chances.`
            : profile && " Your estimated chances fill in automatically on any card with program data."}
        </p>

        <FilterSortForm
          countryId={country}
          categories={categories}
          defaultCategory={category ?? ""}
          defaultSort={sortKey}
        />

        {results.length === 0 && category && (
          <p className="mt-6 text-sm text-muted-foreground">
            No universities in {countryRow.name} have a program in this category recorded in our
            database yet.
          </p>
        )}

        <UniversityGrid
          universities={display}
          initialEstimates={initialEstimates}
          extras={extras}
          pendingAnalysis={pendingAnalysis}
          savedUniversityIds={[...savedIds]}
        />
        <CompareBar />
      </div>
    );
  }


  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileByUserId(user.id) : null;

  // The unified "recommended for you" feed -- every university matching the
  // student's field of interest across all their target countries,
  // auto-analyzed progressively, the same data the dashboard shows. This is
  // the landing view now (closest to shortlisted's "Find Matches" feed)
  // instead of forcing a country pick before anything relevant appears; the
  // country grid below stays as the manual "browse everything" option.
  let matches: Awaited<ReturnType<typeof getDashboardMatches>> = [];
  let pending: string[] = [];
  let savedIds: string[] = [];
  if (profile) {
    savedIds = [...(await getSavedUniversityIds(profile.id))];
    if (profile.profileStrength != null) {
      matches = await getDashboardMatches(profile.id);
      if (profile.fieldOfInterest) {
        const relevant = await getRelevantUniversities(profile.fieldOfInterest.id, profile.targetCountryIds);
        const shortlist = buildShortlist(relevant);
        const shortlistIds = new Set(shortlist.map((r) => r.universityId));
        pending = shortlist
          .filter((r) => !matches.some((m) => m.universityId === r.universityId))
          .map((r) => r.universityId);
        // Same rule as the dashboard: recommend the shortlist, not every
        // analysis the student has ever triggered by searching.
        matches = matches.filter((m) => shortlistIds.has(m.universityId));
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Explore universities</h1>
      <p className="mt-1 text-muted-foreground">
        Search for a specific university, or browse your recommended matches below.
      </p>

      {profile?.profileStrength != null && <TargetUniversityAnalysis />}

      {profile?.profileStrength == null ? (
        profile && (
          <Card className="mt-8">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
              Analyse your profile to see universities matched to your field of interest, ranked by
              your chances, across every country you&apos;re targeting.
              <Button nativeButton={false} render={<Link href="/dashboard">Go to your dashboard</Link>} />
            </CardContent>
          </Card>
        )
      ) : (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Recommended for you</h2>
          <p className="text-sm text-muted-foreground">
            Matched to {profile?.fieldOfInterest?.name ?? "your field of interest"} across all your target
            countries, ranked by fit.
          </p>
          <DashboardMatchesQueue initialMatches={matches} pending={pending} savedUniversityIds={savedIds} />
        </div>
      )}

    </div>
  );
}

function sortResults(
  results: UniversitySearchResult[],
  extras: Record<string, UniversityCardExtras>,
  estimates: Record<string, UniversityAnalysisRecord>,
  sortKey: SortKey
): UniversitySearchResult[] {
  if (sortKey === "name") return results;
  const arr = [...results];
  if (sortKey === "ranking") {
    arr.sort((a, b) => (extras[a.id]?.ranking?.value ?? Infinity) - (extras[b.id]?.ranking?.value ?? Infinity));
  } else if (sortKey === "tuition") {
    arr.sort(
      (a, b) =>
        (extras[a.id]?.cheapestTuitionAmount ?? Infinity) - (extras[b.id]?.cheapestTuitionAmount ?? Infinity)
    );
  } else if (sortKey === "likelihood") {
    arr.sort((a, b) => {
      const oa = estimates[a.id] ? CLASSIFICATION_ORDER[estimates[a.id].category] : 4;
      const ob = estimates[b.id] ? CLASSIFICATION_ORDER[estimates[b.id].category] : 4;
      return oa - ob;
    });
  }
  return arr;
}

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form className="mt-6 flex gap-2" action="/universities">
      <Input name="q" defaultValue={defaultValue} placeholder="e.g. Nanyang Technological University" />
      <Button type="submit">Search</Button>
    </form>
  );
}

function UniversityList({ results }: { results: UniversitySearchResult[] }) {
  return (
    <>
      {results.map((u) => (
        <Link key={u.id} href={`/universities/${u.id}`}>
          <Card className="overflow-hidden transition-colors hover:border-primary/40">
            <CardContent className="flex items-center gap-4 p-0">
              <UniversityPhoto photoUrl={u.photoUrl} alt={u.name} className="size-16 shrink-0" sizes="64px" iconClassName="size-6" />
              <div className="py-4">
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[u.city, u.countryName].filter(Boolean).join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}

