import Link from "next/link";
import { searchUniversities } from "@/lib/db/universities";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";

export default async function UniversitiesSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q && q.trim().length > 1 ? await searchUniversities(q.trim()) : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Looking for a specific university?</h1>
      <p className="mt-1 text-muted-foreground">Search our database of universities and their programs.</p>

      <form className="mt-6 flex gap-2" action="/universities">
        <Input name="q" defaultValue={q ?? ""} placeholder="e.g. Nanyang Technological University" />
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6 flex flex-col gap-3">
        {q && results.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No universities matched &ldquo;{q}&rdquo; in our database yet.
          </p>
        )}
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
      </div>
    </div>
  );
}
