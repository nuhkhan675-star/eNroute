import Link from "next/link";
import type { DashboardMatchCard } from "@/lib/db/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityPhoto } from "@/components/universities/UniversityPhoto";
import { SaveToggle } from "@/components/universities/SaveToggle";
import { CATEGORY_LABELS, chancePoint } from "@/lib/ai/prediction/scoringEngine";

const CATEGORY_STYLES: Record<DashboardMatchCard["category"], string> = {
  high_reach: "bg-red-500/15 text-red-300 border border-red-500/40",
  reach: "bg-orange-500/15 text-orange-300 border border-orange-500/40",
  target: "bg-blue-500/15 text-blue-300 border border-blue-500/40",
  likely: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40",
};

// Same category colours as the badge, for the headline percentage.
const CATEGORY_TEXT: Record<DashboardMatchCard["category"], string> = {
  high_reach: "text-red-300",
  reach: "text-orange-300",
  target: "text-blue-300",
  likely: "text-emerald-300",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
};

// Where this card's selectivity baseline came from. Only the two weakest
// bases render a badge: a real published rate needs no caveat, and adding a
// label to every card would make the honest warning on the weak ones easy to
// tune out. "ai_estimate" is called out more explicitly than "rank_proxy"
// because it has strictly less behind it -- no published figure at all.
const BASIS_NOTICES: Partial<Record<DashboardMatchCard["selectivityBasis"], { text: string; style: string }>> = {
  rank_proxy: {
    text: "Selectivity from world ranking",
    style: "text-muted-foreground",
  },
  ai_estimate: {
    text: "AI-estimated selectivity — not from a published source",
    style: "text-amber-400",
  },
};

export function UniversityMatchCard({ card, initialSaved }: { card: DashboardMatchCard; initialSaved?: boolean }) {
  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <SaveToggle universityId={card.universityId} initialSaved={!!initialSaved} />
      </div>
      <Link href={`/universities/${card.universityId}`}>
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
                  {[card.city, card.countryName].filter(Boolean).join(", ")}
                </p>
              </div>
              <Badge className={`mr-9 shrink-0 ${CATEGORY_STYLES[card.category]}`}>
                {CATEGORY_LABELS[card.category]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{card.reasoning}</p>
            {/* The chance figure is the single most-scanned number on the
                card, so it gets size and the category's own colour rather
                than sitting in muted body text. */}
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-semibold tracking-tight ${CATEGORY_TEXT[card.category]}`}>
                {chancePoint(card.chanceMin, card.chanceMax)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {CONFIDENCE_LABELS[card.confidence]}
              </span>
            </div>
            {BASIS_NOTICES[card.selectivityBasis] && (
              <p className={`text-xs ${BASIS_NOTICES[card.selectivityBasis]!.style}`}>
                {BASIS_NOTICES[card.selectivityBasis]!.text}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Estimated by our admissions model. Not an official prediction or guarantee from the
              university.
            </p>
          </div>
        </CardContent>
      </Card>
      </Link>
    </div>
  );
}
