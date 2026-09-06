import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getDashboardMatches } from "@/lib/db/dashboard";
import { getRelevantUniversities, buildShortlist } from "@/lib/db/universities";
import { getSavedUniversities } from "@/lib/db/saved";
import { AnalyzeProfileButton } from "@/components/dashboard/AnalyzeProfileButton";
import { DashboardMatchesQueue } from "@/components/dashboard/DashboardMatchesQueue";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Search, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/onboarding");

  const [matches, saved] = await Promise.all([
    profile.profileStrength != null ? getDashboardMatches(profile.id) : Promise.resolve([]),
    getSavedUniversities(profile.id),
  ]);

  // The student's shortlist: universities in their target countries matching
  // their field of interest, spanning high-acceptance to highly-selective,
  // capped at SHORTLIST_SIZE. The automatic analysis queue below works
  // through whichever of these aren't analyzed yet, client-side at bounded
  // concurrency, without blocking this page load. Anything outside the
  // shortlist is still analyzable on demand from its own page or the search
  // panel.
  const shortlist =
    profile.profileStrength != null && profile.fieldOfInterest
      ? buildShortlist(await getRelevantUniversities(profile.fieldOfInterest.id, profile.targetCountryIds))
      : [];
  const shortlistIds = new Set(shortlist.map((r) => r.universityId));

  const pending = shortlist
    .filter((r) => !matches.some((m) => m.universityId === r.universityId))
    .map((r) => r.universityId);

  // The recommended feed is the SHORTLIST, not every analysis on file. A
  // university the student looked up themselves is stored (so searching it
  // again is instant and free) but it was never something we put forward, and
  // leaving it in the feed made one-off lookups accumulate as permanent
  // "recommendations".
  const recommended = matches.filter((m) => shortlistIds.has(m.universityId));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="text-muted-foreground">
            {profile.curriculum?.name ?? "No curriculum selected"}
            {profile.fieldOfInterest ? ` · Interested in ${profile.fieldOfInterest.name}` : ""}
          </p>
        </div>
        {profile.profileStrength != null ? (
          <Button nativeButton={false} render={<Link href="/onboarding">Edit &amp; Re-analyse Profile</Link>} />
        ) : (
          <AnalyzeProfileButton label="Analyse Your Profile" />
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
              <TrendingUp className="size-4" />
            </span>
            <span className="text-lg font-semibold">
              {profile.profileStrength != null ? `${profile.profileStrength.toFixed(1)}/10` : "—"}
            </span>
            <span className="text-xs text-muted-foreground">Profile strength</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
              <Search className="size-4" />
            </span>
            <span className="text-lg font-semibold">{recommended.length}</span>
            <span className="text-xs text-muted-foreground">Matches found</span>
          </CardContent>
        </Card>
        <Link href="/saved">
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardContent className="flex flex-col gap-1 py-4">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
                <Bookmark className="size-4" />
              </span>
              <span className="text-lg font-semibold">{saved.length}</span>
              <span className="text-xs text-muted-foreground">Saved schools</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {profile.profileStrength != null && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Profile strength</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Progress value={profile.profileStrength * 10} className="flex-1" />
              <span className="text-sm font-medium">{profile.profileStrength.toFixed(1)} / 10</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              A composite of your academic, extracurricular, and major-fit analyses — not an admission
              probability.
            </p>
            <Link href="/" className="mt-3 inline-block text-xs text-primary underline underline-offset-4">
              See why you got this rating
            </Link>
          </CardContent>
        </Card>
      )}

      {profile.profileStrength == null ? (
        <Card className="mt-8">
          <CardContent className="py-10 text-center text-muted-foreground">
            Run your analysis to rate your profile, then check your admission chances on any university
            page to see it appear here.
          </CardContent>
        </Card>
      ) : (
        <DashboardMatchesQueue
          initialMatches={recommended}
          pending={pending}
          savedUniversityIds={saved.map((s) => s.universityId)}
        />
      )}
    </div>
  );
}
