import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getDashboardMatches } from "@/lib/db/dashboard";
import { AnalyzeProfileButton } from "@/components/dashboard/AnalyzeProfileButton";
import { UniversityMatchCard } from "@/components/dashboard/UniversityMatchCard";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GROUPS = [
  { key: "reach" as const, title: "Reach", description: "Below your typical competitive range for this class of program." },
  { key: "target" as const, title: "Target", description: "Roughly matched to your current profile." },
  { key: "likely" as const, title: "Likely", description: "Comfortably within your competitive range." },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  if (!profile) redirect("/onboarding");

  const matches = profile.profileStrength != null ? await getDashboardMatches(profile.id) : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
          <p className="text-muted-foreground">
            {profile.intendedProgramCategory?.name ?? "No program selected"} ·{" "}
            {profile.preferredCountries.map((c) => c.name).join(", ") || "No countries selected"}
          </p>
        </div>
        <AnalyzeProfileButton label={profile.profileStrength != null ? "Re-analyze Profile" : "Analyze My Profile"} />
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
          </CardContent>
        </Card>
      )}

      {profile.profileStrength == null ? (
        <Card className="mt-8">
          <CardContent className="py-10 text-center text-muted-foreground">
            Run your analysis to see recommended universities, admission-likelihood estimates, and
            scholarship opportunities based on your profile.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {matches.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No universities in our database currently offer{" "}
              {profile.intendedProgramCategory?.name ?? "your intended program"} in your preferred
              countries. Try adding more countries, or search for a specific university below.
            </p>
          )}
          {GROUPS.map((group) => {
            const groupMatches = matches.filter((m) => m.classification === group.key);
            if (groupMatches.length === 0) return null;
            return (
              <div key={group.key}>
                <h2 className="text-lg font-medium">{group.title}</h2>
                <p className="text-sm text-muted-foreground">{group.description}</p>
                <div className="mt-3 flex flex-col gap-3">
                  {groupMatches.map((m) => (
                    <UniversityMatchCard key={m.universityProgramId} card={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
