import type { UniversityProgramDetail, DataProvenance } from "@/lib/db/universities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function ProvenanceLine({ provenance }: { provenance: DataProvenance }) {
  if (!provenance.sourceName && !provenance.dataYear) {
    return <p className="text-xs text-muted-foreground">Source not verified.</p>;
  }
  return (
    <p className="text-xs text-muted-foreground">
      Source: {provenance.sourceUrl ? (
        <a href={provenance.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {provenance.sourceName ?? provenance.sourceUrl}
        </a>
      ) : (
        provenance.sourceName ?? "Unknown"
      )}
      {provenance.dataYear ? ` · ${provenance.dataYear}` : ""}
      {provenance.lastVerifiedAt ? ` · verified ${provenance.lastVerifiedAt}` : ""}
    </p>
  );
}

export function ProgramFacts({ detail }: { detail: UniversityProgramDetail }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Admission requirements <Badge variant="outline">FACT</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {detail.requirements.length === 0 && (
            <p className="text-sm text-muted-foreground">Not recorded in our database yet.</p>
          )}
          {detail.requirements.map((r, i) => (
            <div key={i}>
              <p className="text-sm">
                {r.description}
                {r.minGrade ? ` (min: ${r.minGrade})` : ""}
              </p>
              <ProvenanceLine provenance={r.provenance} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Admission statistics <Badge variant="outline">FACT</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {detail.admissionStatistics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No verified admission statistics available for this program.
            </p>
          )}
          {detail.admissionStatistics.map((s, i) => (
            <div key={i}>
              <p className="text-sm">
                {s.year}: {s.acceptanceRate != null ? `${s.acceptanceRate}% acceptance rate` : "Acceptance rate unavailable"}
                {s.internationalAcceptanceRate != null ? ` (${s.internationalAcceptanceRate}% international)` : ""}
                {" — "}
                <span className="capitalize">{s.confidence} confidence</span>
              </p>
              <ProvenanceLine provenance={s.provenance} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Tuition <Badge variant="outline">FACT</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {detail.tuition.length === 0 && (
            <p className="text-sm text-muted-foreground">Not recorded in our database yet.</p>
          )}
          {detail.tuition.map((t, i) => (
            <div key={i}>
              <p className="text-sm">
                {t.year}: {t.internationalAmount != null ? `${t.internationalAmount} ${t.currency} (international)` : "—"}
                {t.domesticAmount != null ? ` / ${t.domesticAmount} ${t.currency} (domestic)` : ""}
              </p>
              <ProvenanceLine provenance={t.provenance} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Scholarships <Badge variant="outline">FACT</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {detail.scholarships.length === 0 && (
            <p className="text-sm text-muted-foreground">No scholarships recorded for this program yet.</p>
          )}
          {detail.scholarships.map((s, i) => (
            <div key={i}>
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-sm text-muted-foreground">
                {s.amountType}
                {s.amount != null ? ` · ${s.amount} ${s.currency ?? ""}` : ""}
                {s.deadline ? ` · deadline ${s.deadline}` : ""}
              </p>
              {s.eligibilityText && <p className="text-sm text-muted-foreground">{s.eligibilityText}</p>}
              <ProvenanceLine provenance={s.provenance} />
            </div>
          ))}
        </CardContent>
      </Card>

      {detail.deadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Deadlines <Badge variant="outline">FACT</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {detail.deadlines.map((d, i) => (
              <p key={i} className="text-sm">
                <span className="capitalize">{d.deadlineType.replace("_", " ")}</span>
                {d.applicantType ? ` (${d.applicantType})` : ""}: {d.date ?? "TBD"}
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
