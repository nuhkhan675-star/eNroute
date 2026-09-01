import Link from "next/link";
import { notFound } from "next/navigation";
import {
  searchUniversities,
  getCountriesWithUniversityCounts,
  getUniversitiesByCountry,
  getUniversityCardExtras,
  getChosenProgramsForUniversities,
  type UniversitySearchResult,
  type UniversityCardExtras,
} from "@/lib/db/universities";
import { getCountryById, getProgramCategories } from "@/lib/db/reference";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId, type FullStudentProfile } from "@/lib/db/profiles";
import { getCachedChanceEstimatesByUniversity, type CachedChanceEstimate } from "@/lib/db/analyses";
import { ensureGeneralAnalyses } from "@/lib/ai/orchestrator";
import { analyzeUniversityProgram } from "@/lib/ai/analyzeProgram";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { RankingBadge } from "@/components/universities/RankingBadge";
import { FilterSortForm } from "@/components/universities/FilterSortForm";
import { CompareToggle } from "@/components/universities/CompareToggle";
import { CompareBar } from "@/components/universities/CompareBar";
import { ArrowLeft, GraduationCap, Award } from "lucide-react";

const CLASSIFICATION_STYLES: Record<string, string> = {
  reach: "bg-red-500/15 text-red-400 border border-red-500/30",
  target: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  likely: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
};

const CLASSIFICATION_ORDER: Record<string, number> = { likely: 0, target: 1, reach: 2 };
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
    const results = await getUniversitiesByCountry(country, category || undefined);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = user ? await getProfileByUserId(user.id) : null;
    const [initialEstimates, extras] = await Promise.all([
      profile
        ? getCachedChanceEstimatesByUniversity(profile.id)
        : Promise.resolve({} as Record<string, CachedChanceEstimate>),
      getUniversityCardExtras(results.map((u) => u.id)),
    ]);

    // Auto-run chances for every card on this page that doesn't have one
    // cached yet (only possible for universities with program data -- most
    // don't have any yet, which naturally bounds the AI-call volume).
    const estimates = profile
      ? await autoAnalyzeMissingEstimates(profile, results, initialEstimates)
      : initialEstimates;

    const sortKey: SortKey =
      sort === "ranking" || sort === "tuition" || sort === "likelihood" ? sort : "name";
    const sorted = sortResults(results, extras, estimates, sortKey);

    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <Link href="/universities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to countries
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Universities in {countryRow.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {results.length} universit{results.length === 1 ? "y" : "ies"} in our database.
          {profile && " Your estimated chances show automatically on any card with program data."}
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((u) => (
            <UniversityGridCard key={u.id} university={u} estimate={estimates[u.id]} extras={extras[u.id]} />
          ))}
        </div>
        <CompareBar />
      </div>
    );
  }

  const countries = await getCountriesWithUniversityCounts();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Explore universities</h1>
      <p className="mt-1 text-muted-foreground">
        Pick a country to browse its universities, or search for one by name.
      </p>

      <SearchForm defaultValue="" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {countries.map((c) => (
          <Link key={c.id} href={`/universities?country=${c.id}`}>
            <Card className="h-full overflow-hidden transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <GraduationCap className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.universityCount} universit{c.universityCount === 1 ? "y" : "ies"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Analyzes every university-with-a-program in `results` that doesn't
// already have a cached estimate, in parallel with bounded concurrency, then
// returns the refreshed estimate map. Failures (rate limits, etc.) are
// swallowed per-university -- that card just stays without an estimate
// rather than breaking the whole page.
async function autoAnalyzeMissingEstimates(
  profile: FullStudentProfile,
  results: UniversitySearchResult[],
  estimates: Record<string, CachedChanceEstimate>
): Promise<Record<string, CachedChanceEstimate>> {
  const chosenPrograms = await getChosenProgramsForUniversities(
    results.map((u) => u.id),
    profile.fieldOfInterest?.id ?? null
  );
  const needsAnalysis = results.filter((u) => chosenPrograms[u.id] && !estimates[u.id]);
  if (needsAnalysis.length === 0) return estimates;

  const { academic, extracurricular } = await ensureGeneralAnalyses(profile);
  await mapWithConcurrency(needsAnalysis, 2, async (u) => {
    try {
      await analyzeUniversityProgram({
        profile,
        academic,
        extracurricular,
        universityProgramId: chosenPrograms[u.id].id,
      });
    } catch (err) {
      console.error(`Auto-analysis failed for ${u.name}:`, err instanceof Error ? err.message : err);
    }
  });

  return getCachedChanceEstimatesByUniversity(profile.id);
}

function sortResults(
  results: UniversitySearchResult[],
  extras: Record<string, UniversityCardExtras>,
  estimates: Record<string, CachedChanceEstimate>,
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
      const oa = estimates[a.id] ? CLASSIFICATION_ORDER[estimates[a.id].classification] : 3;
      const ob = estimates[b.id] ? CLASSIFICATION_ORDER[estimates[b.id].classification] : 3;
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

function UniversityGridCard({
  university,
  estimate,
  extras,
}: {
  university: UniversitySearchResult;
  estimate?: CachedChanceEstimate;
  extras?: UniversityCardExtras;
}) {
  return (
    <div className="relative h-full">
      <div className="absolute right-2 top-2 z-10">
        <CompareToggle universityId={university.id} />
      </div>
      <Link href={`/universities/${university.id}`} className="block h-full">
        <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/40">
        <UniversityPhoto
          photoUrl={university.photoUrl}
          alt={university.name}
          className="h-32 w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          iconClassName="size-8"
        />
        <CardContent className="flex flex-1 flex-col gap-2 py-4">
          <div>
            <p className="line-clamp-2 font-medium leading-snug">{university.name}</p>
            <p className="text-sm text-muted-foreground">{university.city ?? university.countryName}</p>
          </div>

          {extras?.ranking && <RankingBadge ranking={extras.ranking} />}

          {estimate && (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">{estimate.programName}</p>
              <Badge className={`w-fit gap-1 capitalize ${CLASSIFICATION_STYLES[estimate.classification]}`}>
                {estimate.classification} · {estimate.likelihoodRangeLabel}
              </Badge>
              <p className="text-xs text-muted-foreground">{estimate.confidence} confidence</p>
              {estimate.whySnippet && <p className="text-xs text-muted-foreground">{estimate.whySnippet}</p>}
            </div>
          )}

          <div className="mt-auto flex flex-col gap-1 pt-1 text-xs text-muted-foreground">
            {extras?.cheapestTuitionAmount != null && (
              <p>
                From {extras.cheapestTuitionAmount.toLocaleString()} {extras.cheapestTuitionCurrency}/yr
              </p>
            )}
            {extras?.hasScholarships && (
              <p className="flex items-center gap-1 text-primary">
                <Award className="size-3.5" /> Scholarships available
              </p>
            )}
          </div>
        </CardContent>
        </Card>
      </Link>
    </div>
  );
}
