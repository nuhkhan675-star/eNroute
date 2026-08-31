import Link from "next/link";
import type { DashboardMatchCard } from "@/lib/db/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";

const CLASSIFICATION_STYLES: Record<DashboardMatchCard["classification"], string> = {
  reach: "bg-red-500/15 text-red-400 border border-red-500/30",
  target: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  likely: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
};

export function UniversityMatchCard({ card }: { card: DashboardMatchCard }) {
  return (
    <Link href={`/universities/${card.universityId}/programs/${card.universityProgramId}`}>
      <Card className="overflow-hidden transition-colors hover:border-primary/40">
        <CardContent className="flex gap-4 p-0">
          <UniversityPhoto
            photoUrl={card.photoUrl}
            alt={card.universityName}
            className="hidden w-32 shrink-0 sm:flex"
            sizes="128px"
          />

          <div className="flex flex-1 flex-col gap-2 py-4 pr-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{card.universityName}</p>
                <p className="text-sm text-muted-foreground">
                  {card.programDisplayName} · {[card.city, card.countryName].filter(Boolean).join(", ")}
                </p>
              </div>
              <Badge className={`shrink-0 capitalize ${CLASSIFICATION_STYLES[card.classification]}`}>
                {card.classification}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{card.narrativeSummary}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{card.likelihoodRangeLabel}</span>
              <span>·</span>
              <span>{CONFIDENCE_LABELS[card.confidence]}</span>
              <span>·</span>
              <span>Model-based estimate</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
