import Link from "next/link";
import { notFound } from "next/navigation";
import { getUniversityProgramDetail } from "@/lib/db/universities";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { ArrowRight } from "lucide-react";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string; programId: string }>;
}) {
  const { programId } = await params;

  const detail = await getUniversityProgramDetail(programId);
  if (!detail) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <UniversityPhoto
        photoUrl={detail.university.photoUrl}
        alt={detail.university.name}
        className="mb-6 h-56 w-full rounded-2xl border border-border"
        sizes="1152px"
        iconClassName="size-12"
      />

      <p className="text-sm text-muted-foreground">{detail.university.name}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{detail.displayName}</h1>
      <p className="mt-1 text-muted-foreground">
        {detail.categoryName} · {detail.degreeLevel}
        {detail.durationYears ? ` · ${detail.durationYears} years` : ""}
      </p>

      {detail.overview && <p className="mt-4 max-w-2xl text-sm">{detail.overview}</p>}

      {detail.requirements.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">Admission requirements on record</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {detail.requirements.map((r, i) => (
              <li key={i}>
                {r.description}
                {r.minGrade ? ` (min: ${r.minGrade})` : ""}
              </li>
            ))}
          </ul>
        </>
      )}

      {detail.tuition.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">Tuition</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {detail.tuition.map((t, i) => (
              <li key={i}>
                {t.year}: {t.internationalAmount != null ? `${t.internationalAmount.toLocaleString()} ${t.currency} (international)` : "Data unavailable"}
              </li>
            ))}
          </ul>
        </>
      )}

      {detail.scholarships.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">Scholarships on record</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {detail.scholarships.map((s, i) => (
              <li key={i}>
                {s.name} ({s.amountType}
                {s.amount ? `, ${s.amount} ${s.currency ?? ""}` : ""})
              </li>
            ))}
          </ul>
        </>
      )}

      {detail.deadlines.length > 0 && (
        <>
          <h2 className="mt-8 text-lg font-medium">Deadlines</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
            {detail.deadlines.map((d, i) => (
              <li key={i}>
                {d.deadlineType}
                {d.applicantType ? ` (${d.applicantType})` : ""}: {d.date ?? "TBD"}
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href={`/universities/${detail.university.id}`}
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
      >
        See your admission chances at {detail.university.name} <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
