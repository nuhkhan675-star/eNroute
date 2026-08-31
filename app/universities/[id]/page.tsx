import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversityWithPrograms } from "@/lib/db/universities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const university = await getUniversityWithPrograms(id);
  if (!university) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <UniversityPhoto
        photoUrl={university.photoUrl}
        alt={university.name}
        className="mb-6 h-48 w-full rounded-2xl border border-white/10"
        sizes="672px"
        iconClassName="size-12"
      />

      <h1 className="text-2xl font-semibold tracking-tight">{university.name}</h1>
      <p className="mt-1 text-muted-foreground">
        {[university.city, university.countryName].filter(Boolean).join(", ")}
        {university.universityType ? ` · ${university.universityType}` : ""}
      </p>
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
      {university.description && <p className="mt-4 text-sm">{university.description}</p>}
      {university.photoAttribution && (
        <p className="mt-2 text-xs text-muted-foreground">Photo: {university.photoAttribution}</p>
      )}

      <h2 className="mt-8 text-lg font-medium">Programs available</h2>
      <div className="mt-3 flex flex-col gap-3">
        {university.programs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No programs recorded for this university yet.
          </p>
        )}
        {university.programs.map((p) => (
          <Link key={p.id} href={`/universities/${university.id}/programs/${p.id}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">{p.displayName}</p>
                  <p className="text-sm text-muted-foreground">{p.categoryName}</p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {p.degreeLevel}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
