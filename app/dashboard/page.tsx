import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/currentUser";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getSavedUniversities } from "@/lib/db/saved";
import { getCountries } from "@/lib/db/reference";
import { AnalyzeProfileButton } from "@/components/dashboard/AnalyzeProfileButton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Globe, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/onboarding");

  // Building the shortlist meant scanning every university in the student's
  // target countries. With the matches feed moved to the Explore page, this
  // page needs neither that nor the analyses -- just the saved count and the
  // countries themselves.
  const [saved, allCountries] = await Promise.all([
    getSavedUniversities(profile.id),
    getCountries(),
  ]);

  // The profile stores country ids only, so resolve them for display.
  const targetCountryNames = allCountries
    .filter((c) => profile.targetCountryIds.includes(c.id))
    .map((c) => c.name);

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
              <Globe className="size-4" />
            </span>
            <span className="text-lg font-semibold">{targetCountryNames.length || "—"}</span>
            {/* The names wrap rather than truncate -- a student targeting six
                countries should see all six, not "Hong Kong, Singapore,...". */}
            <span className="text-xs leading-tight text-muted-foreground">
              {targetCountryNames.length > 0 ? targetCountryNames.join(", ") : "Target countries"}
            </span>
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
        // Recommendations live on the Explore page now, behind their own
        // button, rather than being duplicated on both surfaces.
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            Your matched universities are on the Explore page, ranked by how well each one fits your
            profile.
            <Button
              nativeButton={false}
              render={<Link href="/universities">Explore universities</Link>}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
