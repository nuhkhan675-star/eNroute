import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getSavedUniversities } from "@/lib/db/saved";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { SavedStatusSelect } from "@/components/universities/SavedStatusSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";

export default async function SavedSchoolsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getProfileByUserId(user.id);
  const saved = profile ? await getSavedUniversities(profile.id) : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Saved schools</h1>
      <p className="text-muted-foreground">Track your application progress for universities you&apos;ve bookmarked.</p>

      {saved.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <Bookmark className="size-6 text-primary" />
            </div>
            <p className="font-medium">No saved schools yet</p>
            <p className="text-sm text-muted-foreground">
              Browse universities and bookmark the ones you&apos;re interested in to track them here.
            </p>
            <Button nativeButton={false} render={<Link href="/universities">Browse universities</Link>} />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {saved.map((s) => (
            <Card key={s.universityId} className="overflow-hidden">
              <CardContent className="flex items-center gap-4 p-0">
                <Link href={`/universities/${s.universityId}`} className="shrink-0">
                  <UniversityPhoto photoUrl={s.photoUrl} alt={s.universityName} className="size-20" sizes="80px" iconClassName="size-6" />
                </Link>
                <div className="flex flex-1 items-center justify-between gap-3 py-3 pr-4">
                  <div>
                    <Link href={`/universities/${s.universityId}`} className="font-medium hover:underline">
                      {s.universityName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {[s.city, s.countryName].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <SavedStatusSelect universityId={s.universityId} status={s.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
